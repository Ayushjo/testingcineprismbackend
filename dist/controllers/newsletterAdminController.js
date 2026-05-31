"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStats = exports.listSubscribers = exports.getCampaign = exports.listCampaigns = exports.sendCampaign = exports.createCampaign = void 0;
const index_js_1 = __importDefault(require("../index.js"));
const logger_js_1 = __importDefault(require("../logger.js"));
const emailQueue_js_1 = require("../queues/emailQueue.js");
const emailTemplate_js_1 = require("../helpers/emailTemplate.js");
const redis_js_1 = require("../config/redis.js");
// ── Auth guard ────────────────────────────────────────────────────────────────
function requireAdmin(req, res) {
    if (!req.user || req.user.role !== "ADMIN") {
        res.status(403).json({ error: "Admin access required" });
        return false;
    }
    return true;
}
// ── POST /api/v1/admin/newsletter/campaigns ───────────────────────────────────
const createCampaign = async (req, res) => {
    if (!requireAdmin(req, res))
        return;
    const { planId, subject, previewText, content, scheduledAt } = req.body;
    if (!planId || !subject || !content) {
        return res
            .status(400)
            .json({ error: "planId, subject and content are required" });
    }
    try {
        const plan = await index_js_1.default.newsletterPlan.findUnique({ where: { id: planId } });
        if (!plan)
            return res.status(404).json({ error: "Plan not found" });
        const campaign = await index_js_1.default.newsletterCampaign.create({
            data: {
                planId,
                subject,
                previewText: previewText || null,
                content,
                status: "DRAFT",
                scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
            },
            include: { plan: true },
        });
        // Invalidate campaign list cache
        await (0, redis_js_1.deleteCache)("newsletter:campaigns");
        logger_js_1.default.info(`Campaign created: ${campaign.id} for plan ${plan.name}`);
        return res.status(201).json({ campaign });
    }
    catch (error) {
        logger_js_1.default.error(`createCampaign error: ${error.message}`);
        return res.status(500).json({ error: "Failed to create campaign" });
    }
};
exports.createCampaign = createCampaign;
// ── POST /api/v1/admin/newsletter/campaigns/:id/send ─────────────────────────
const sendCampaign = async (req, res) => {
    if (!requireAdmin(req, res))
        return;
    const { id } = req.params;
    try {
        const campaign = await index_js_1.default.newsletterCampaign.findUnique({
            where: { id },
            include: { plan: true },
        });
        if (!campaign)
            return res.status(404).json({ error: "Campaign not found" });
        if (campaign.status === "SENT") {
            return res.status(409).json({ error: "Campaign already sent" });
        }
        if (campaign.status === "SENDING") {
            return res.status(409).json({ error: "Campaign is already sending" });
        }
        // Mark as SENDING immediately so duplicate requests are rejected
        await index_js_1.default.newsletterCampaign.update({
            where: { id },
            data: { status: "SENDING" },
        });
        // Fetch active subscribers on this campaign's specific plan
        const subscribers = await index_js_1.default.newsletterSubscriber.findMany({
            where: {
                status: "ACTIVE",
                subscriptions: {
                    some: {
                        status: "ACTIVE",
                        planId: campaign.planId,
                    },
                },
            },
            select: {
                id: true,
                email: true,
                name: true,
                unsubscribeToken: true,
            },
        });
        if (subscribers.length === 0) {
            await index_js_1.default.newsletterCampaign.update({
                where: { id },
                data: { status: "SENT", sentAt: new Date(), totalRecipients: 0 },
            });
            logger_js_1.default.info(`Campaign ${id}: no active subscribers, marked SENT`);
            return res.status(200).json({
                queued: 0,
                message: "No active subscribers found for this plan. Campaign marked as sent with zero recipients.",
            });
        }
        // Create one email log row per subscriber
        await index_js_1.default.newsletterEmailLog.createMany({
            data: subscribers.map((s) => ({
                subscriberId: s.id,
                campaignId: id,
                status: "QUEUED",
            })),
            skipDuplicates: true,
        });
        await index_js_1.default.newsletterCampaign.update({
            where: { id },
            data: { totalRecipients: subscribers.length },
        });
        // Build HTML once — the template has no per-subscriber content.
        // The worker injects the personalised {{UNSUBSCRIBE_URL}} at send time.
        const content = campaign.content;
        const baseHtml = (0, emailTemplate_js_1.buildCampaignEmail)(content, campaign.previewText ?? undefined, campaign.subject);
        const jobs = subscribers.map((s) => ({
            subscriberId: s.id,
            campaignId: id,
            email: s.email,
            name: s.name,
            subject: campaign.subject,
            htmlContent: baseHtml,
            unsubscribeToken: s.unsubscribeToken,
        }));
        await (0, emailQueue_js_1.queueBulkEmails)(jobs);
        await index_js_1.default.newsletterCampaign.update({
            where: { id },
            data: { status: "SENT", sentAt: new Date() },
        });
        // Invalidate campaign list and stats caches
        await Promise.all([
            (0, redis_js_1.deleteCache)("newsletter:campaigns"),
            (0, redis_js_1.deleteCache)("newsletter:stats"),
        ]);
        logger_js_1.default.info(`Campaign ${id} queued ${subscribers.length} emails (plan: ${campaign.plan.name})`);
        return res.status(200).json({ queued: subscribers.length });
    }
    catch (error) {
        // Roll back status so admin can retry
        await index_js_1.default.newsletterCampaign
            .update({ where: { id }, data: { status: "DRAFT" } })
            .catch(() => { });
        logger_js_1.default.error(`sendCampaign error: ${error.message}`);
        return res.status(500).json({ error: "Failed to send campaign" });
    }
};
exports.sendCampaign = sendCampaign;
// ── GET /api/v1/admin/newsletter/campaigns ────────────────────────────────────
const listCampaigns = async (req, res) => {
    if (!requireAdmin(req, res))
        return;
    try {
        const cached = await (0, redis_js_1.getFromCache)("newsletter:campaigns");
        if (cached) {
            return res.status(200).json(JSON.parse(cached));
        }
        const campaigns = await index_js_1.default.newsletterCampaign.findMany({
            orderBy: { createdAt: "desc" },
            include: { plan: { select: { name: true, type: true } } },
        });
        const result = { campaigns };
        await (0, redis_js_1.setCache)("newsletter:campaigns", JSON.stringify(result), 60);
        return res.status(200).json(result);
    }
    catch (error) {
        logger_js_1.default.error(`listCampaigns error: ${error.message}`);
        return res.status(500).json({ error: "Failed to fetch campaigns" });
    }
};
exports.listCampaigns = listCampaigns;
// ── GET /api/v1/admin/newsletter/campaigns/:id ────────────────────────────────
const getCampaign = async (req, res) => {
    if (!requireAdmin(req, res))
        return;
    try {
        const campaign = await index_js_1.default.newsletterCampaign.findUnique({
            where: { id: req.params.id },
            include: { plan: { select: { name: true, type: true } } },
        });
        if (!campaign)
            return res.status(404).json({ error: "Campaign not found" });
        return res.status(200).json({ campaign });
    }
    catch (error) {
        logger_js_1.default.error(`getCampaign error: ${error.message}`);
        return res.status(500).json({ error: "Failed to fetch campaign" });
    }
};
exports.getCampaign = getCampaign;
// ── GET /api/v1/admin/newsletter/subscribers ──────────────────────────────────
const listSubscribers = async (req, res) => {
    if (!requireAdmin(req, res))
        return;
    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10));
    const limit = 20;
    const skip = (page - 1) * limit;
    const status = req.query.status;
    const search = req.query.search;
    try {
        const where = {
            ...(status ? { status: status } : {}),
            ...(search ? { email: { contains: search, mode: "insensitive" } } : {}),
        };
        const [subscribers, total] = await Promise.all([
            index_js_1.default.newsletterSubscriber.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
                include: {
                    subscriptions: {
                        include: { plan: { select: { name: true, type: true } } },
                    },
                },
            }),
            index_js_1.default.newsletterSubscriber.count({ where }),
        ]);
        return res.status(200).json({
            subscribers,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        logger_js_1.default.error(`listSubscribers error: ${error.message}`);
        return res.status(500).json({ error: "Failed to fetch subscribers" });
    }
};
exports.listSubscribers = listSubscribers;
// ── GET /api/v1/admin/newsletter/stats ───────────────────────────────────────
const getStats = async (req, res) => {
    if (!requireAdmin(req, res))
        return;
    try {
        const cached = await (0, redis_js_1.getFromCache)("newsletter:stats");
        if (cached) {
            return res.status(200).json(JSON.parse(cached));
        }
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const [totalSubscribers, activeSubscribers, churnedThisMonth, revenueResult, totalCampaigns, bouncedLogs, sentLogs,] = await Promise.all([
            index_js_1.default.newsletterSubscriber.count(),
            index_js_1.default.newsletterSubscriber.count({ where: { status: "ACTIVE" } }),
            index_js_1.default.newsletterSubscriber.count({
                where: {
                    status: { in: ["CANCELED", "UNSUBSCRIBED"] },
                    updatedAt: { gte: startOfMonth },
                },
            }),
            index_js_1.default.newsletterPayment.aggregate({
                _sum: { amount: true },
                where: {
                    status: "PAID",
                    paidAt: { gte: startOfMonth },
                },
            }),
            index_js_1.default.newsletterCampaign.count(),
            index_js_1.default.newsletterEmailLog.count({ where: { status: "BOUNCED" } }),
            index_js_1.default.newsletterEmailLog.count({
                where: { status: { in: ["SENT", "OPENED", "CLICKED"] } },
            }),
        ]);
        const bounceRate = sentLogs > 0
            ? Math.round((bouncedLogs / (sentLogs + bouncedLogs)) * 1000) / 10
            : 0;
        const result = {
            totalSubscribers,
            activeSubscribers,
            churnedThisMonth,
            revenueThisMonth: Number(revenueResult._sum.amount ?? 0),
            totalCampaigns,
            bounceRate,
        };
        await (0, redis_js_1.setCache)("newsletter:stats", JSON.stringify(result), 300);
        return res.status(200).json(result);
    }
    catch (error) {
        logger_js_1.default.error(`getStats error: ${error.message}`);
        return res.status(500).json({ error: "Failed to fetch stats" });
    }
};
exports.getStats = getStats;
