const multer = require("multer");
const path = require("path");
const fs = require("fs");
const User = require("../models/User");
const logger = require("../utils/logger");
const resumeService = require("../services/resumeService");

const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = path.extname(file.originalname);
        cb(null, `resume-${req.user._id}-${uniqueSuffix}${ext}`);
    },
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Only PDF and Word documents are allowed."), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
});

const uploadResume = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded." });
        }

        const resumeUrl = `/uploads/${req.file.filename}`;

        await User.findByIdAndUpdate(req.user._id, { resumeUrl });

        logger.info(`Resume uploaded for user: ${req.user._id}`);

        res.json({
            message: "Resume uploaded successfully.",
            resumeUrl,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Upload a resume, extract text, and analyze with AI.
 * Returns the raw text and structured analysis for use in resume-based interviews.
 */
const uploadAndParseResume = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded." });
        }

        const filePath = req.file.path;
        const mimetype = req.file.mimetype;

        logger.info(`Parsing resume for user: ${req.user._id} (${req.file.originalname})`);

        // Extract text
        const resumeText = await resumeService.extractText(filePath, mimetype);

        if (!resumeText || resumeText.length < 50) {
            // Clean up file
            fs.unlink(filePath, () => { });
            return res.status(400).json({
                message: "Could not extract enough text from the resume. Please upload a clearer document.",
            });
        }

        // AI analysis
        const resumeAnalysis = await resumeService.analyzeResume(resumeText);

        // Update user's resume URL
        const resumeUrl = `/uploads/${req.file.filename}`;
        await User.findByIdAndUpdate(req.user._id, { resumeUrl });

        logger.info(`Resume parsed and analyzed for user: ${req.user._id}`);

        res.json({
            message: "Resume analyzed successfully.",
            resumeUrl,
            resumeText,
            resumeAnalysis,
        });
    } catch (error) {
        // Clean up file on error
        if (req.file?.path) {
            fs.unlink(req.file.path, () => { });
        }
        next(error);
    }
};

module.exports = {
    upload,
    uploadResume,
    uploadAndParseResume,
};
