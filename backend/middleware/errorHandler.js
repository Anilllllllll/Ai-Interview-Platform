const logger = require("../utils/logger");

const errorHandler = (err, req, res, _next) => {
    logger.error(`${err.message}`, {
        stack: err.stack,
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
    });

    if (err.name === "ValidationError") {
        const messages = Object.values(err.errors).map((e) => e.message);
        return res.status(400).json({
            message: "Validation Error",
            errors: messages,
        });
    }

    if (err.code === 11000) {
        const field = Object.keys(err.keyPattern)[0];
        return res.status(409).json({
            message: `Duplicate value for ${field}. This ${field} already exists.`,
        });
    }

    if (err.name === "CastError") {
        return res.status(400).json({
            message: `Invalid ${err.path}: ${err.value}`,
        });
    }

    if (err.name === "UnauthorizedError" || err.status === 401) {
        return res.status(401).json({
            message: err.message || "Unauthorized access.",
        });
    }

    const statusCode = err.statusCode || err.status || 500;
    const message =
        process.env.NODE_ENV === "production" && statusCode === 500
            ? "Internal server error"
            : err.message || "Internal server error";

    res.status(statusCode).json({
        message,
        ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
    });
};

module.exports = errorHandler;
