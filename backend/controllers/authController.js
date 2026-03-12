const User = require("../models/User");
const { generateToken } = require("../middleware/auth");
const logger = require("../utils/logger");

const register = async (req, res, next) => {
    try {
        const { email, password, name, domain, specialization, experienceLevel } =
            req.body;

        if (!email || !password || !name) {
            return res
                .status(400)
                .json({ message: "Email, password, and name are required." });
        }

        if (password.length < 6) {
            return res
                .status(400)
                .json({ message: "Password must be at least 6 characters." });
        }

        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res
                .status(409)
                .json({ message: "A user with this email already exists." });
        }

        const user = await User.create({
            email: email.toLowerCase(),
            passwordHash: password,
            name,
            domain: domain || "Technology",
            specialization: specialization || "Full Stack Developer",
            experienceLevel: experienceLevel || "Mid",
        });

        const token = generateToken(user._id);

        logger.info(`User registered: ${user.email}`);

        res.status(201).json({
            message: "User registered successfully.",
            token,
            user: user.toJSON(),
        });
    } catch (error) {
        next(error);
    }
};

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res
                .status(400)
                .json({ message: "Email and password are required." });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ message: "Invalid email or password." });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid email or password." });
        }

        const token = generateToken(user._id);

        logger.info(`User logged in: ${user.email}`);

        res.json({
            message: "Login successful.",
            token,
            user: user.toJSON(),
        });
    } catch (error) {
        next(error);
    }
};

const getProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }
        res.json({ user: user.toJSON() });
    } catch (error) {
        next(error);
    }
};

const updateProfile = async (req, res, next) => {
    try {
        const { name, domain, specialization, experienceLevel } = req.body;

        const updateData = {};
        if (name) updateData.name = name;
        if (domain) updateData.domain = domain;
        if (specialization) updateData.specialization = specialization;
        if (experienceLevel) updateData.experienceLevel = experienceLevel;

        const user = await User.findByIdAndUpdate(req.user._id, updateData, {
            new: true,
            runValidators: true,
        });

        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        logger.info(`User profile updated: ${user.email}`);

        res.json({
            message: "Profile updated successfully.",
            user: user.toJSON(),
        });
    } catch (error) {
        next(error);
    }
};

const googleCallback = async (req, res, next) => {
    try {
        const token = generateToken(req.user._id);
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
        res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    register,
    login,
    getProfile,
    updateProfile,
    googleCallback,
};
