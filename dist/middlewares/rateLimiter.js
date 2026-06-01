"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.plansLimiter = exports.adminLimiter = exports.checkoutLimiter = exports.authLimiter = exports.globalLimiter = exports.rateLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const logger_js_1 = __importDefault(require("../logger.js"));
// ─── EXISTING: Custom in-memory rate limiter ───────────────────────────────
// Used by postRoutes.ts and articleRoutes.ts for per-user comment/like limits.
// DO NOT modify — changing this would break existing behaviour.
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
// ─── NEW: express-rate-limit based IP limiters ─────────────────────────────
//
// Trust proxy: app.set("trust proxy", 1) is already set in index.ts.
// This makes req.ip the real client IP from X-Forwarded-For (Cloudflare passes
// the real IP in that header). All limiters below key on req.ip automatically.
//
// Double-limiting policy: the globalLimiter's skip() function excludes every
// route that has its own dedicated tier limiter. This means no request is ever
// counted against two separate windows simultaneously.
//
// TESTING INSTRUCTIONS (run against local or staging):
//   Global  — send 201 rapid requests to any non-skipped endpoint; 201st → 429
//   Auth    — send 21 requests to /api/v1/auth/*; 21st → 429
//   Checkout— send 6 POST requests to /api/v1/newsletter/checkout; 6th → 429
//   Admin   — send 101 requests to /api/v1/admin/*; 101st → 429
//   Plans   — send 61 requests to GET /api/v1/newsletter/plans; 61st → 429
//   Webhooks— send 300 requests to /api/v1/webhooks/razorpay; ALL pass through
//             (will return 400 for bad signature, but NEVER 429)
// ── TIER 1 — Global ────────────────────────────────────────────────────────
// 200 req / 15 min applied to everything that doesn't have its own limiter.
// Applied in index.ts right after CORS and the OPTIONS handler.
// The skip function is the single source of truth for the webhook exemption.
exports.globalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 200,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        const path = req.path;
        // Webhooks MUST never be rate-limited — Razorpay and AWS SNS are automated
        // callers; a 429 here would permanently break payment processing.
        // Auth, admin, and specific newsletter routes are skipped because they
        // carry their own more-appropriate tier limiters (prevents double-counting).
        return (path.startsWith("/api/v1/webhooks") ||
            path.startsWith("/api/v1/auth") ||
            path.startsWith("/api/v1/admin") ||
            path === "/api/v1/newsletter/checkout" ||
            path === "/api/v1/newsletter/plans");
    },
    handler: (req, res) => {
        logger_js_1.default.warn(`Rate limit exceeded: ${req.ip} on ${req.path}`);
        res
            .status(429)
            .json({ error: "Too many requests, please try again later." });
    },
});
// ── TIER 2 — Auth ──────────────────────────────────────────────────────────
// 20 req / 15 min. Applied via router.use() in authRoutes.ts.
// Tight limit because OAuth redirect chains count each hop and the endpoint
// triggers external Google calls — low burst tolerance is intentional.
exports.authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger_js_1.default.warn(`Rate limit exceeded: ${req.ip} on ${req.path}`);
        res
            .status(429)
            .json({ error: "Too many auth attempts, please try again." });
    },
});
// ── TIER 3 — Newsletter checkout ───────────────────────────────────────────
// 5 req / hour. Applied only on POST /checkout in newsletterRoutes.ts.
// Each call creates a Razorpay customer + subscription — very expensive.
// 5 attempts per hour is generous for a legitimate user; blocks brute-force.
exports.checkoutLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000, // 1 hour
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger_js_1.default.warn(`Rate limit exceeded: ${req.ip} on ${req.path}`);
        res
            .status(429)
            .json({
            error: "Too many subscription attempts. Please try again in an hour.",
        });
    },
});
// ── TIER 4 — Admin ─────────────────────────────────────────────────────────
// 100 req / 15 min. Applied via router.use() in adminRoutes.ts and
// newsletterAdminRoutes.ts. Both files mount under /api/v1/admin/* so both
// need the limiter; the global limiter skips the entire /api/v1/admin prefix.
exports.adminLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger_js_1.default.warn(`Rate limit exceeded: ${req.ip} on ${req.path}`);
        res.status(429).json({ error: "Too many admin requests." });
    },
});
// ── TIER 5 — Newsletter plans ──────────────────────────────────────────────
// 60 req / 1 min. Applied only on GET /plans in newsletterRoutes.ts.
// This endpoint is cached in Redis (TTL 3600s) so real DB hits are rare.
// 60/min is generous enough for normal polling, blocks sustained scrapers.
exports.plansLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1 minute
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger_js_1.default.warn(`Rate limit exceeded: ${req.ip} on ${req.path}`);
        res
            .status(429)
            .json({ error: "Too many requests, please try again later." });
    },
});
