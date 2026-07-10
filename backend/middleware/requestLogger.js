// ============================================
// HTTP Request Logger Middleware
// ============================================
// Logs every incoming HTTP request with:
// - Method, URL, status code, response time
// - Client IP, user agent
// - User ID (if authenticated)
//
// WHY? In production, you need to know:
// - Which endpoints are slow (response time > 1s)
// - Which users are making requests (debugging)
// - Which IPs are hitting your server (security)
//
// This replaces the need for 'morgan' — we use Winston
// directly so all logs go to the same files.

const logger = require("../utils/logger");

const requestLogger = (req, res, next) => {
    // Record start time
    const startTime = Date.now();

    // Store original res.json to intercept response
    const originalJson = res.json.bind(res);

    // When the response finishes, log the details
    res.on("finish", () => {
        const duration = Date.now() - startTime;
        const logData = {
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip || req.headers["x-forwarded-for"] || req.connection.remoteAddress,
            userAgent: req.headers["user-agent"]?.substring(0, 100),
            // Extract user ID from JWT if available (set by auth middleware)
            userId: req.user?.id || "anonymous",
        };

        // Log level based on status code:
        // 5xx = error (server broke)
        // 4xx = warn (client did something wrong)  
        // 2xx/3xx = info (all good)
        if (res.statusCode >= 500) {
            logger.error("Request failed", logData);
        } else if (res.statusCode >= 400) {
            logger.warn("Client error", logData);
        } else {
            // Only log in debug mode for successful requests
            // (otherwise logs get HUGE in production)
            logger.debug("Request completed", logData);
        }

        // Always log slow requests (> 1 second) as warnings
        // This helps identify performance bottlenecks
        if (duration > 1000) {
            logger.warn(`Slow request: ${duration}ms`, logData);
        }
    });

    next();
};

module.exports = requestLogger;
