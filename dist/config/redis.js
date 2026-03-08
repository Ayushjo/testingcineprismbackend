"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearAllCache = exports.deleteCachePattern = exports.getCacheInfo = exports.getAllCacheKeys = exports.deleteCache = exports.getFromCache = exports.setCache = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const redisClient = new ioredis_1.default({
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
    tls: {}, // AWS Serverless Redis requires TLS
    enableReadyCheck: false, // Serverless Redis does NOT support CLUSTER commands
    maxRetriesPerRequest: null,
    retryStrategy(times) {
        return Math.min(times * 200, 2000);
    },
});
// Logs
redisClient.on("connect", () => {
    console.log("✅ Connected to AWS Serverless Redis");
});
redisClient.on("error", (err) => {
    // Serverless Redis returns MOVED replies sometimes — ignore them
    if (err?.message?.includes("MOVED")) {
        console.warn("⚠️ Ignoring MOVED redirect (expected for AWS Serverless Redis)");
        return;
    }
    console.error("❌ Redis error:", err);
});
// ---------- CACHING HELPERS ----------
const setCache = async (key, value, ttl) => {
    try {
        if (ttl) {
            await redisClient.setex(key, ttl, value);
        }
        else {
            await redisClient.set(key, value);
        }
    }
    catch (error) {
        console.error("Cache set error:", error);
    }
};
exports.setCache = setCache;
const getFromCache = async (key) => {
    try {
        return await redisClient.get(key);
    }
    catch (error) {
        console.error("Cache get error:", error);
        return null;
    }
};
exports.getFromCache = getFromCache;
const deleteCache = async (key) => {
    try {
        await redisClient.del(key);
    }
    catch (error) {
        console.error("Cache delete error:", error);
    }
};
exports.deleteCache = deleteCache;
const getAllCacheKeys = async () => {
    try {
        return await redisClient.keys("*");
    }
    catch (error) {
        console.error("Get keys error:", error);
        return [];
    }
};
exports.getAllCacheKeys = getAllCacheKeys;
const getCacheInfo = async (key) => {
    try {
        const value = await redisClient.get(key);
        const ttl = await redisClient.ttl(key);
        return {
            key,
            size: value ? Buffer.byteLength(value, "utf8") : 0,
            ttl: ttl === -1 ? "No expiry" : ttl === -2 ? "Expired" : `${ttl}s`,
            preview: value ? value.substring(0, 100) + "..." : null,
        };
    }
    catch (error) {
        console.error("Get cache info error:", error);
        return null;
    }
};
exports.getCacheInfo = getCacheInfo;
const deleteCachePattern = async (pattern) => {
    try {
        const keys = await redisClient.keys(pattern);
        if (keys.length === 0)
            return 0;
        await redisClient.del(...keys);
        return keys.length;
    }
    catch (error) {
        console.error("Delete pattern error:", error);
        return 0;
    }
};
exports.deleteCachePattern = deleteCachePattern;
const clearAllCache = async () => {
    try {
        await redisClient.flushdb();
    }
    catch (error) {
        console.error("Clear all cache error:", error);
        throw error;
    }
};
exports.clearAllCache = clearAllCache;
exports.default = redisClient;
