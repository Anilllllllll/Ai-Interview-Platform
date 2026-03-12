require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const passport = require("passport");
const { Server } = require("socket.io");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");

const connectDB = require("./config/db");
const { initializePassport } = require("./middleware/auth");
const errorHandler = require("./middleware/errorHandler");
const logger = require("./utils/logger");

const authRoutes = require("./routes/auth");
const interviewRoutes = require("./routes/interview");
const uploadRoutes = require("./routes/upload");
const atsRoutes = require("./routes/ats");

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

// --- Middleware ---
app.use(
    cors({
        origin: [FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
        credentials: true,
    })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: { message: "Too many requests, please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip rate limiting for Google OAuth routes (browser redirects)
        return req.originalUrl.includes("/auth/google");
    },
});
app.use("/api/", limiter);

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
app.use("/api/auth", authRoutes);
app.use("/api/interview", interviewRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/ats", atsRoutes);

app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
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

module.exports = { app, server, io };
