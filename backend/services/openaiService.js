const OpenAI = require("openai");
const logger = require("../utils/logger");

const openai = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
});

const QUESTION_MODEL = "llama-3.3-70b-versatile";
const FEEDBACK_MODEL = "llama-3.3-70b-versatile";
const MAX_RETRIES = 3;
const TRANSCRIPT_WINDOW = 20;

const buildSystemPrompt = (domain, specialization) => {
    return `You are a strict, professional senior interviewer with 15+ years of experience hiring for the ${specialization} role in the ${domain} domain.

You are conducting a realistic 2025–2026 interview.

Rules:
- Ask ONE question at a time
- Never give hints
- Never give feedback during interview
- Only evaluate after interview ends
- Stay professional
- Never break character`;
};

/**
 * Build a resume-aware system prompt that includes the candidate's background.
 */
const buildResumeSystemPrompt = (domain, specialization, resumeAnalysis) => {
    let resumeContext = "";
    if (resumeAnalysis) {
        const skills = resumeAnalysis.primarySkills?.join(", ") || "Not specified";
        const tech = resumeAnalysis.techStack?.join(", ") || "Not specified";
        const projects = resumeAnalysis.projects?.map(p => `${p.name} (${p.technologies?.join(", ")})`).join("; ") || "None listed";
        const experience = resumeAnalysis.experienceLevel || "Not specified";
        const summary = resumeAnalysis.summary || "";

        resumeContext = `

CANDIDATE'S RESUME BACKGROUND:
- Primary Skills: ${skills}
- Tech Stack: ${tech}
- Projects: ${projects}
- Experience Level: ${experience}
- Summary: ${summary}

IMPORTANT: You must ask questions DIRECTLY BASED on the candidate's resume. Ask about their specific projects, technologies they've listed, and work experience. Probe deeper into their claimed skills.`;
    }

    return `You are a strict, professional senior interviewer with 15+ years of experience hiring for the ${specialization} role in the ${domain} domain.

You are conducting a realistic 2025–2026 interview based on the candidate's resume.

Rules:
- Ask ONE question at a time
- Ask questions specifically about the candidate's resume content: their projects, skills, and experience
- Never give hints
- Never give feedback during interview
- Only evaluate after interview ends
- Stay professional
- Never break character${resumeContext}`;
};

const trimTranscript = (transcript) => {
    if (!transcript || transcript.length === 0) return [];
    const sliced =
        transcript.length <= TRANSCRIPT_WINDOW
            ? transcript
            : transcript.slice(-TRANSCRIPT_WINDOW);
    return sliced.map((t) => ({
        role: t.role === "assistant" ? "assistant" : "user",
        content: t.content,
    }));
};

const callOpenAIWithRetry = async (modelName, systemPrompt, history, userMessage, retries = MAX_RETRIES) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const messages = [
                { role: "system", content: systemPrompt },
                ...history,
                { role: "user", content: userMessage },
            ];

            const completion = await openai.chat.completions.create({
                model: modelName,
                messages: messages,
            });

            return completion.choices[0].message.content;
        } catch (error) {
            logger.error(
                `OpenAI API attempt ${attempt}/${retries} failed: ${error.message}`
            );
            if (attempt === retries) {
                throw new Error(
                    `OpenAI API failed after ${retries} attempts: ${error.message}`
                );
            }
            const delay = Math.pow(2, attempt) * 1000;
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
};

const generateFirstQuestion = async ({
    domain,
    specialization,
    role,
    difficulty,
    interviewType,
    resumeData,
}) => {
    const isResumeMode = resumeData?.resumeAnalysis;

    const systemPrompt = isResumeMode
        ? buildResumeSystemPrompt(domain, specialization, resumeData.resumeAnalysis)
        : buildSystemPrompt(domain, specialization);

    let userMessage;
    if (isResumeMode) {
        const resumeAnalysis = resumeData.resumeAnalysis;
        const firstProject = resumeAnalysis.projects?.[0]?.name || "their primary project";
        const primarySkill = resumeAnalysis.primarySkills?.[0] || "their core technology";

        userMessage = `Start the interview now. The candidate is applying for the "${role}" position.
Difficulty level: ${difficulty}
Interview type: ${interviewType}

This is a RESUME-BASED interview. The candidate has submitted their resume.
Their key projects include: ${resumeAnalysis.projects?.map(p => p.name).join(", ") || "various projects"}
Their primary skills are: ${resumeAnalysis.primarySkills?.join(", ") || "not specified"}

Greet the candidate briefly and professionally, mention that you've reviewed their resume, then ask your first question specifically about "${firstProject}" or "${primarySkill}" from their resume. Keep it to one question only.`;
    } else {
        userMessage = `Start the interview now. The candidate is applying for the "${role}" position.
Difficulty level: ${difficulty}
Interview type: ${interviewType}

Greet the candidate briefly and professionally, then ask your first interview question. Keep it to one question only.`;
    }

    const content = await callOpenAIWithRetry(
        QUESTION_MODEL,
        systemPrompt,
        [],
        userMessage
    );

    return content;
};

const generateNextQuestion = async ({
    domain,
    specialization,
    role,
    difficulty,
    interviewType,
    transcript,
    resumeData,
}) => {
    const isResumeMode = resumeData?.resumeAnalysis;

    const systemPrompt = isResumeMode
        ? buildResumeSystemPrompt(domain, specialization, resumeData.resumeAnalysis)
        : buildSystemPrompt(domain, specialization);

    const history = trimTranscript(transcript);

    let userMessage;
    if (isResumeMode) {
        userMessage = `Based on the candidate's previous answer, ask the next interview question. You may ask a follow-up question if the previous answer warrants deeper exploration, or move to a new topic FROM THEIR RESUME. Remember:
- Difficulty: ${difficulty}
- Interview type: ${interviewType}
- Role: ${role}
- This is a RESUME-BASED interview — ask about their specific projects, technologies, and experience
- Ask ONE question only
- Do NOT provide feedback yet`;
    } else {
        userMessage = `Based on the candidate's previous answer, ask the next interview question. You may ask a follow-up question if the previous answer warrants deeper exploration, or move to a new topic. Remember:
- Difficulty: ${difficulty}
- Interview type: ${interviewType}
- Role: ${role}
- Ask ONE question only
- Do NOT provide feedback yet`;
    }

    const content = await callOpenAIWithRetry(
        QUESTION_MODEL,
        systemPrompt,
        history,
        userMessage
    );

    return content;
};

const generateFeedback = async ({
    domain,
    specialization,
    role,
    difficulty,
    interviewType,
    transcript,
    gestureAnalysis,
    resumeData,
}) => {
    const isResumeMode = resumeData?.resumeAnalysis;

    const systemPrompt = `You are a senior interviewer evaluating a candidate for the ${specialization} role in the ${domain} domain. Provide detailed, structured feedback based on the candidate's spoken answers AND their body language / gesture analysis data.`;

    // Build text transcript
    let transcriptText = "";
    if (transcript && transcript.length > 0) {
        transcriptText = transcript
            .map((t) => {
                const speaker = t.role === "assistant" ? "Interviewer" : "Candidate";
                return `${speaker}: ${t.content}`;
            })
            .join("\n\n");
    } else {
        transcriptText = "(No transcript available)";
    }

    // Build gesture data text
    let gestureText = "(No gesture data available — evaluate based on answers only)";
    if (gestureAnalysis && typeof gestureAnalysis === "object") {
        gestureText = `Eye Contact: ${gestureAnalysis.eyeContact ?? "N/A"}/100
Facial Expression: ${gestureAnalysis.facialExpression ?? "N/A"}/100
Posture: ${gestureAnalysis.posture ?? "N/A"}/100
Engagement Level: ${gestureAnalysis.engagementLevel ?? "N/A"}/100
Confidence Level: ${gestureAnalysis.confidenceLevel ?? "N/A"}/100`;
    }

    // Build resume context for feedback
    let resumeSection = "";
    let resumeParam = "";
    let resumeJsonField = "";
    let paramCount = "6";

    if (isResumeMode) {
        const ra = resumeData.resumeAnalysis;
        resumeSection = `
--- BEGIN CANDIDATE RESUME DATA ---
Primary Skills: ${ra.primarySkills?.join(", ") || "N/A"}
Tech Stack: ${ra.techStack?.join(", ") || "N/A"}
Projects: ${ra.projects?.map(p => `${p.name} (${p.technologies?.join(", ")})`).join("; ") || "N/A"}
Experience Level: ${ra.experienceLevel || "N/A"}
--- END CANDIDATE RESUME DATA ---`;

        resumeParam = `
7. Resume Understanding (0-100)
   - How well the candidate explained their own projects and experience
   - Accuracy and depth of knowledge about their listed skills
   - Ability to discuss their work experience confidently
   - Score Guide: 90-100=Deep understanding, 70-89=Good grasp, 50-69=Surface level, 30-49=Struggled, 0-29=Could not explain own resume`;

        resumeJsonField = `\n  "resumeUnderstanding": <number>,`;
        paramCount = "7";
    }

    const feedbackPrompt = `The interview is now complete. Evaluate the candidate based on their spoken answers AND their gesture/body language data.

--- BEGIN INTERVIEW TRANSCRIPT ---
${transcriptText}
--- END INTERVIEW TRANSCRIPT ---

--- BEGIN GESTURE ANALYSIS DATA ---
${gestureText}
--- END GESTURE ANALYSIS DATA ---
${resumeSection}

Evaluate the candidate on these ${paramCount} parameters:

1. Technical Skills (0-100)
   - Correctness of technical concepts
   - Depth of knowledge and accuracy of explanations
   - Score Guide: 90-100=Excellent expert-level, 70-89=Strong with minor gaps, 50-69=Average, 30-49=Weak, 0-29=Very poor

2. Communication Skills (0-100)
   - Clarity of speech, fluency, articulation
   - Confidence in speaking
   - Use gesture confidence data to adjust: high gesture confidence → increase score

3. Problem Solving (0-100)
   - Logical and structured thinking
   - Reasoning ability and approach to problems

4. Domain Knowledge (0-100)
   - Knowledge of relevant technologies, frameworks, tools
   - Familiarity with real-world usage

5. Confidence Score (0-100)
   - Based on eye contact score, posture score, speaking confidence, hesitation level
   - Higher eye contact + stable posture = higher score
   - If candidate appears nervous → reduce slightly

6. Professional Presence (0-100)
   - Based on facial expressions, engagement level, attentiveness, body language
   - High engagement → increase score
${resumeParam}

IMPORTANT INSTRUCTIONS:
- Evaluate ONLY based on the provided data
- Do NOT give 0 unless answer is completely missing or irrelevant
- Be fair and realistic
- Do NOT assume missing information
- If answer is partially correct, give partial score
- If answer is strong, give high score
- Consider both technical answers AND gesture confidence
- Reward confident and clear candidates
- If no gesture data available, score Confidence and Professional Presence based on verbal cues only

Overall Score = average of all ${paramCount} scores (round to nearest integer)

Interview details:
- Role: ${role}
- Domain: ${domain}
- Specialization: ${specialization}
- Difficulty: ${difficulty}
- Type: ${interviewType}${isResumeMode ? "\n- Mode: Resume-Based Interview" : ""}

Return ONLY valid JSON in this exact format:
{
  "overallScore": <number>,
  "technicalSkills": <number>,
  "communication": <number>,
  "problemSolving": <number>,
  "domainKnowledge": <number>,
  "confidenceScore": <number>,
  "professionalPresence": <number>,${resumeJsonField}
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "improvements": ["<improvement 1>", "<improvement 2>", "<improvement 3>"],
  "detailedFeedback": "<detailed professional feedback paragraph including technical performance, communication, confidence, and body language>"
}

Return ONLY valid JSON. No markdown, no code blocks, no extra text.`;

    const content = await callOpenAIWithRetry(
        FEEDBACK_MODEL,
        systemPrompt,
        [],
        feedbackPrompt
    );

    try {
        const cleaned = content
            .replace(/```json\n?/g, "")
            .replace(/```\n?/g, "")
            .trim();
        return JSON.parse(cleaned);
    } catch (parseError) {
        logger.error(`Failed to parse feedback JSON: ${parseError.message}`);
        return {
            overallScore: 0,
            technicalSkills: 0,
            communication: 0,
            problemSolving: 0,
            domainKnowledge: 0,
            confidenceScore: 0,
            professionalPresence: 0,
            strengths: [],
            improvements: [],
            detailedFeedback: content,
        };
    }
};

module.exports = {
    generateFirstQuestion,
    generateNextQuestion,
    generateFeedback,
};
