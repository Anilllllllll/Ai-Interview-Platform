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

const ATS_MODEL = "qwen/qwen3.6-27b";

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

/**
 * Content fingerprinting — extract hard facts from the resume text
 * so the AI can't give generic scores. These facts are injected into the prompt.
 */
const extractFingerprint = (text) => {
    const words = text.trim().split(/\s+/);
    const wordCount = words.length;

    // Detect common technical skills
    const skillPatterns = [
        "javascript", "typescript", "python", "java", "c\\+\\+", "c#", "ruby", "go", "rust", "swift", "kotlin",
        "react", "angular", "vue", "next\\.?js", "node\\.?js", "express", "django", "flask", "spring",
        "html", "css", "tailwind", "bootstrap", "sass",
        "mongodb", "postgresql", "mysql", "redis", "dynamodb", "firebase", "sql",
        "aws", "azure", "gcp", "docker", "kubernetes", "terraform", "jenkins", "ci/cd",
        "git", "github", "gitlab", "jira", "agile", "scrum",
        "rest\\s?api", "graphql", "microservices", "machine learning", "deep learning",
        "tensorflow", "pytorch", "pandas", "numpy", "scikit",
        "figma", "photoshop", "ui/ux", "wireframe",
        "linux", "nginx", "apache", "bash",
    ];
    const foundSkills = [];
    const lowerText = text.toLowerCase();
    for (const pattern of skillPatterns) {
        const regex = new RegExp(`\\b${pattern}\\b`, "i");
        if (regex.test(lowerText)) {
            // Get the original casing from the text
            const match = text.match(new RegExp(`\\b${pattern}\\b`, "i"));
            if (match) foundSkills.push(match[0]);
        }
    }

    // Detect sections
    const sectionPatterns = {
        hasContactInfo: /email|phone|@|linkedin|\+\d{2}/i,
        hasObjective: /objective|summary|about\s?me|profile/i,
        hasExperience: /experience|employment|work\s?history/i,
        hasEducation: /education|university|college|degree|bachelor|master/i,
        hasSkills: /skills|technologies|tech\s?stack|proficien/i,
        hasProjects: /projects?|portfolio/i,
        hasCertifications: /certif|license|credential/i,
    };
    const detectedSections = {};
    for (const [key, regex] of Object.entries(sectionPatterns)) {
        detectedSections[key] = regex.test(text);
    }
    const sectionCount = Object.values(detectedSections).filter(Boolean).length;

    // Detect quantified achievements (numbers in context)
    const quantifiedAchievements = (text.match(/\d+[%+x]|\$\d+|reduced|increased|improved|optimized|built|led|managed|delivered/gi) || []).length;

    // Detect action verbs
    const actionVerbs = (text.match(/\b(built|designed|developed|implemented|created|managed|led|architected|deployed|optimized|automated|integrated|reduced|increased|improved|launched|delivered|coordinated|established|engineered)\b/gi) || []);

    return {
        wordCount,
        uniqueSkills: [...new Set(foundSkills.map(s => s.toLowerCase()))].map(s => foundSkills.find(f => f.toLowerCase() === s)),
        skillCount: new Set(foundSkills.map(s => s.toLowerCase())).size,
        detectedSections,
        sectionCount,
        quantifiedAchievements,
        actionVerbCount: actionVerbs.length,
        uniqueActionVerbs: [...new Set(actionVerbs.map(v => v.toLowerCase()))],
    };
};

/**
 * Calculate keyword overlap between resume and job description
 */
const calculateJDOverlap = (resumeText, jdText) => {
    const extractKeywords = (text) => {
        const words = text.toLowerCase()
            .replace(/[^a-zA-Z0-9\s\+\#\.]/g, " ")
            .split(/\s+/)
            .filter(w => w.length > 2);
        // Remove common stop words
        const stopWords = new Set(["the", "and", "for", "are", "but", "not", "you", "all", "can", "had", "her", "was", "one", "our", "out", "with", "have", "this", "from", "they", "been", "will", "their", "would", "about", "there", "what", "which", "when", "make", "like", "just", "over", "such", "take", "than", "them", "well", "only", "come", "could", "after", "that", "into", "also", "other", "should", "experience", "work", "working", "using", "ability", "role", "team", "years"]);
        return [...new Set(words.filter(w => !stopWords.has(w)))];
    };

    const jdKeywords = extractKeywords(jdText);
    const resumeKeywords = new Set(extractKeywords(resumeText));

    const matched = jdKeywords.filter(k => resumeKeywords.has(k));
    const missing = jdKeywords.filter(k => !resumeKeywords.has(k));

    return {
        totalJDKeywords: jdKeywords.length,
        matchedCount: matched.length,
        matchPercentage: jdKeywords.length > 0 ? Math.round((matched.length / jdKeywords.length) * 100) : 0,
        matchedKeywords: matched.slice(0, 20),
        missingKeywords: missing.slice(0, 15),
    };
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

        // ── Content fingerprinting ──
        const fingerprint = extractFingerprint(resumeText);
        const jdOverlap = jobDescription ? calculateJDOverlap(resumeText, jobDescription) : null;

        // Build fingerprint summary for the prompt
        const fingerprintBlock = `
--- CONTENT FINGERPRINT (these are FACTS — use them to calibrate your scores) ---
Word count: ${fingerprint.wordCount}
Skills detected (${fingerprint.skillCount}): ${fingerprint.uniqueSkills.join(", ") || "NONE DETECTED"}
Sections found (${fingerprint.sectionCount}/7): ${Object.entries(fingerprint.detectedSections).filter(([,v]) => v).map(([k]) => k.replace("has", "")).join(", ") || "NONE"}
Missing sections: ${Object.entries(fingerprint.detectedSections).filter(([,v]) => !v).map(([k]) => k.replace("has", "")).join(", ") || "ALL PRESENT"}
Quantified achievements: ${fingerprint.quantifiedAchievements} instances
Action verbs used: ${fingerprint.actionVerbCount} (${fingerprint.uniqueActionVerbs.slice(0, 10).join(", ") || "NONE"})
--- END FINGERPRINT ---`;

        const jdBlock = jdOverlap ? `
--- JOB DESCRIPTION MATCH ANALYSIS (pre-calculated) ---
JD Keyword Match: ${jdOverlap.matchPercentage}% (${jdOverlap.matchedCount}/${jdOverlap.totalJDKeywords} keywords found)
Matched keywords: ${jdOverlap.matchedKeywords.join(", ")}
Missing from resume: ${jdOverlap.missingKeywords.join(", ")}
--- END JD MATCH ---

--- TARGET JOB DESCRIPTION ---
${jobDescription.substring(0, 3000)}
--- END JOB DESCRIPTION ---` : "";

        const hasJD = !!jobDescription;

        const systemPrompt = `You are a STRICT ATS (Applicant Tracking System) scoring engine. You produce DIFFERENTIATED scores based on ACTUAL resume content.

CRITICAL RULES:
1. You MUST reference specific content from the resume in every score reason
2. Two resumes with different content MUST get different scores — even if they use the same template
3. A resume's SKILLS, EXPERIENCE, and ACHIEVEMENTS determine the score — NOT its visual template
4. When a Job Description is provided, scoring MUST be heavily weighted toward JD relevance
5. NEVER give all categories similar scores (e.g., all 65-75). Spread them based on actual strengths/weaknesses

SCORING ANCHORS (be honest, not generous):
- 90-100: Top 5% — exceptional quantified achievements, perfect keyword density, complete sections, strong JD match
- 75-89: Strong — good content with specific achievements, most relevant keywords present
- 60-74: Average — generic descriptions, missing some key skills/sections, moderate JD match
- 40-59: Below average — vague bullet points, significant keyword gaps, weak JD alignment
- 20-39: Poor — major sections missing, no quantified achievements, minimal relevant skills
- 0-19: Critical — barely readable, no relevant content

${hasJD ? "⚠️ JOB DESCRIPTION PROVIDED: The 'jdMatch' category is the MOST IMPORTANT score. A resume with great formatting but irrelevant skills for the JD should score LOW overall." : ""}`;

        const userPrompt = `Analyze this resume${hasJD ? ` against the provided job description for "${targetRole}"` : ` for a general "${targetRole}" position`}.

--- BEGIN RESUME TEXT ---
${resumeText.substring(0, 12000)}
--- END RESUME TEXT ---

${fingerprintBlock}
${jdBlock}

STEP 1: Before scoring, list exactly 5 specific phrases/skills you found in the resume text (this prevents generic analysis).
STEP 2: Score each category based on the ACTUAL content and fingerprint data above.

Return ONLY a valid JSON object (no markdown, no code blocks):
{
  "contentEvidence": ["<exact phrase from resume>", "<another>", "<another>", "<another>", "<another>"],
  "overallScore": <number 0-100>,
  ${hasJD ? `"jdMatch": {
    "score": <number 0-100 — how well does this resume match the JD>,
    "reason": "<cite specific skills/keywords that match or are missing from JD>"
  },` : ""}
  "categories": {
    "skillsMatch": {
      "score": <number 0-100>,
      "reason": "<reference actual skills: ${fingerprint.uniqueSkills.slice(0, 5).join(", ") || "none detected"} — are they relevant for ${targetRole}?>"
    },
    "keywordsOptimization": {
      "score": <number 0-100>,
      "reason": "<based on fingerprint: ${fingerprint.skillCount} skills detected, ${fingerprint.actionVerbCount} action verbs>"
    },
    "workExperience": {
      "score": <number 0-100>,
      "reason": "<${fingerprint.quantifiedAchievements} quantified achievements found — is that good enough?>"
    },
    "projectDescriptions": {
      "score": <number 0-100>,
      "reason": "<are projects well-described with tech stack and impact?>"
    },
    "formatting": {
      "score": <number 0-100>,
      "reason": "<${fingerprint.sectionCount}/7 sections detected, ${fingerprint.wordCount} words — ATS parseable?>"
    },
    "sectionCompleteness": {
      "score": <number 0-100>,
      "reason": "<missing: ${Object.entries(fingerprint.detectedSections).filter(([,v]) => !v).map(([k]) => k.replace("has", "")).join(", ") || "none"}>"
    }
  },
  "strengths": ["<specific to THIS resume>", "<another>", "<another>"],
  "issuesFound": ["<specific issue in THIS resume>", "<another>", "<another>"],
  "suggestions": ["<actionable for THIS resume>", "<another>", "<another>"],
  "detectedSections": ${JSON.stringify(fingerprint.detectedSections)},
  "topSkillsDetected": ${JSON.stringify(fingerprint.uniqueSkills.slice(0, 10))},
  "missingKeywords": ["<important keyword for ${targetRole} NOT in resume>"],
  ${hasJD ? `"jdKeywordOverlap": ${jdOverlap.matchPercentage},` : ""}
  "summary": "<3-4 sentences about THIS SPECIFIC resume. Must reference actual content found. ${hasJD ? "Include how well it matches the JD." : ""} Don't be generic."
}`;

        const response = await client.chat.completions.create({
            model: ATS_MODEL,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            temperature: 0.3,  // Lower = more deterministic, content-based scoring
            max_tokens: 3000,
        });

        const raw = response.choices[0]?.message?.content?.trim() || "{}";
        // Strip qwen's <think>...</think> reasoning blocks before parsing
        const cleaned = raw
            .replace(/<think>[\s\S]*?<\/think>/gi, "")
            .replace(/^```json|^```|```$/gm, "")
            .trim();
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

        // If JD provided, recalculate overall score with JD match weighted at 40%
        if (hasJD && result.jdMatch?.score != null) {
            const jdScore = result.jdMatch.score;
            const contentScore = (
                (result.skillsMatch || 50) * 0.15 +
                (result.keywordsOptimization || 50) * 0.10 +
                (result.workExperience || 50) * 0.15 +
                (result.projectDescriptions || 50) * 0.10 +
                (result.formatting || 50) * 0.05 +
                (result.sectionCompleteness || 50) * 0.05
            );
            result.overallScore = Math.round(jdScore * 0.40 + contentScore + 0); // 40% JD + 60% content
            result.jdMatchScore = jdScore; // expose separately for frontend
        }

        // Inject pre-calculated data for frontend
        result.jdKeywordOverlap = jdOverlap?.matchPercentage || null;
        result.jdMatchedKeywords = jdOverlap?.matchedKeywords || [];
        result.jdMissingKeywords = jdOverlap?.missingKeywords || [];
        result.analyzedAgainst = hasJD ? targetRole : null;
        result.fingerprint = {
            wordCount: fingerprint.wordCount,
            skillCount: fingerprint.skillCount,
            sectionCount: fingerprint.sectionCount,
            actionVerbCount: fingerprint.actionVerbCount,
        };

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
