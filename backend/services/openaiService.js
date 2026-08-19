const OpenAI = require("openai");
const logger = require("../utils/logger");

const openai = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
});

const QUESTION_MODEL = "qwen/qwen3.6-27b";
const FEEDBACK_MODEL = "qwen/qwen3.6-27b";
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

const callOpenAIWithRetry = async (modelName, systemPrompt, history, userMessage, { retries = MAX_RETRIES, temperature = 0.7, max_tokens } = {}) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const messages = [
                { role: "system", content: systemPrompt },
                ...history,
                { role: "user", content: userMessage },
            ];

            const params = {
                model: modelName,
                messages,
                temperature,
            };
            if (max_tokens) params.max_tokens = max_tokens;

            const completion = await openai.chat.completions.create(params);

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

    // Get the last candidate answer for relevance analysis
    const lastAnswer = transcript?.filter(t => t.role === "user").slice(-1)[0]?.content || "";
    const lastQuestion = transcript?.filter(t => t.role === "assistant").slice(-1)[0]?.content || "";

    const resumeExtra = isResumeMode
        ? `\n- This is a RESUME-BASED interview — ask about their specific projects, technologies, and experience`
        : "";

    const userMessage = `FIRST, evaluate the candidate's LAST answer for relevance.

Last question asked: "${lastQuestion.substring(0, 500)}"
Candidate's answer: "${lastAnswer.substring(0, 1000)}"

STEP 1: Start your response with EXACTLY ONE of these tags on its own line:
[RELEVANT] — if the answer addresses the question with technical content
[PARTIAL] — if the answer is vaguely related but lacks substance or depth
[OFF_TOPIC] — if the answer is completely unrelated to the question asked
[EMPTY] — if the answer is blank, gibberish, or just filler words

STEP 2: On the next line, ask your next interview question.

Rules:
- Difficulty: ${difficulty}
- Interview type: ${interviewType}
- Role: ${role}${resumeExtra}
- Ask ONE question only
- Do NOT provide feedback or hints about whether their answer was correct
- If the candidate gave an off-topic or empty answer, DO NOT acknowledge it — just move to the next question professionally
- Keep your response short: just the tag line + the question`;

    const content = await callOpenAIWithRetry(
        QUESTION_MODEL,
        systemPrompt,
        history,
        userMessage,
        { temperature: 0.5 }
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

    const systemPrompt = `You are a BRUTALLY HONEST senior technical interviewer evaluating a candidate for the ${specialization} role in the ${domain} domain.

You NEVER inflate scores. You evaluate ONLY what the candidate ACTUALLY said, not what they COULD have said.
If a candidate gave wrong, irrelevant, or vague answers, their scores MUST reflect that.
You are known for accurate, realistic evaluations that hiring managers trust.`;

    // Build text transcript with relevance tags
    let transcriptText = "";
    let relevantCount = 0;
    let offTopicCount = 0;
    let emptyCount = 0;
    let partialCount = 0;

    if (transcript && transcript.length > 0) {
        transcriptText = transcript
            .map((t) => {
                const speaker = t.role === "assistant" ? "Interviewer" : "Candidate";
                let line = `${speaker}: ${t.content}`;
                // Count relevance tags if present in metadata
                if (t.role === "user" && t.relevanceTag) {
                    line = `${speaker} [${t.relevanceTag}]: ${t.content}`;
                    if (t.relevanceTag === "RELEVANT") relevantCount++;
                    else if (t.relevanceTag === "OFF_TOPIC") offTopicCount++;
                    else if (t.relevanceTag === "EMPTY") emptyCount++;
                    else if (t.relevanceTag === "PARTIAL") partialCount++;
                }
                return line;
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
   - Score 0 if no resume questions were answered or if answers were irrelevant`;

        resumeJsonField = `\n  "resumeUnderstanding": <number>,`;
        paramCount = "7";
    }

    // Participation analysis
    const candidateAnswers = transcript?.filter(t => t.role === "user") || [];
    const totalAnswerLength = candidateAnswers.reduce((acc, curr) => acc + (curr.content?.length || 0), 0);
    const isAborted = candidateAnswers.length === 0 || totalAnswerLength < 20;
    const totalQuestions = transcript?.filter(t => t.role === "assistant").length || 0;

    // Build answer quality summary for the AI
    const answerQualitySummary = `
--- ANSWER QUALITY ANALYSIS (computed by system) ---
Total questions asked: ${totalQuestions}
Total answers given: ${candidateAnswers.length}
Relevant answers: ${relevantCount}
Partially relevant answers: ${partialCount}
Off-topic/irrelevant answers: ${offTopicCount}
Empty/gibberish answers: ${emptyCount}
Total answer text length: ${totalAnswerLength} characters
Average answer length: ${candidateAnswers.length > 0 ? Math.round(totalAnswerLength / candidateAnswers.length) : 0} characters
--- END ANSWER QUALITY ANALYSIS ---`;

    let strictDirective = "";
    if (isAborted) {
        strictDirective = "\n⚠️ ABORT MODE: The candidate provided NO substantial answers. ALL technical scores MUST be 0. detailedFeedback MUST start with: 'This interview was terminated prematurely.'\n";
    } else if (offTopicCount + emptyCount >= Math.ceil(candidateAnswers.length * 0.5)) {
        strictDirective = `\n⚠️ LOW QUALITY MODE: ${offTopicCount + emptyCount} out of ${candidateAnswers.length} answers were off-topic or empty. Technical Skills, Problem Solving, and Domain Knowledge scores MUST be below 30. Do NOT give credit for irrelevant answers.\n`;
    } else if (offTopicCount + emptyCount >= 2) {
        strictDirective = `\n⚠️ MIXED QUALITY: ${offTopicCount + emptyCount} answers were off-topic or empty. Cap Technical Skills at 50 max unless the relevant answers were exceptionally strong.\n`;
    }

    const feedbackPrompt = `The interview is now complete. Evaluate the candidate STRICTLY based on their ACTUAL spoken answers and gesture data.${strictDirective}

--- BEGIN INTERVIEW TRANSCRIPT ---
${transcriptText}
--- END INTERVIEW TRANSCRIPT ---

${answerQualitySummary}

--- BEGIN GESTURE ANALYSIS DATA ---
${gestureText}
--- END GESTURE ANALYSIS DATA ---
${resumeSection}

SCORING RULES (you MUST follow these strictly):

1. Technical Skills (0-100)
   90-100: Expert — explained complex concepts accurately with depth and examples
   70-89: Strong — correct answers with minor gaps, showed real understanding
   50-69: Average — some correct answers but shallow or incomplete explanations
   30-49: Weak — mostly incorrect or vague answers, fundamental gaps
   10-29: Very poor — almost all answers wrong or irrelevant
   0-9: No demonstration — did not answer OR gave completely unrelated responses

2. Communication Skills (0-100)
   High: Clear, articulate, well-structured responses
   Low: Incoherent, rambling, or did not speak
   0 if candidate said nothing

3. Problem Solving (0-100)
   Evaluate ONLY if the candidate attempted to solve problems
   0 if no problems were attempted or if answers showed no logical reasoning

4. Domain Knowledge (0-100)
   Based on specific knowledge of ${domain} technologies and practices
   0 if the candidate demonstrated no domain-relevant knowledge

5. Confidence Score (0-100)
   Based on gesture data: eye contact + posture + speaking confidence
   Cap at 30 if candidate was mostly silent

6. Professional Presence (0-100)
   Based on facial expressions, engagement, attentiveness
   Cap at 20 if candidate aborted early
${resumeParam}

🚨 ANTI-INFLATION RULES (CRITICAL):
- A score above 60 means the candidate gave CORRECT, SUBSTANTIVE answers. Do not give 60+ for effort alone.
- If the candidate spoke about something UNRELATED to the question, that answer scores 0 for technical evaluation.
- "I don't know" is better than a wrong answer — at least it shows honesty. But it still scores low.
- Do NOT give high scores because the transcript is long. Length ≠ quality.
- Read EACH answer and check: did it actually address what was asked? Was it correct?
- If most answers were off-topic, the overall score should be below 30.

Overall Score = weighted average: Technical(30%) + Communication(15%) + ProblemSolving(20%) + DomainKnowledge(20%) + Confidence(7.5%) + ProfessionalPresence(7.5%)${isResumeMode ? " + ResumeUnderstanding adjusts Technical by ±10%" : ""}

Interview details:
- Role: ${role}
- Domain: ${domain}
- Specialization: ${specialization}
- Difficulty: ${difficulty}
- Type: ${interviewType}${isResumeMode ? "\n- Mode: Resume-Based Interview" : ""}

Return ONLY valid JSON (no markdown, no code blocks):
{
  "overallScore": <number>,
  "technicalSkills": <number>,
  "communication": <number>,
  "problemSolving": <number>,
  "domainKnowledge": <number>,
  "confidenceScore": <number>,
  "professionalPresence": <number>,${resumeJsonField}
  "strengths": ["<specific strength from transcript>", "<strength 2>", "<strength 3>"],
  "improvements": ["<specific improvement based on actual weak answers>", "<improvement 2>", "<improvement 3>"],
  "detailedFeedback": "<2-3 paragraph detailed feedback referencing SPECIFIC answers the candidate gave, what was correct, what was wrong, and actionable advice>"
}`;

    const content = await callOpenAIWithRetry(
        FEEDBACK_MODEL,
        systemPrompt,
        [],
        feedbackPrompt,
        { temperature: 0.3, max_tokens: 2000 }
    );

    try {
        const cleaned = content
            .replace(/```json\n?/g, "")
            .replace(/```\n?/g, "")
            .trim();
        const parsed = JSON.parse(cleaned);

        // Server-side score validation: clamp impossible scores
        if (isAborted) {
            parsed.technicalSkills = 0;
            parsed.problemSolving = 0;
            parsed.domainKnowledge = 0;
            parsed.communication = Math.min(parsed.communication || 0, 10);
            if (parsed.resumeUnderstanding !== undefined) parsed.resumeUnderstanding = 0;
        }

        // Recalculate overall score with weighted formula
        const weights = {
            technicalSkills: 0.30,
            communication: 0.15,
            problemSolving: 0.20,
            domainKnowledge: 0.20,
            confidenceScore: 0.075,
            professionalPresence: 0.075,
        };
        if (isResumeMode) {
            weights.technicalSkills = 0.25;
            weights.resumeUnderstanding = 0.05;
        }

        let weightedSum = 0;
        for (const [key, weight] of Object.entries(weights)) {
            weightedSum += (parsed[key] || 0) * weight;
        }
        parsed.overallScore = Math.round(weightedSum);

        return parsed;
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
