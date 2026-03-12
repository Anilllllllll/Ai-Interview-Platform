const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const OpenAI = require("openai");
const logger = require("../utils/logger");

const openai = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
});

const ANALYSIS_MODEL = "llama-3.3-70b-versatile";

/**
 * Extract plain text from a PDF or DOCX file.
 */
const extractText = async (filePath, mimetype) => {
    try {
        if (mimetype === "application/pdf") {
            const buffer = fs.readFileSync(filePath);
            const data = await pdfParse(buffer);
            return data.text?.trim() || "";
        }

        if (
            mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
            mimetype === "application/msword"
        ) {
            const result = await mammoth.extractRawText({ path: filePath });
            return result.value?.trim() || "";
        }

        throw new Error(`Unsupported file type: ${mimetype}`);
    } catch (error) {
        logger.error(`Resume text extraction failed: ${error.message}`);
        throw new Error(`Failed to extract text from resume: ${error.message}`);
    }
};

/**
 * Send extracted resume text to AI for structured analysis.
 * Returns JSON with skills, projects, tech stack, experience level, etc.
 */
const analyzeResume = async (resumeText) => {
    if (!resumeText || resumeText.length < 50) {
        throw new Error("Resume text is too short or empty. Please upload a valid resume.");
    }

    const systemPrompt = `You are an expert resume analyst. Analyze the given resume text and extract structured information. Be accurate and only extract information that is explicitly mentioned.`;

    const userMessage = `Analyze this resume and extract structured data.

--- BEGIN RESUME TEXT ---
${resumeText.substring(0, 8000)}
--- END RESUME TEXT ---

Return ONLY valid JSON in this exact format:
{
  "primarySkills": ["skill1", "skill2", "skill3"],
  "techStack": ["tech1", "tech2", "tech3"],
  "projects": [
    {
      "name": "Project Name",
      "description": "Brief description",
      "technologies": ["tech1", "tech2"]
    }
  ],
  "experienceLevel": "Fresher / Junior (0-2 years) / Mid-level (2-4 years) / Senior (5+ years)",
  "education": "Degree and institution",
  "workExperience": [
    {
      "role": "Job Title",
      "company": "Company Name",
      "duration": "Duration"
    }
  ],
  "summary": "A 2-3 sentence professional summary of the candidate"
}

Return ONLY valid JSON. No markdown, no code blocks, no extra text.`;

    try {
        const completion = await openai.chat.completions.create({
            model: ANALYSIS_MODEL,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessage },
            ],
        });

        const content = completion.choices[0].message.content;
        const cleaned = content
            .replace(/```json\n?/g, "")
            .replace(/```\n?/g, "")
            .trim();

        return JSON.parse(cleaned);
    } catch (error) {
        logger.error(`Resume AI analysis failed: ${error.message}`);
        throw new Error("Failed to analyze resume with AI. Please try again.");
    }
};

module.exports = {
    extractText,
    analyzeResume,
};
