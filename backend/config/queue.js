// ============================================
// Message Queue Setup (BullMQ)
// ============================================
// BullMQ uses Redis as a message broker to process
// heavy tasks in the background (not blocking the API).
//
// ARCHITECTURE:
//   API Server (Producer) → Redis Queue → Worker (Consumer)
//
// WHEN TO USE A QUEUE:
//   - Resume parsing & AI analysis (2-10 seconds)
//   - Sending emails (unreliable, may timeout)
//   - Generating reports or PDFs
//   - Any task > 500ms that doesn't need immediate response
//
// Interview answer: "We use BullMQ with Redis as the message
// broker. The API enqueues jobs and responds immediately (202).
// Background workers process jobs and notify users via WebSocket
// when complete. Jobs have retry logic with exponential backoff."

const { Queue, Worker } = require("bullmq");
const logger = require("../utils/logger");

const REDIS_URL = process.env.REDIS_URL || "redis://redis:6379";

// Parse Redis URL into connection options
const getRedisConnection = () => {
    try {
        const url = new URL(REDIS_URL);
        return {
            host: url.hostname,
            port: parseInt(url.port) || 6379,
        };
    } catch {
        return { host: "redis", port: 6379 };
    }
};

const connection = getRedisConnection();

// ─────────────────────────────────────────
// QUEUES — Define named queues for different job types
// ─────────────────────────────────────────
const resumeQueue = new Queue("resume-analysis", {
    connection,
    defaultJobOptions: {
        // Retry failed jobs up to 3 times
        attempts: 3,
        // Exponential backoff: wait 1s, then 2s, then 4s
        backoff: {
            type: "exponential",
            delay: 1000,
        },
        // Remove completed jobs after 24 hours (saves Redis memory)
        removeOnComplete: { age: 86400 },
        // Keep failed jobs for 7 days (for debugging)
        removeOnFail: { age: 604800 },
    },
});

// ─────────────────────────────────────────
// PRODUCER — Add jobs to the queue
// ─────────────────────────────────────────
const addResumeJob = async (userId, resumeText, sessionId) => {
    try {
        const job = await resumeQueue.add("analyze", {
            userId,
            resumeText,
            sessionId,
            createdAt: new Date().toISOString(),
        });
        logger.info(`Resume analysis job queued: ${job.id} for user ${userId}`);
        return job.id;
    } catch (err) {
        logger.error("Failed to queue resume job:", err.message);
        throw err;
    }
};

// ─────────────────────────────────────────
// WORKER — Process jobs from the queue
// ─────────────────────────────────────────
let resumeWorker = null;

const startWorker = () => {
    resumeWorker = new Worker(
        "resume-analysis",
        async (job) => {
            logger.info(`Processing resume job ${job.id} (attempt ${job.attemptsMade + 1})`);

            const { resumeText, sessionId } = job.data;

            // Import here to avoid circular dependencies
            const { analyzeResume } = require("../services/resumeService");

            // Update progress (0-100) — frontend can poll this
            await job.updateProgress(10);

            // Run AI analysis
            const analysis = await analyzeResume(resumeText);
            await job.updateProgress(80);

            // Save results to the session
            const InterviewSession = require("../models/InterviewSession");
            await InterviewSession.findByIdAndUpdate(sessionId, {
                "resumeData.resumeAnalysis": analysis,
            });
            await job.updateProgress(100);

            logger.info(`Resume job ${job.id} completed successfully`);
            return { success: true, sessionId };
        },
        {
            connection,
            // Process 2 jobs at a time (don't overload AI API)
            concurrency: 2,
        }
    );

    // Worker event handlers
    resumeWorker.on("completed", (job) => {
        logger.info(`Job ${job.id} completed`);
    });

    resumeWorker.on("failed", (job, err) => {
        logger.error(`Job ${job?.id} failed: ${err.message}`);
    });

    logger.info("Resume analysis worker started");
    return resumeWorker;
};

// Graceful shutdown
const closeQueues = async () => {
    if (resumeWorker) await resumeWorker.close();
    await resumeQueue.close();
    logger.info("Message queues closed");
};

module.exports = {
    resumeQueue,
    addResumeJob,
    startWorker,
    closeQueues,
};
