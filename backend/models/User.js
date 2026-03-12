const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
        },
        passwordHash: {
            type: String,
            minlength: 6,
        },
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
            maxlength: 100,
        },
        domain: {
            type: String,
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
            default: "Technology",
        },
        specialization: {
            type: String,
            enum: [
                "Frontend Developer",
                "Backend Developer",
                "Full Stack Developer",
                "Data Scientist",
                "ML Engineer",
                "Product Manager",
                "DevOps Engineer",
                "Mobile Developer",
                "QA Engineer",
                "Other",
            ],
            default: "Full Stack Developer",
        },
        experienceLevel: {
            type: String,
            enum: ["Junior", "Mid", "Senior", "Lead", "Principal"],
            default: "Mid",
        },
        resumeUrl: {
            type: String,
            default: null,
        },
        googleId: {
            type: String,
            default: null,
            sparse: true,
        },
    },
    {
        timestamps: true,
    }
);

userSchema.index({ email: 1 });
userSchema.index({ googleId: 1 });

userSchema.pre("save", async function (next) {
    if (!this.isModified("passwordHash") || !this.passwordHash) {
        return next();
    }
    try {
        const salt = await bcrypt.genSalt(12);
        this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
        next();
    } catch (error) {
        next(error);
    }
});

userSchema.methods.comparePassword = async function (candidatePassword) {
    if (!this.passwordHash) return false;
    return bcrypt.compare(candidatePassword, this.passwordHash);
};

userSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.passwordHash;
    delete obj.__v;
    return obj;
};

const User = mongoose.model("User", userSchema);

module.exports = User;
