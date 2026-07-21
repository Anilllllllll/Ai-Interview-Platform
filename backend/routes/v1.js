// ============================================
// API Version 1 Router
// ============================================
// Groups all v1 routes under a single router.
// This lets us mount the same routes at both:
//   /api/v1/auth/...     (versioned — recommended)
//   /api/auth/...        (backward compatible — existing clients)
//
// WHEN TO CREATE V2:
// When you need to change a response format or remove a field,
// create routes/v2/ with the new handlers. Old clients keep
// using /api/v1/, new clients use /api/v2/.
//
// Interview answer: "We use URL-based API versioning.
// All routes are mounted under /api/v1/. When we need
// breaking changes, we create /api/v2/ with new handlers
// while keeping v1 running for backward compatibility."

const express = require("express");
const router = express.Router();

const authRoutes = require("./auth");
const interviewRoutes = require("./interview");
const uploadRoutes = require("./upload");
const atsRoutes = require("./ats");

// Mount all route modules on the v1 router
router.use("/auth", authRoutes);
router.use("/interview", interviewRoutes);
router.use("/upload", uploadRoutes);
router.use("/ats", atsRoutes);

module.exports = router;
