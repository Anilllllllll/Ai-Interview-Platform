const mongoose = require("mongoose");

const interviewSessionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            // No 'index: true' here — the compound indexes below
            // ({userId,status} and {userId,createdAt}) already cover
            // all userId queries via the leftmost prefix rule.
        },
        role: {
            type: String,
            required: [true, "Role is required"],
            trim: true,
        },
        domain: {
            type: String,
            required: [true, "Domain is required"],
            enum: [
                "Technology",
                "Data Science",
                "Finance",
                "Healthcare",
                "Marketing",
                "Product Management",
                "Cybersecurity",
                "Consulting",
                "Other",
            ],
        },
        specialization: {
            type: String,
            required: [true, "Specialization is required"],
        },
        difficulty: {
            type: String,
            enum: ["Easy", "Medium", "Hard", "Expert"],
            default: "Medium",
        },
        interviewType: {
            type: String,
            enum: ["Technical", "Behavioral", "System Design", "Mixed"],
            default: "Mixed",
        },
        interviewMode: {
            type: String,
            enum: ["domain", "resume"],
            default: "domain",
        },
        resumeData: {
            resumeText: { type: String, default: null },
            resumeAnalysis: { type: mongoose.Schema.Types.Mixed, default: null },
        },
        questions: [
            {
                question: { type: String, required: true },
                timestamp: { type: Date, default: Date.now },
            },
        ],
        answers: [
            {
                answer: { type: String, required: true },
                timestamp: { type: Date, default: Date.now },
            },
        ],
        transcript: [
            {
                role: {
                    type: String,
                    enum: ["assistant", "user"],
                    required: true,
                },
                content: { type: String, required: true },
                timestamp: { type: Date, default: Date.now },
            },
        ],
        feedback: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
        },
        overallScore: {
            type: Number,
            min: 0,
            max: 100,
            default: null,
        },
        status: {
            type: String,
            enum: ["active", "completed"],
            default: "active",
        },
        endedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// ─────────────────────────────────────────
// INDEXES — Optimized for actual query patterns
// ─────────────────────────────────────────
//
// RULE: Create indexes based on HOW you query, not what fields exist.
//
// Our queries:
//   1. findOne({ userId, status: "active" })  → compound index
//   2. find({ userId }).sort({ createdAt: -1 }) → compound index
//   3. countDocuments({ userId })              → covered by compound
//
// COMPOUND INDEX {userId: 1, status: 1}:
//   - Covers queries filtering by userId + status (most common)
//   - Also covers queries filtering by userId alone (leftmost prefix rule)
//   - MongoDB can use a compound index for queries on ANY leftmost prefix
//   - So this ONE index serves both query patterns #1 and #3
interviewSessionSchema.index({ userId: 1, status: 1 });

// COMPOUND INDEX {userId: 1, createdAt: -1}:
//   - Covers "get user's sessions sorted by newest first" (dashboard)
//   - -1 means descending order (newest first)
interviewSessionSchema.index({ userId: 1, createdAt: -1 });

const InterviewSession = mongoose.model(
    "InterviewSession",
    interviewSessionSchema
);

module.exports = InterviewSession;
