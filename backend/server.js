require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const fs = require("fs");
const passport = require("passport");
const { Server } = require("socket.io");
const { globalLimiter, authLimiter, aiLimiter } = require("./middleware/security");
const jwt = require("jsonwebtoken");

const connectDB = require("./config/db");
const { connectRedis } = require("./config/redis");
const { initializePassport } = require("./middleware/auth");
const errorHandler = require("./middleware/errorHandler");
const requestLogger = require("./middleware/requestLogger");
const logger = require("./utils/logger");

const authRoutes = require("./routes/auth");
const v1Router = require("./routes/v1");

const InterviewSession = require("./models/InterviewSession");
const User = require("./models/User");
const openaiService = require("./services/openaiService");

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

const io = new Server(server, {
    cors: {
        origin: [FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
        methods: ["GET", "POST"],
        credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
});

// ─────────────────────────────────────────
// Socket.io Redis Adapter (for horizontal scaling)
// ─────────────────────────────────────────
// WHY? Without this, if you run 2+ server instances behind
// a load balancer, Socket.io events only reach users connected
// to the SAME server. The Redis adapter uses Redis pub/sub
// to broadcast events across ALL server instances.
//
// Interview answer: "We use the Redis adapter for Socket.io
// so that WebSocket events are shared across multiple Node.js
// instances via Redis pub/sub. This enables horizontal scaling."
const { createAdapter } = require("@socket.io/redis-adapter");
const { createClient } = require("redis");

const setupSocketRedisAdapter = async () => {
    try {
        const REDIS_URL = process.env.REDIS_URL || "redis://redis:6379";
        const pubClient = createClient({ url: REDIS_URL });
        const subClient = pubClient.duplicate();

        await Promise.all([pubClient.connect(), subClient.connect()]);

        io.adapter(createAdapter(pubClient, subClient));
        logger.info("Socket.io Redis adapter connected (horizontal scaling ready)");
    } catch (err) {
        // Graceful degradation: works without Redis, just no cross-server events
        logger.warn("Socket.io Redis adapter failed, using in-memory adapter:", err.message);
    }
};

setupSocketRedisAdapter();

// --- Middleware ---
// Helmet sets security headers on EVERY response.
// Must come BEFORE other middleware so headers are always set.
//
// What helmet adds:
//   X-Content-Type-Options: nosniff    → prevents MIME sniffing
//   X-Frame-Options: DENY              → prevents clickjacking
//   X-XSS-Protection: 0                → disables buggy browser XSS filter
//   Strict-Transport-Security          → forces HTTPS (also set by Nginx)
//   Removes X-Powered-By: Express      → hides server tech from attackers
app.use(
    helmet({
        // Disable CSP here — Nginx handles it in production.
        // If both set CSP, they can conflict and break the frontend.
        contentSecurityPolicy: false,
        // Allow cross-origin resource loading (fonts, images)
        crossOriginResourcePolicy: { policy: "cross-origin" },
    })
);

app.use(
    cors({
        origin: [FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
        credentials: true,
    })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// --- Request Logging ---
// Logs every HTTP request: method, url, status, duration, IP
app.use(requestLogger);

// --- Security: Tiered Rate Limiting ---
// Global limiter applies to all API routes (100 req/15 min)
app.use("/api/", globalLimiter);

app.use(passport.initialize());
initializePassport();

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/uploads", express.static(uploadsDir));

const logsDir = path.join(__dirname, "logs");
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// --- Routes ---
// Route-specific rate limiters BEFORE the route handlers
// Auth: strict (5 attempts/15 min) — prevents brute force
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/v1/auth/login", authLimiter);
app.use("/api/v1/auth/register", authLimiter);

// AI & Upload: moderate (20/hour) — prevents API cost abuse
app.use("/api/interview", aiLimiter);
app.use("/api/upload", aiLimiter);
app.use("/api/ats", aiLimiter);
app.use("/api/v1/interview", aiLimiter);
app.use("/api/v1/upload", aiLimiter);
app.use("/api/v1/ats", aiLimiter);

// ─────────────────────────────────────────
// API VERSIONING
// ─────────────────────────────────────────
// /api/v1/...  → versioned (recommended for new clients)
// /api/...     → backward compatible (existing clients still work)
//
// When you need breaking changes:
//   1. Create routes/v2.js with new handlers
//   2. Mount: app.use("/api/v2", v2Router)
//   3. Keep v1 running — don't break existing clients
//   4. Deprecate v1 after migration period
app.use("/api/v1", v1Router);
app.use("/api", v1Router);  // backward compatible

// --- Enhanced Health Check ---
// Returns system metrics for monitoring tools (UptimeRobot, AWS CloudWatch)
const mongoose = require("mongoose");
app.get("/api/health", (req, res) => {
    const memoryUsage = process.memoryUsage();
    res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: `${Math.floor(process.uptime())}s`,
        memory: {
            rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
            heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        },
        database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
        environment: process.env.NODE_ENV || "development",
    });
});

// --- Socket.IO Authentication & Events ---
io.use(async (socket, next) => {
    try {
        const token =
            socket.handshake.auth.token || socket.handshake.query.token;
        if (!token) {
            return next(new Error("Authentication required"));
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select("-passwordHash");
        if (!user) {
            return next(new Error("User not found"));
        }
        socket.user = user;
        next();
    } catch (error) {
        logger.error(`Socket auth error: ${error.message}`);
        next(new Error("Invalid token"));
    }
});

io.on("connection", (socket) => {
    logger.info(`Socket connected: ${socket.user.email} (${socket.id})`);

    socket.on("interview:start", async (data) => {
        try {
            const { role, domain, specialization, difficulty, interviewType, interviewMode, resumeData } = data;

            if (!role) {
                socket.emit("interview:error", { message: "Role is required." });
                return;
            }

            const activeSession = await InterviewSession.findOne({
                userId: socket.user._id,
                status: "active",
            });

            if (activeSession) {
                socket.join(activeSession._id.toString());
                socket.emit("interview:question", {
                    question:
                        activeSession.transcript[activeSession.transcript.length - 1]
                            ?.content || "Resuming interview...",
                    sessionId: activeSession._id,
                    transcript: activeSession.transcript,
                    resumed: true,
                });
                return;
            }

            const userDomain = domain || socket.user.domain || "Technology";
            const userSpec =
                specialization || socket.user.specialization || "Full Stack Developer";

            const firstQuestion = await openaiService.generateFirstQuestion({
                domain: userDomain,
                specialization: userSpec,
                role,
                difficulty: difficulty || "Medium",
                interviewType: interviewType || "Mixed",
                resumeData: interviewMode === "resume" ? resumeData : null,
            });

            const session = await InterviewSession.create({
                userId: socket.user._id,
                role,
                domain: userDomain,
                specialization: userSpec,
                difficulty: difficulty || "Medium",
                interviewType: interviewType || "Mixed",
                interviewMode: interviewMode || "domain",
                resumeData: interviewMode === "resume" ? {
                    resumeText: resumeData?.resumeText || null,
                    resumeAnalysis: resumeData?.resumeAnalysis || null,
                } : { resumeText: null, resumeAnalysis: null },
                questions: [{ question: firstQuestion }],
                transcript: [{ role: "assistant", content: firstQuestion }],
                status: "active",
            });

            socket.join(session._id.toString());

            socket.emit("interview:question", {
                question: firstQuestion,
                sessionId: session._id,
                transcript: session.transcript,
            });

            logger.info(`Interview started via socket: ${session._id} (mode: ${interviewMode || "domain"})`);
        } catch (error) {
            logger.error(`Socket interview:start error: ${error.message}`);
            socket.emit("interview:error", {
                message: "Failed to start interview. Please try again.",
            });
        }
    });

    socket.on("interview:answer", async (data) => {
        try {
            const { sessionId, answer } = data;

            if (!sessionId || !answer) {
                socket.emit("interview:error", {
                    message: "Session ID and answer are required.",
                });
                return;
            }

            const session = await InterviewSession.findOne({
                _id: sessionId,
                userId: socket.user._id,
                status: "active",
            });

            if (!session) {
                socket.emit("interview:error", {
                    message: "Active session not found.",
                });
                return;
            }

            session.answers.push({ answer });
            session.transcript.push({ role: "user", content: answer });
            await session.save();

            const nextQuestion = await openaiService.generateNextQuestion({
                domain: session.domain,
                specialization: session.specialization,
                role: session.role,
                difficulty: session.difficulty,
                interviewType: session.interviewType,
                transcript: session.transcript,
                resumeData: session.interviewMode === "resume" ? session.resumeData : null,
            });

            session.questions.push({ question: nextQuestion });
            session.transcript.push({ role: "assistant", content: nextQuestion });
            await session.save();

            socket.emit("interview:question", {
                question: nextQuestion,
                sessionId: session._id,
                transcript: session.transcript,
            });
        } catch (error) {
            logger.error(`Socket interview:answer error: ${error.message}`);
            socket.emit("interview:error", {
                message: "Failed to process answer. Please try again.",
            });
        }
    });

    socket.on("interview:end", async (data) => {
        try {
            const { sessionId, gestureAnalysis } = data;
            const session = await InterviewSession.findOne({
                _id: sessionId,
                userId: socket.user._id,
                status: "active",
            });

            if (!session) {
                socket.emit("interview:error", {
                    message: "Active session not found.",
                });
                return;
            }

            const feedback = await openaiService.generateFeedback({
                domain: session.domain,
                specialization: session.specialization,
                role: session.role,
                difficulty: session.difficulty,
                interviewType: session.interviewType,
                transcript: session.transcript,
                gestureAnalysis: gestureAnalysis || null,
                resumeData: session.interviewMode === "resume" ? session.resumeData : null,
            });

            session.feedback = feedback;
            session.overallScore = feedback.overallScore || 0;
            session.status = "completed";
            session.endedAt = new Date();
            await session.save();

            socket.emit("interview:end", {
                feedback,
                session,
            });

            socket.leave(sessionId);
            logger.info(`Interview ended via socket: ${sessionId}`);
        } catch (error) {
            logger.error(`Socket interview:end error: ${error.message}`);
            socket.emit("interview:error", {
                message: "Failed to end interview. Please try again.",
            });
        }
    });

    socket.on("disconnect", (reason) => {
        logger.info(
            `Socket disconnected: ${socket.user.email} (${reason})`
        );
    });
});

// --- Error Handler ---
app.use(errorHandler);

// --- Start Server ---
const startServer = async () => {
    try {
        await connectDB();
        await connectRedis();
        server.listen(PORT, () => {
            logger.info(`Server running on port ${PORT}`);
            logger.info(`CORS enabled for: ${FRONTEND_URL}`);
        });
    } catch (error) {
        logger.error(`Failed to start server: ${error.message}`);
        process.exit(1);
    }
};

startServer();

// ============================================
// GRACEFUL SHUTDOWN
// ============================================
// When Docker stops a container, it sends SIGTERM first.
// We have 10 seconds to clean up before Docker sends SIGKILL.
//
// Without this: requests are cut off, DB connections leak.
// With this: all active requests finish, connections close cleanly.

const gracefulShutdown = async (signal) => {
    logger.info(`${signal} received. Starting graceful shutdown...`);

    // 1. Stop accepting NEW connections
    server.close(() => {
        logger.info("HTTP server closed. No new connections accepted.");
    });

    // 2. Close Socket.io connections
    io.close(() => {
        logger.info("Socket.io connections closed.");
    });

    // 3. Close database connections
    try {
        const mongoose = require("mongoose");
        await mongoose.connection.close();
        logger.info("MongoDB connection closed.");
    } catch (err) {
        logger.error("Error closing MongoDB:", err.message);
    }

    // 4. Close Redis connection
    try {
        const { getClient } = require("./config/redis");
        const redisClient = getClient();
        if (redisClient && redisClient.isOpen) {
            await redisClient.quit();
            logger.info("Redis connection closed.");
        }
    } catch (err) {
        logger.error("Error closing Redis:", err.message);
    }

    logger.info("Graceful shutdown complete. Exiting.");
    process.exit(0);
};

// Docker sends SIGTERM when stopping a container
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
// Ctrl+C in terminal sends SIGINT
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// ============================================
// UNHANDLED ERRORS — Last line of defense
// ============================================
// These catch bugs that weren't handled in try/catch blocks.
// Without these, the process crashes silently.

// Uncaught exceptions: synchronous errors not in try/catch
// Example: calling undefined.something()
process.on("uncaughtException", (err) => {
    logger.error("UNCAUGHT EXCEPTION! Shutting down...", {
        name: err.name,
        message: err.message,
        stack: err.stack,
    });
    // Must exit — the process is in an undefined state
    process.exit(1);
});

// Unhandled promise rejections: async errors without .catch()
// Example: await fetch("invalid-url") without try/catch
process.on("unhandledRejection", (reason) => {
    logger.error("UNHANDLED REJECTION! Shutting down...", {
        reason: reason?.message || reason,
        stack: reason?.stack,
    });
    // Close server gracefully, then exit
    server.close(() => process.exit(1));
});

module.exports = { app, server, io };
