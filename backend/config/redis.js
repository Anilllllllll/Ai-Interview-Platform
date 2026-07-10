// ============================================
// Redis Cache Utility
// ============================================
// Provides simple get/set/delete operations for caching.
//
// HOW CACHING WORKS:
// 1. Request comes in for user profile
// 2. Check Redis: "Do I have this cached?" 
//    → YES: Return cached data (1ms) ⚡
//    → NO: Query MongoDB (50ms), store in Redis, return data
// 3. Next request gets the cached version
//
// TTL (Time To Live): Cached data expires after N seconds.
// This ensures data doesn't become stale.

const { createClient } = require("redis");
const logger = require("../utils/logger");

// Redis connection URL — uses Docker service name 'redis'
const REDIS_URL = process.env.REDIS_URL || "redis://redis:6379";

let client = null;

// ─────────────────────────────────────────
// CONNECT TO REDIS
// ─────────────────────────────────────────
const connectRedis = async () => {
    try {
        client = createClient({ url: REDIS_URL });

        client.on("error", (err) => {
            logger.error("Redis connection error:", err.message);
        });

        client.on("connect", () => {
            logger.info(`Redis connected at ${REDIS_URL}`);
        });

        await client.connect();
        return client;
    } catch (error) {
        logger.error("Failed to connect to Redis:", error.message);
        // App still works without Redis — just no caching
        // This is called "graceful degradation"
        return null;
    }
};

// ─────────────────────────────────────────
// GET: Read from cache
// ─────────────────────────────────────────
// Returns parsed JSON data or null if not cached
const getCache = async (key) => {
    try {
        if (!client || !client.isOpen) return null;
        const data = await client.get(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        logger.error(`Redis GET error for key ${key}:`, error.message);
        return null; // Fail silently — app works without cache
    }
};

// ─────────────────────────────────────────
// SET: Write to cache with TTL
// ─────────────────────────────────────────
// ttl = seconds until this cache entry expires
// Default: 300 seconds (5 minutes)
const setCache = async (key, data, ttl = 300) => {
    try {
        if (!client || !client.isOpen) return false;
        await client.setEx(key, ttl, JSON.stringify(data));
        return true;
    } catch (error) {
        logger.error(`Redis SET error for key ${key}:`, error.message);
        return false;
    }
};

// ─────────────────────────────────────────
// DELETE: Remove from cache (cache invalidation)
// ─────────────────────────────────────────
// Call this when data changes (e.g., user updates profile)
// so the next request fetches fresh data from MongoDB
const deleteCache = async (key) => {
    try {
        if (!client || !client.isOpen) return false;
        await client.del(key);
        return true;
    } catch (error) {
        logger.error(`Redis DEL error for key ${key}:`, error.message);
        return false;
    }
};

// Delete all keys matching a pattern
// Example: deletePattern("user:*") clears all user caches
const deletePattern = async (pattern) => {
    try {
        if (!client || !client.isOpen) return false;
        const keys = await client.keys(pattern);
        if (keys.length > 0) {
            await client.del(keys);
        }
        return true;
    } catch (error) {
        logger.error(`Redis DEL pattern error for ${pattern}:`, error.message);
        return false;
    }
};

module.exports = {
    connectRedis,
    getCache,
    setCache,
    deleteCache,
    deletePattern,
    getClient: () => client,
};
