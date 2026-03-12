const express = require("express");
const router = express.Router();
const {
    startInterview,
    submitAnswer,
    endInterview,
    getHistory,
    getSession,
    getActiveSession,
} = require("../controllers/interviewController");
const { authenticateToken } = require("../middleware/auth");

router.use(authenticateToken);

router.post("/start", startInterview);
router.post("/answer", submitAnswer);
router.post("/end", endInterview);
router.get("/history", getHistory);
router.get("/active", getActiveSession);
router.get("/:id", getSession);

module.exports = router;
