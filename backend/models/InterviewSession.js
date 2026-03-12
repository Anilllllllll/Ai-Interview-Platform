const mongoose = require("mongoose");

const interviewSessionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
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

interviewSessionSchema.index({ userId: 1, status: 1 });
interviewSessionSchema.index({ createdAt: -1 });

const InterviewSession = mongoose.model(
    "InterviewSession",
    interviewSessionSchema
);

module.exports = InterviewSession;
