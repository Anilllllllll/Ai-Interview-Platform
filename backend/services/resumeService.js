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

    const systemPrompt = `You are an expert resume analyst and technical recruiter with 15+ years of experience. Your job is to extract ACCURATE, SPECIFIC information from resumes.

RULES:
- Only extract information that is EXPLICITLY mentioned in the resume
- Do NOT invent or assume skills, projects, or experience
- If a section is missing, return an empty array or "Not mentioned"
- Be precise with technology names (e.g., "React.js" not just "frontend")
- For experience level, calculate based on actual dates mentioned
- Each project MUST have a real description from the resume, not a generic one`;

    const userMessage = `Extract structured data from this resume. Be accurate and specific.

--- BEGIN RESUME TEXT ---
${resumeText.substring(0, 10000)}
--- END RESUME TEXT ---

Return ONLY valid JSON (no markdown, no code blocks):
{
  "primarySkills": ["<actual skills from resume — list ALL mentioned>"],
  "techStack": ["<specific technologies/frameworks/tools mentioned>"],
  "projects": [
    {
      "name": "<actual project name from resume>",
      "description": "<actual description from resume, not made up>",
      "technologies": ["<techs used in this specific project>"],
      "impact": "<any metrics or outcomes mentioned>"
    }
  ],
  "experienceLevel": "<calculate from dates: Fresher / Junior (0-2 years) / Mid-level (2-4 years) / Senior (5+ years)>",
  "totalYearsOfExperience": <number or 0 if fresher>,
  "education": "<degree, field, institution, year if mentioned>",
  "workExperience": [
    {
      "role": "<exact job title>",
      "company": "<company name>",
      "duration": "<start - end dates if mentioned>",
      "highlights": ["<key achievement or responsibility>"]
    }
  ],
  "certifications": ["<any certifications mentioned>"],
  "achievements": ["<awards, publications, notable accomplishments>"],
  "summary": "<3-4 sentence professional summary based on ACTUAL resume content. Reference specific skills and experience.>"
}`;

    try {
        const completion = await openai.chat.completions.create({
            model: ANALYSIS_MODEL,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessage },
            ],
            temperature: 0.2,   // Low temperature for consistent, accurate extraction
            max_tokens: 1500,   // More tokens for detailed analysis
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
