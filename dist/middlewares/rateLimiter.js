"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimiter = void 0;
// Simple in-memory rate limiter (for production, use Redis)
const rateLimitStore = new Map();
const createRateLimiter = (maxRequests, windowMs) => {
    return (req, res, next) => {
        const key = req.user?.id || req.ip;
        const now = Date.now();
        const userLimit = rateLimitStore.get(key);
        if (!userLimit || now > userLimit.resetTime) {
            // Reset or create new limit
            rateLimitStore.set(key, {
                count: 1,
                resetTime: now + windowMs,
            });
            return next();
        }
        if (userLimit.count >= maxRequests) {
            return res.status(429).json({
                success: false,
                message: "Too many requests. Please try again later.",
            });
        }
        userLimit.count++;
        next();
    };
};
exports.rateLimiter = {
    createComment: createRateLimiter(10, 60 * 60 * 1000), // 10 per hour
    createReply: createRateLimiter(20, 60 * 60 * 1000), // 20 per hour
    toggleLike: createRateLimiter(100, 60 * 60 * 1000), // 100 per hour
};
