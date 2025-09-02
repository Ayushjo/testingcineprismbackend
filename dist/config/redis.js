"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCache = exports.setCache = exports.getFromCache = void 0;
const redis_1 = require("redis");
const redisClient = (0, redis_1.createClient)({
    url: process.env.REDIS_URL,
    socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 1000),
    },
});
redisClient.on("error", (err) => {
    console.log("Redis Client Error:", err);
});
redisClient.on("connect", () => {
    console.log("✅ Connected to Railway Redis");
});
let isRedisConnected = false;
redisClient
    .connect()
    .then(() => {
    isRedisConnected = true;
    console.log("Redis connection established");
})
    .catch((err) => {
    console.error("❌ Failed to connect to Redis:", err);
    isRedisConnected = false;
});
const getFromCache = async (key) => {
    if (!isRedisConnected)
        return null;
    try {
        return await redisClient.get(key);
    }
    catch (error) {
        console.error("Cache get error:", error);
        return null;
    }
};
exports.getFromCache = getFromCache;
const setCache = async (key, value, ttl) => {
    if (!isRedisConnected)
        return;
    try {
        await redisClient.setEx(key, ttl, value);
    }
    catch (error) {
        console.error("Cache set error:", error);
    }
};
exports.setCache = setCache;
const deleteCache = async (key) => {
    if (!isRedisConnected)
        return;
    try {
        await redisClient.del(key);
    }
    catch (error) {
        console.error("Cache delete error:", error);
    }
};
exports.deleteCache = deleteCache;
exports.default = redisClient;
