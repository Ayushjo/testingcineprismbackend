// middlewares/rateLimiter.ts
import { Request, Response, NextFunction } from "express";
import { AuthorizedRequest } from "./extractUser";

// Simple in-memory rate limiter (for production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

const createRateLimiter = (maxRequests: number, windowMs: number) => {
  return (req: AuthorizedRequest, res: Response, next: NextFunction) => {
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

export const rateLimiter = {
  createComment: createRateLimiter(10, 60 * 60 * 1000), // 10 per hour
  createReply: createRateLimiter(20, 60 * 60 * 1000), // 20 per hour
  toggleLike: createRateLimiter(100, 60 * 60 * 1000), // 100 per hour
};
