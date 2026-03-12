const express = require("express");
const passport = require("passport");
const router = express.Router();
const {
    register,
    login,
    getProfile,
    updateProfile,
    googleCallback,
} = require("../controllers/authController");
const { authenticateToken } = require("../middleware/auth");

router.post("/register", register);
router.post("/login", login);
router.get("/profile", authenticateToken, getProfile);
router.put("/profile", authenticateToken, updateProfile);

router.get(
    "/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
    "/google/callback",
    passport.authenticate("google", {
        session: false,
        failureRedirect: "/api/auth/google/failure",
    }),
    googleCallback
);

router.get("/google/failure", (req, res) => {
    res.status(401).json({ message: "Google authentication failed." });
});

module.exports = router;
