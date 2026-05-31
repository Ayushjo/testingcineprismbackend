import { Response } from "express";
import { AuthorizedRequest } from "../middlewares/extractUser.js";
import client from "../index.js";
import logger from "../logger.js";
import { queueBulkEmails } from "../queues/emailQueue.js";
import {
  buildCampaignEmail,
  CampaignContent,
} from "../helpers/emailTemplate.js";
import { EmailJobData } from "../types/newsletter.types.js";
import { getFromCache, setCache, deleteCache } from "../config/redis.js";

// ── Auth guard ────────────────────────────────────────────────────────────────

function requireAdmin(req: AuthorizedRequest, res: Response): boolean {
  if (!req.user || req.user.role !== "ADMIN") {
    res.status(403).json({ error: "Admin access required" });
    return false;
  }
  return true;
}

// ── POST /api/v1/admin/newsletter/campaigns ───────────────────────────────────

export const createCampaign = async (
  req: AuthorizedRequest,
  res: Response,
) => {
  if (!requireAdmin(req, res)) return;

  const { planId, subject, previewText, content, scheduledAt } = req.body;

  if (!planId || !subject || !content) {
    return res
      .status(400)
      .json({ error: "planId, subject and content are required" });
  }

  try {
    const plan = await client.newsletterPlan.findUnique({ where: { id: planId } });
    if (!plan) return res.status(404).json({ error: "Plan not found" });

    const campaign = await client.newsletterCampaign.create({
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
    await deleteCache("newsletter:campaigns");

    logger.info(`Campaign created: ${campaign.id} for plan ${plan.name}`);
    return res.status(201).json({ campaign });
  } catch (error: any) {
    logger.error(`createCampaign error: ${error.message}`);
    return res.status(500).json({ error: "Failed to create campaign" });
  }
};

// ── POST /api/v1/admin/newsletter/campaigns/:id/send ─────────────────────────

export const sendCampaign = async (req: AuthorizedRequest, res: Response) => {
  if (!requireAdmin(req, res)) return;

  const { id } = req.params;

  try {
    const campaign = await client.newsletterCampaign.findUnique({
      where: { id },
      include: { plan: true },
    });

    if (!campaign) return res.status(404).json({ error: "Campaign not found" });
    if (campaign.status === "SENT") {
      return res.status(409).json({ error: "Campaign already sent" });
    }
    if (campaign.status === "SENDING") {
      return res.status(409).json({ error: "Campaign is already sending" });
    }

    // Mark as SENDING immediately so duplicate requests are rejected
    await client.newsletterCampaign.update({
      where: { id },
      data: { status: "SENDING" },
    });

    // Fetch active subscribers on this campaign's specific plan
    const subscribers = await client.newsletterSubscriber.findMany({
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
      await client.newsletterCampaign.update({
        where: { id },
        data: { status: "SENT", sentAt: new Date(), totalRecipients: 0 },
      });
      logger.info(`Campaign ${id}: no active subscribers, marked SENT`);
      return res.status(200).json({
        queued: 0,
        message: "No active subscribers found for this plan. Campaign marked as sent with zero recipients.",
      });
    }

    // Create one email log row per subscriber
    await client.newsletterEmailLog.createMany({
      data: subscribers.map((s) => ({
        subscriberId: s.id,
        campaignId: id,
        status: "QUEUED" as const,
      })),
      skipDuplicates: true,
    });

    await client.newsletterCampaign.update({
      where: { id },
      data: { totalRecipients: subscribers.length },
    });

    // Build HTML once — the template has no per-subscriber content.
    // The worker injects the personalised {{UNSUBSCRIBE_URL}} at send time.
    const content = campaign.content as CampaignContent;
    const baseHtml = buildCampaignEmail(
      content,
      campaign.previewText ?? undefined,
      campaign.subject,
    );

    const jobs: EmailJobData[] = subscribers.map((s) => ({
      subscriberId: s.id,
      campaignId: id,
      email: s.email,
      name: s.name,
      subject: campaign.subject,
      htmlContent: baseHtml,
      unsubscribeToken: s.unsubscribeToken,
    }));

    await queueBulkEmails(jobs);

    await client.newsletterCampaign.update({
      where: { id },
      data: { status: "SENT", sentAt: new Date() },
    });

    // Invalidate campaign list and stats caches
    await Promise.all([
      deleteCache("newsletter:campaigns"),
      deleteCache("newsletter:stats"),
    ]);

    logger.info(
      `Campaign ${id} queued ${subscribers.length} emails (plan: ${campaign.plan.name})`,
    );
    return res.status(200).json({ queued: subscribers.length });
  } catch (error: any) {
    // Roll back status so admin can retry
    await client.newsletterCampaign
      .update({ where: { id }, data: { status: "DRAFT" } })
      .catch(() => {});
    logger.error(`sendCampaign error: ${error.message}`);
    return res.status(500).json({ error: "Failed to send campaign" });
  }
};

// ── GET /api/v1/admin/newsletter/campaigns ────────────────────────────────────

export const listCampaigns = async (req: AuthorizedRequest, res: Response) => {
  if (!requireAdmin(req, res)) return;

  try {
    const cached = await getFromCache("newsletter:campaigns");
    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }

    const campaigns = await client.newsletterCampaign.findMany({
      orderBy: { createdAt: "desc" },
      include: { plan: { select: { name: true, type: true } } },
    });

    const result = { campaigns };
    await setCache("newsletter:campaigns", JSON.stringify(result), 60);
    return res.status(200).json(result);
  } catch (error: any) {
    logger.error(`listCampaigns error: ${error.message}`);
    return res.status(500).json({ error: "Failed to fetch campaigns" });
  }
};

// ── GET /api/v1/admin/newsletter/campaigns/:id ────────────────────────────────

export const getCampaign = async (req: AuthorizedRequest, res: Response) => {
  if (!requireAdmin(req, res)) return;

  try {
    const campaign = await client.newsletterCampaign.findUnique({
      where: { id: req.params.id },
      include: { plan: { select: { name: true, type: true } } },
    });
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });
    return res.status(200).json({ campaign });
  } catch (error: any) {
    logger.error(`getCampaign error: ${error.message}`);
    return res.status(500).json({ error: "Failed to fetch campaign" });
  }
};

// ── GET /api/v1/admin/newsletter/subscribers ──────────────────────────────────

export const listSubscribers = async (
  req: AuthorizedRequest,
  res: Response,
) => {
  if (!requireAdmin(req, res)) return;

  const page = Math.max(1, parseInt(String(req.query.page || "1"), 10));
  const limit = 20;
  const skip = (page - 1) * limit;
  const status = req.query.status as string | undefined;
  const search = req.query.search as string | undefined;

  try {
    const where = {
      ...(status ? { status: status as any } : {}),
      ...(search ? { email: { contains: search, mode: "insensitive" as const } } : {}),
    };

    const [subscribers, total] = await Promise.all([
      client.newsletterSubscriber.findMany({
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
      client.newsletterSubscriber.count({ where }),
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
  } catch (error: any) {
    logger.error(`listSubscribers error: ${error.message}`);
    return res.status(500).json({ error: "Failed to fetch subscribers" });
  }
};

// ── GET /api/v1/admin/newsletter/stats ───────────────────────────────────────

export const getStats = async (req: AuthorizedRequest, res: Response) => {
  if (!requireAdmin(req, res)) return;

  try {
    const cached = await getFromCache("newsletter:stats");
    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalSubscribers,
      activeSubscribers,
      churnedThisMonth,
      revenueResult,
      totalCampaigns,
      bouncedLogs,
      sentLogs,
    ] = await Promise.all([
      client.newsletterSubscriber.count(),
      client.newsletterSubscriber.count({ where: { status: "ACTIVE" } }),
      client.newsletterSubscriber.count({
        where: {
          status: { in: ["CANCELED", "UNSUBSCRIBED"] as any[] },
          updatedAt: { gte: startOfMonth },
        },
      }),
      client.newsletterPayment.aggregate({
        _sum: { amount: true },
        where: {
          status: "PAID",
          paidAt: { gte: startOfMonth },
        },
      }),
      client.newsletterCampaign.count(),
      client.newsletterEmailLog.count({ where: { status: "BOUNCED" } }),
      client.newsletterEmailLog.count({
        where: { status: { in: ["SENT", "OPENED", "CLICKED"] as any[] } },
      }),
    ]);

    const bounceRate =
      sentLogs > 0
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

    await setCache("newsletter:stats", JSON.stringify(result), 300);
    return res.status(200).json(result);
  } catch (error: any) {
    logger.error(`getStats error: ${error.message}`);
    return res.status(500).json({ error: "Failed to fetch stats" });
  }
};
