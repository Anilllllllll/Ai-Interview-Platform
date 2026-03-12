const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const OpenAI = require("openai");

// Use same Groq-compatible client as the rest of the app
const client = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
});

const ATS_MODEL = "llama-3.3-70b-versatile";

const extractText = async (filePath, mimetype) => {
    const buffer = fs.readFileSync(filePath);
    if (mimetype === "application/pdf") {
        const data = await pdfParse(buffer);
        return data.text;
    } else if (
        mimetype ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
    }
    throw new Error("Unsupported file type");
};

const analyzeATS = async (req, res) => {
    let filePath = null;
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No resume file uploaded." });
        }

        filePath = req.file.path;
        const resumeText = await extractText(filePath, req.file.mimetype);

        if (!resumeText || resumeText.trim().length < 50) {
            return res.status(400).json({ message: "Could not extract meaningful text from the resume." });
        }

        const prompt = `You are an expert ATS (Applicant Tracking System) analyzer. Analyze the following resume and return a detailed ATS compatibility report.

Resume Text:
"""
${resumeText.substring(0, 6000)}
"""

Return ONLY a valid JSON object with this exact structure (no markdown, no extra text):
{
  "overallScore": <number 0-100>,
  "skillsMatch": <number 0-100>,
  "keywordsOptimization": <number 0-100>,
  "workExperience": <number 0-100>,
  "projectDescriptions": <number 0-100>,
  "formatting": <number 0-100>,
  "sectionCompleteness": <number 0-100>,
  "strengths": ["<string>"],
  "issuesFound": ["<string>"],
  "suggestions": ["<string>"],
  "detectedSections": {
    "hasContactInfo": <boolean>,
    "hasObjective": <boolean>,
    "hasExperience": <boolean>,
    "hasEducation": <boolean>,
    "hasSkills": <boolean>,
    "hasProjects": <boolean>,
    "hasCertifications": <boolean>
  },
  "topSkillsDetected": ["<string>", "<string>"],
  "summary": "<2-3 sentence summary of the resume quality>"
}`;

        const response = await client.chat.completions.create({
            model: ATS_MODEL,
            messages: [
                {
                    role: "system",
                    content: "You are an ATS expert. Always respond with valid JSON only, no markdown, no code blocks.",
                },
                { role: "user", content: prompt },
            ],
            temperature: 0.3,
            max_tokens: 1200,
        });

        const raw = response.choices[0]?.message?.content?.trim() || "{}";
        const cleaned = raw.replace(/^```json|^```|```$/gm, "").trim();
        const result = JSON.parse(cleaned);

        // Cleanup temp file
        if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);

        return res.json({ success: true, analysis: result });
    } catch (error) {
        if (filePath && fs.existsSync(filePath)) {
            try { fs.unlinkSync(filePath); } catch (_) {}
        }
        console.error("ATS analyze error:", error.message);
        return res.status(500).json({ message: "Failed to analyze resume. Please try again." });
    }
};

module.exports = { analyzeATS };
