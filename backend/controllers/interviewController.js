const InterviewSession = require("../models/InterviewSession");
const openaiService = require("../services/openaiService");
const logger = require("../utils/logger");

const startInterview = async (req, res, next) => {
    try {
        const { role, domain, specialization, difficulty, interviewType } = req.body;

        if (!role) {
            return res.status(400).json({ message: "Role is required to start an interview." });
        }

        const activeSession = await InterviewSession.findOne({
            userId: req.user._id,
            status: "active",
        });

        if (activeSession) {
            return res.json({
                message: "Resuming active interview session.",
                session: activeSession,
                resumed: true,
            });
        }

        const userDomain = domain || req.user.domain || "Technology";
        const userSpecialization = specialization || req.user.specialization || "Full Stack Developer";

        const firstQuestion = await openaiService.generateFirstQuestion({
            domain: userDomain,
            specialization: userSpecialization,
            role,
            difficulty: difficulty || "Medium",
            interviewType: interviewType || "Mixed",
        });

        const session = await InterviewSession.create({
            userId: req.user._id,
            role,
            domain: userDomain,
            specialization: userSpecialization,
            difficulty: difficulty || "Medium",
            interviewType: interviewType || "Mixed",
            questions: [{ question: firstQuestion }],
            transcript: [{ role: "assistant", content: firstQuestion }],
            status: "active",
        });

        logger.info(`Interview started: ${session._id} by user ${req.user._id}`);

        res.status(201).json({
            message: "Interview started.",
            session,
            question: firstQuestion,
        });
    } catch (error) {
        next(error);
    }
};

const submitAnswer = async (req, res, next) => {
    try {
        const { sessionId, answer } = req.body;

        if (!sessionId || !answer) {
            return res.status(400).json({ message: "Session ID and answer are required." });
        }

        const session = await InterviewSession.findOne({
            _id: sessionId,
            userId: req.user._id,
            status: "active",
        });

        if (!session) {
            return res.status(404).json({ message: "Active interview session not found." });
        }

        session.answers.push({ answer });
        session.transcript.push({ role: "user", content: answer });

        const nextQuestion = await openaiService.generateNextQuestion({
            domain: session.domain,
            specialization: session.specialization,
            role: session.role,
            difficulty: session.difficulty,
            interviewType: session.interviewType,
            transcript: session.transcript,
        });

        session.questions.push({ question: nextQuestion });
        session.transcript.push({ role: "assistant", content: nextQuestion });

        await session.save();

        logger.info(`Answer submitted for session: ${session._id}`);

        res.json({
            message: "Answer recorded.",
            question: nextQuestion,
            session,
        });
    } catch (error) {
        next(error);
    }
};

const endInterview = async (req, res, next) => {
    try {
        const { sessionId } = req.body;

        if (!sessionId) {
            return res.status(400).json({ message: "Session ID is required." });
        }

        const session = await InterviewSession.findOne({
            _id: sessionId,
            userId: req.user._id,
            status: "active",
        });

        if (!session) {
            return res.status(404).json({ message: "Active interview session not found." });
        }

        const feedback = await openaiService.generateFeedback({
            domain: session.domain,
            specialization: session.specialization,
            role: session.role,
            difficulty: session.difficulty,
            interviewType: session.interviewType,
            transcript: session.transcript,
        });

        session.feedback = feedback;
        session.overallScore = feedback.overallScore || 0;
        session.status = "completed";
        session.endedAt = new Date();
        await session.save();

        logger.info(`Interview ended: ${session._id}, score: ${session.overallScore}`);

        res.json({
            message: "Interview completed.",
            session,
            feedback,
        });
    } catch (error) {
        next(error);
    }
};

const getHistory = async (req, res, next) => {
    try {
        // ─────────────────────────────────────────
        // PAGINATION
        // ─────────────────────────────────────────
        // page=1&limit=10 → skip 0, return 10
        // page=2&limit=10 → skip 10, return 10
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
        const skip = (page - 1) * limit;

        // ─────────────────────────────────────────
        // FILTERING
        // ─────────────────────────────────────────
        // Build query dynamically based on query params
        // Example: GET /api/interview/history?status=completed&difficulty=Hard
        const query = { userId: req.user._id };

        // Filter by status (active/completed)
        if (req.query.status && ["active", "completed"].includes(req.query.status)) {
            query.status = req.query.status;
        }

        // Filter by difficulty
        if (req.query.difficulty && ["Easy", "Medium", "Hard", "Expert"].includes(req.query.difficulty)) {
            query.difficulty = req.query.difficulty;
        }

        // Filter by interview type
        if (req.query.type && ["Technical", "Behavioral", "System Design", "Mixed"].includes(req.query.type)) {
            query.interviewType = req.query.type;
        }

        // Filter by date range (e.g., last 7 days, last 30 days)
        if (req.query.from || req.query.to) {
            query.createdAt = {};
            if (req.query.from) query.createdAt.$gte = new Date(req.query.from);
            if (req.query.to) query.createdAt.$lte = new Date(req.query.to);
        }

        // ─────────────────────────────────────────
        // FIELD PROJECTION
        // ─────────────────────────────────────────
        // For list view, we DON'T need the full transcript,
        // questions, or answers — just summary fields.
        // This reduces response size: ~5KB → ~500 bytes per session
        const listFields = {
            role: 1,
            domain: 1,
            specialization: 1,
            difficulty: 1,
            interviewType: 1,
            interviewMode: 1,
            overallScore: 1,
            status: 1,
            createdAt: 1,
            endedAt: 1,
            // Exclude large fields: transcript, questions, answers, feedback
        };

        const [sessions, total] = await Promise.all([
            InterviewSession.find(query)
                .select(listFields)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            InterviewSession.countDocuments(query),
        ]);

        res.json({
            sessions,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
                hasNext: page < Math.ceil(total / limit),
                hasPrev: page > 1,
            },
        });
    } catch (error) {
        next(error);
    }
};

const getSession = async (req, res, next) => {
    try {
        const session = await InterviewSession.findOne({
            _id: req.params.id,
            userId: req.user._id,
        });

        if (!session) {
            return res.status(404).json({ message: "Session not found." });
        }

        res.json({ session });
    } catch (error) {
        next(error);
    }
};

const getActiveSession = async (req, res, next) => {
    try {
        const session = await InterviewSession.findOne({
            userId: req.user._id,
            status: "active",
        });

        res.json({ session: session || null });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    startInterview,
    submitAnswer,
    endInterview,
    getHistory,
    getSession,
    getActiveSession,
};
