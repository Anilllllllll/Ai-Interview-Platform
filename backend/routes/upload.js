const express = require("express");
const router = express.Router();
const { upload, uploadResume, uploadAndParseResume } = require("../controllers/uploadController");
const { authenticateToken } = require("../middleware/auth");

router.post(
    "/resume",
    authenticateToken,
    upload.single("resume"),
    uploadResume
);

router.post(
    "/resume-parse",
    authenticateToken,
    upload.single("resume"),
    uploadAndParseResume
);

module.exports = router;
