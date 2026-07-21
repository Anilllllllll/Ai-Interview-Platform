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

        // Get the job description from request body (optional but improves accuracy)
        const jobDescription = req.body?.jobDescription || "";
        const targetRole = req.body?.targetRole || "Software Engineer";

        const systemPrompt = `You are a senior ATS (Applicant Tracking System) expert with 15+ years of experience in technical recruiting and resume screening.

Your job is to provide a PRECISE, HONEST, and DETAILED analysis. Do NOT give generic responses. Every score must reflect the ACTUAL content of this specific resume.

SCORING RULES (be strict and honest):
- 90-100: Exceptional — Fortune 500 ready, perfect ATS formatting, strong quantified achievements
- 75-89: Strong — Good structure, relevant keywords, minor improvements needed
- 60-74: Average — Missing key sections, weak action verbs, needs optimization
- 40-59: Below Average — Poor formatting, missing keywords, significant gaps
- 0-39: Weak — Major issues, likely rejected by ATS

IMPORTANT:
- Actually READ and REFERENCE specific content from the resume
- Don't give the same scores to every resume
- Be SPECIFIC in strengths and issues — mention actual skills/sections found or missing
- Compare against what a ${targetRole} resume should contain`;

        const userPrompt = `Analyze this resume for ATS compatibility${jobDescription ? ` for this target role: ${targetRole}` : ""}.

--- BEGIN RESUME TEXT ---
${resumeText.substring(0, 8000)}
--- END RESUME TEXT ---
${jobDescription ? `
--- JOB DESCRIPTION (compare resume against this) ---
${jobDescription.substring(0, 2000)}
--- END JOB DESCRIPTION ---
` : `
Target Role: ${targetRole}
`}

Perform a THOROUGH analysis. For each category, explain WHY you gave that specific score based on ACTUAL content you found (or didn't find) in the resume.

Return ONLY a valid JSON object (no markdown, no code blocks):
{
  "overallScore": <number 0-100 — weighted average of all scores below>,
  "categories": {
    "skillsMatch": {
      "score": <number 0-100>,
      "reason": "<1 sentence explaining why, referencing actual skills found>"
    },
    "keywordsOptimization": {
      "score": <number 0-100>,
      "reason": "<1 sentence about keyword density and relevance>"
    },
    "workExperience": {
      "score": <number 0-100>,
      "reason": "<1 sentence about experience quality, quantified achievements>"
    },
    "projectDescriptions": {
      "score": <number 0-100>,
      "reason": "<1 sentence about project detail and impact>"
    },
    "formatting": {
      "score": <number 0-100>,
      "reason": "<1 sentence about ATS-friendly formatting>"
    },
    "sectionCompleteness": {
      "score": <number 0-100>,
      "reason": "<1 sentence about which sections exist/missing>"
    }
  },
  "strengths": ["<specific strength referencing actual resume content>", "<another>", "<another>"],
  "issuesFound": ["<specific issue found in THIS resume>", "<another>", "<another>"],
  "suggestions": ["<actionable suggestion specific to THIS resume>", "<another>", "<another>"],
  "detectedSections": {
    "hasContactInfo": <boolean>,
    "hasObjective": <boolean>,
    "hasExperience": <boolean>,
    "hasEducation": <boolean>,
    "hasSkills": <boolean>,
    "hasProjects": <boolean>,
    "hasCertifications": <boolean>
  },
  "topSkillsDetected": ["<actual skill from resume>", "<another>"],
  "missingKeywords": ["<important keyword for ${targetRole} NOT found in resume>"],
  "summary": "<3-4 sentence analysis of this SPECIFIC resume. Reference actual content. Don't be generic.>"
}`;

        const response = await client.chat.completions.create({
            model: ATS_MODEL,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            temperature: 0.2,  // Lower = more consistent and precise
            max_tokens: 2000,  // More tokens for detailed analysis
        });

        const raw = response.choices[0]?.message?.content?.trim() || "{}";
        const cleaned = raw.replace(/^```json|^```|```$/gm, "").trim();
        const result = JSON.parse(cleaned);

        // Flatten categories for backward compatibility with frontend
        if (result.categories) {
            result.skillsMatch = result.categories.skillsMatch?.score ?? result.skillsMatch;
            result.keywordsOptimization = result.categories.keywordsOptimization?.score ?? result.keywordsOptimization;
            result.workExperience = result.categories.workExperience?.score ?? result.workExperience;
            result.projectDescriptions = result.categories.projectDescriptions?.score ?? result.projectDescriptions;
            result.formatting = result.categories.formatting?.score ?? result.formatting;
            result.sectionCompleteness = result.categories.sectionCompleteness?.score ?? result.sectionCompleteness;
        }

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
