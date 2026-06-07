import { Request, Response } from "express";
import Razorpay from "razorpay";
import client from "../index.js";
import logger from "../logger.js";
import { getFromCache, setCache, deleteCache } from "../config/redis.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export const getPlans = async (req: Request, res: Response) => {
  try {
    const cached = await getFromCache("newsletter:plans");
    if (cached) {
      return res.status(200).json(JSON.parse(cached));
    }

    const plans = await client.newsletterPlan.findMany({
      where: { isActive: true },
      orderBy: { amount: "asc" },
    });

    const result = { plans };
    await setCache("newsletter:plans", JSON.stringify(result), 3600);
    return res.status(200).json(result);
  } catch (error: any) {
    logger.error(`getPlans error: ${error.message}`);
    return res.status(500).json({ error: "Failed to fetch plans" });
  }
};

export const createCheckout = async (req: Request, res: Response) => {
  const { email, name, planId, country, userId } = req.body;

  if (!email || !planId || !country) {
    return res
      .status(400)
      .json({ error: "email, planId and country are required" });
  }

  try {
    const plan = await client.newsletterPlan.findUnique({
      where: { id: planId },
    });

    if (!plan || !plan.isActive) {
      return res.status(404).json({ error: "Plan not found or inactive" });
    }

    if (!plan.razorpayPlanId) {
      return res
        .status(500)
        .json({ error: "Plan not configured on Razorpay yet" });
    }

    // FIX 3: Clean up any stale PENDING checkout for this email + plan
    // (subscriber never completed payment, record is > 1 hour old)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const staleSubscription = await client.newsletterSubscription.findFirst({
      where: {
        planId,
        createdAt: { lt: oneHourAgo },
        subscriber: { email, status: "PENDING" },
      },
      select: { id: true },
    });
    if (staleSubscription) {
      await client.newsletterSubscription.delete({
        where: { id: staleSubscription.id },
      });
      logger.info(`Cleaned up stale PENDING subscription for ${email}`);
    }

    // Load subscriber AFTER cleanup so stale subscription is not included
    const existingSubscriber = await client.newsletterSubscriber.findUnique({
      where: { email },
      include: {
        subscriptions: {
          where: { planId },
        },
      },
    });

    // 409 only when BOTH subscriber AND subscription are genuinely active
    // (not an abandoned/pending checkout)
    if (
      existingSubscriber?.status === "ACTIVE" &&
      existingSubscriber?.subscriptions[0]?.status === "ACTIVE"
    ) {
      return res.status(409).json({ error: "Already subscribed to this plan" });
    }

    let subscriber = existingSubscriber;

    if (!subscriber) {
      // The stale cleanup may have deleted the subscription in a way that
      // also removed the subscriber (cascade). Before creating, check if a
      // subscriber already exists under the same userId (Google account) so
      // we don't hit a P2002 unique constraint on the userId field.
      if (userId) {
        const byUserId = await client.newsletterSubscriber.findUnique({
          where: { userId },
          include: { subscriptions: { where: { planId } } },
        });
        if (byUserId) {
          subscriber = byUserId;
          logger.info(`Re-linked subscriber ${byUserId.id} via userId for ${email}`);
        }
      }
    }

    if (!subscriber) {
      try {
        subscriber = await client.newsletterSubscriber.create({
          data: {
            email,
            name,
            userId: userId || null,
            country,
            provider: "RAZORPAY",
            status: "PENDING",
          },
          include: { subscriptions: true },
        });
      } catch (createErr: any) {
        // P2002 on userId — another record already owns this userId.
        // Recover by fetching that record and using it.
        if (createErr.code === "P2002" && createErr.meta?.target?.includes("userId") && userId) {
          logger.warn(`P2002 on userId during subscriber create for ${email}, recovering`);
          subscriber = await client.newsletterSubscriber.findUnique({
            where: { userId },
            include: { subscriptions: { where: { planId } } },
          });
          if (!subscriber) throw createErr; // genuinely unrecoverable
        } else {
          throw createErr;
        }
      }
    }

    // Guard: after ALL subscriber-determination paths (email lookup, userId re-link,
    // or fresh create), verify the plan subscription state before hitting Razorpay.
    // The initial 409 check only ran against `existingSubscriber` (by email); a
    // userId-re-linked subscriber could still carry an existing subscription here.
    //
    // IMPORTANT: mirror the same dual-condition as the original 409 check above.
    // A subscription row is created with status="ACTIVE" at checkout initiation —
    // the subscriber row only becomes "ACTIVE" after the Razorpay webhook confirms
    // payment. So subscriber.status="PENDING" + subscription.status="ACTIVE" means
    // an incomplete (never-paid) checkout, NOT an active subscription.
    if (subscriber?.subscriptions?.length) {
      const existingSub = subscriber.subscriptions[0];
      if (subscriber.status === "ACTIVE" && existingSub.status === "ACTIVE") {
        // Both confirmed ACTIVE — genuine duplicate subscription attempt
        return res.status(409).json({ error: "Already subscribed to this plan" });
      }
      // Subscriber still PENDING (payment never completed) — stale record, clear it
      await client.newsletterSubscription.delete({ where: { id: existingSub.id } });
      logger.info(
        `Cleared stale checkout (subscriber:${subscriber.status} / sub:${existingSub.status}) ` +
        `subscription ${existingSub.id} for subscriber ${subscriber.id}`,
      );
    }

    // FIX 1: Handle "customer already exists" gracefully
    let razorpayCustomer: { id?: string } | null = null;
    try {
      razorpayCustomer = await razorpay.customers.create({
        name: name || email,
        email,
        fail_existing: 0,
      });
    } catch (customerError: any) {
      const isAlreadyExists =
        customerError?.error?.code === "BAD_REQUEST_ERROR" &&
        customerError?.error?.description
          ?.toLowerCase()
          .includes("already exists");

      if (isAlreadyExists) {
        logger.warn(
          `Razorpay customer already exists for ${email}, fetching existing`,
        );
        try {
          const existing = await (razorpay.customers as any).all({ email });
          razorpayCustomer = existing?.items?.[0] ?? { id: undefined };
        } catch (fetchError: any) {
          logger.warn(
            `Failed to fetch existing Razorpay customer for ${email}: ${JSON.stringify(fetchError)}`,
          );
          razorpayCustomer = { id: undefined };
        }
      } else {
        throw customerError;
      }
    }

    const frontendUrl = (process.env.FRONTEND_URL || "").replace(/\/$/, "");

    const razorpaySubscription = await (razorpay.subscriptions as any).create({
      plan_id: plan.razorpayPlanId,
      customer_notify: 1,
      quantity: 1,
      total_count: plan.billingInterval === "YEARLY" ? 12 : 120,
      addons: [],
      notes: {
        subscriberId: subscriber!.id,
        planId: plan.id,
        email,
      },
      // callback_url is NOT a valid field on subscriptions.create() —
      // Razorpay returns BAD_REQUEST_ERROR if it is included.
      // The redirect URL after hosted checkout is configured in the
      // Razorpay Dashboard under Settings → Checkout → Redirect URL.
    });

    try {
      await client.newsletterSubscription.create({
        data: {
          subscriberId: subscriber!.id,
          planId: plan.id,
          provider: "RAZORPAY",
          status: "ACTIVE",
          razorpayCustomerId: razorpayCustomer?.id ?? undefined,
          razorpaySubscriptionId: razorpaySubscription.id,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(),
        },
      });
    } catch (subErr: any) {
      // Race-condition safety net: if a subscription record snuck in between our
      // delete and this create (P2002 on subscriberId+planId), update it in-place.
      if (subErr.code === "P2002") {
        logger.warn(
          `P2002 on subscription create for subscriber ${subscriber!.id} — updating existing record`,
        );
        await client.newsletterSubscription.updateMany({
          where: { subscriberId: subscriber!.id, planId: plan.id },
          data: {
            provider: "RAZORPAY",
            status: "ACTIVE",
            razorpayCustomerId: razorpayCustomer?.id ?? undefined,
            razorpaySubscriptionId: razorpaySubscription.id,
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(),
          },
        });
      } else {
        throw subErr;
      }
    }

    logger.info(
      `Checkout created for ${email}, subscription: ${razorpaySubscription.id}`,
    );

    return res.status(200).json({
      subscriptionId: razorpaySubscription.id,
      checkoutUrl: razorpaySubscription.short_url,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error: any) {
    console.error(error);
    logger.error(`createCheckout error: ${JSON.stringify(error)}`);
    return res.status(500).json({ error: "Failed to create checkout" });
  }
};

export const unsubscribe = async (req: Request, res: Response) => {
  const { token } = req.query;

  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "Invalid unsubscribe token" });
  }

  try {
    const subscriber = await client.newsletterSubscriber.findUnique({
      where: { unsubscribeToken: token },
      include: { subscriptions: true },
    });

    if (!subscriber) {
      return res.status(404).json({ error: "Subscriber not found" });
    }

    if (subscriber.status === "UNSUBSCRIBED") {
      return res.status(200).json({ message: "Already unsubscribed" });
    }

    for (const sub of subscriber.subscriptions) {
      if (sub.razorpaySubscriptionId && sub.status === "ACTIVE") {
        try {
          await (razorpay.subscriptions as any).cancel(
            sub.razorpaySubscriptionId,
            {
              cancel_at_cycle_end: 1,
            },
          );
        } catch (rzpError: any) {
          logger.warn(
            `Failed to cancel Razorpay subscription ${sub.razorpaySubscriptionId}: ${rzpError.message}`,
          );
        }
      }

      await client.newsletterSubscription.update({
        where: { id: sub.id },
        data: {
          cancelAtPeriodEnd: true,
          canceledAt: new Date(),
        },
      });
    }

    await client.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: {
        status: "UNSUBSCRIBED",
        unsubscribedAt: new Date(),
      },
    });

    logger.info(`Subscriber unsubscribed: ${subscriber.email}`);

    return res.status(200).json({ message: "Successfully unsubscribed" });
  } catch (error: any) {
    logger.error(`unsubscribe error: ${error.message}`);
    return res.status(500).json({ error: "Failed to unsubscribe" });
  }
};

export const getSubscriptionStatusById = async (
  req: Request,
  res: Response,
) => {
  const { razorpaySubscriptionId } = req.params;

  try {
    const subscription = await client.newsletterSubscription.findUnique({
      where: { razorpaySubscriptionId },
      include: {
        plan: true,
        subscriber: { select: { email: true, status: true } },
      },
    });

    if (!subscription) {
      return res.status(404).json({ error: "Subscription not found" });
    }

    return res.status(200).json({
      status: subscription.status,
      subscriberStatus: subscription.subscriber.status,
      planName: subscription.plan.name,
      planType: subscription.plan.type,
      subscriberEmail: subscription.subscriber.email,
      currentPeriodEnd: subscription.currentPeriodEnd,
    });
  } catch (error: any) {
    logger.error(`getSubscriptionStatusById error: ${error.message}`);
    return res
      .status(500)
      .json({ error: "Failed to fetch subscription status" });
  }
};

export const getSubscriberStatus = async (req: Request, res: Response) => {
  const { email } = req.params;

  try {
    const subscriber = await client.newsletterSubscriber.findUnique({
      where: { email },
      include: {
        subscriptions: {
          include: { plan: true },
        },
      },
    });

    if (!subscriber) {
      return res.status(404).json({ error: "Subscriber not found" });
    }

    return res.status(200).json({
      status: subscriber.status,
      subscriptions: subscriber.subscriptions.map((sub) => ({
        planName: sub.plan.name,
        planType: sub.plan.type,
        status: sub.status,
        currentPeriodEnd: sub.currentPeriodEnd,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      })),
    });
  } catch (error: any) {
    logger.error(`getSubscriberStatus error: ${error.message}`);
    return res.status(500).json({ error: "Failed to fetch status" });
  }
};
