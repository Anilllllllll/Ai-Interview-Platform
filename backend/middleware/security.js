// ============================================
// Security Middleware
// Centralized security configuration
// ============================================
// This file contains all security-related middleware:
// - Rate limiters (global, auth, AI/upload)
// - Security headers (helmet)
// - Request sanitization

const rateLimit = require("express-rate-limit");

// ─────────────────────────────────────────
// WHY MULTIPLE RATE LIMITERS?
// ─────────────────────────────────────────
// Different routes need different limits:
// - Login: Very strict (prevent brute force)
// - AI calls: Moderate (each call costs money)
// - General API: Generous (normal usage)
//
// Interview answer: "We use tiered rate limiting —
// stricter limits on sensitive endpoints like auth
// and expensive operations like AI API calls."

// ─────────────────────────────────────────
// 1. GLOBAL API RATE LIMITER
// ─────────────────────────────────────────
// Catches general abuse — 100 requests per 15 minutes per IP.
// This is the "catch-all" that protects all routes.
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 100,                   // 100 requests per window per IP
    message: {
        status: 429,
        message: "Too many requests. Please try again in 15 minutes.",
    },
    // 'standardHeaders: true' sends RateLimit-* headers in the response
    // so the frontend knows how many requests are left
    // RateLimit-Limit: 100
    // RateLimit-Remaining: 95
    // RateLimit-Reset: 1625000000
    standardHeaders: true,
    legacyHeaders: false,       // Disable old X-RateLimit-* headers
    // Skip health checks — monitoring tools hit this frequently
    skip: (req) => req.path === "/api/health",
});

// ─────────────────────────────────────────
// 2. AUTH RATE LIMITER (Login & Register)
// ─────────────────────────────────────────
// VERY strict — prevents brute force password attacks.
// An attacker trying 1000 passwords/second gets blocked after 5.
//
// WHY 5 attempts in 15 minutes?
// - Legitimate users rarely fail login more than 3 times
// - 5 gives some buffer for typos
// - 15 minutes is long enough to deter automated attacks
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 5,                     // Only 5 login attempts
    message: {
        status: 429,
        message: "Too many login attempts. Please try again in 15 minutes.",
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip successful requests — only count failures
    // This way, a user who logs in correctly on the first try
    // doesn't waste their attempts
    skipSuccessfulRequests: true,
});

// ─────────────────────────────────────────
// 3. AI & UPLOAD RATE LIMITER
// ─────────────────────────────────────────
// Moderate — each AI call costs money (Groq API credits).
// Each upload consumes server storage and processing.
// 20 per hour is generous for normal use, but blocks abuse.
const aiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,  // 1 hour
    max: 20,                    // 20 AI/upload requests per hour
    message: {
        status: 429,
        message: "AI request limit reached. Please try again in 1 hour.",
    },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = {
    globalLimiter,
    authLimiter,
    aiLimiter,
};
