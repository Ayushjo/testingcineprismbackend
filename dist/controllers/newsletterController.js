"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSubscriberStatus = exports.getSubscriptionStatusById = exports.unsubscribe = exports.createCheckout = exports.getPlans = void 0;
const razorpay_1 = __importDefault(require("razorpay"));
const index_js_1 = __importDefault(require("../index.js"));
const logger_js_1 = __importDefault(require("../logger.js"));
const redis_js_1 = require("../config/redis.js");
const razorpay = new razorpay_1.default({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});
const getPlans = async (req, res) => {
    try {
        const cached = await (0, redis_js_1.getFromCache)("newsletter:plans");
        if (cached) {
            return res.status(200).json(JSON.parse(cached));
        }
        const plans = await index_js_1.default.newsletterPlan.findMany({
            where: { isActive: true },
            orderBy: { amount: "asc" },
        });
        const result = { plans };
        await (0, redis_js_1.setCache)("newsletter:plans", JSON.stringify(result), 3600);
        return res.status(200).json(result);
    }
    catch (error) {
        logger_js_1.default.error(`getPlans error: ${error.message}`);
        return res.status(500).json({ error: "Failed to fetch plans" });
    }
};
exports.getPlans = getPlans;
const createCheckout = async (req, res) => {
    const { email, name, planId, country, userId } = req.body;
    if (!email || !planId || !country) {
        return res
            .status(400)
            .json({ error: "email, planId and country are required" });
    }
    try {
        const plan = await index_js_1.default.newsletterPlan.findUnique({
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
        const staleSubscription = await index_js_1.default.newsletterSubscription.findFirst({
            where: {
                planId,
                createdAt: { lt: oneHourAgo },
                subscriber: { email, status: "PENDING" },
            },
            select: { id: true },
        });
        if (staleSubscription) {
            await index_js_1.default.newsletterSubscription.delete({
                where: { id: staleSubscription.id },
            });
            logger_js_1.default.info(`Cleaned up stale PENDING subscription for ${email}`);
        }
        // Load subscriber AFTER cleanup so stale subscription is not included
        const existingSubscriber = await index_js_1.default.newsletterSubscriber.findUnique({
            where: { email },
            include: {
                subscriptions: {
                    where: { planId },
                },
            },
        });
        // 409 only when BOTH subscriber AND subscription are genuinely active
        // (not an abandoned/pending checkout)
        if (existingSubscriber?.status === "ACTIVE" &&
            existingSubscriber?.subscriptions[0]?.status === "ACTIVE") {
            return res.status(409).json({ error: "Already subscribed to this plan" });
        }
        let subscriber = existingSubscriber;
        if (!subscriber) {
            // The stale cleanup may have deleted the subscription in a way that
            // also removed the subscriber (cascade). Before creating, check if a
            // subscriber already exists under the same userId (Google account) so
            // we don't hit a P2002 unique constraint on the userId field.
            if (userId) {
                const byUserId = await index_js_1.default.newsletterSubscriber.findUnique({
                    where: { userId },
                    include: { subscriptions: { where: { planId } } },
                });
                if (byUserId) {
                    subscriber = byUserId;
                    logger_js_1.default.info(`Re-linked subscriber ${byUserId.id} via userId for ${email}`);
                }
            }
        }
        if (!subscriber) {
            try {
                subscriber = await index_js_1.default.newsletterSubscriber.create({
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
            }
            catch (createErr) {
                // P2002 on userId — another record already owns this userId.
                // Recover by fetching that record and using it.
                if (createErr.code === "P2002" && createErr.meta?.target?.includes("userId") && userId) {
                    logger_js_1.default.warn(`P2002 on userId during subscriber create for ${email}, recovering`);
                    subscriber = await index_js_1.default.newsletterSubscriber.findUnique({
                        where: { userId },
                        include: { subscriptions: { where: { planId } } },
                    });
                    if (!subscriber)
                        throw createErr; // genuinely unrecoverable
                }
                else {
                    throw createErr;
                }
            }
        }
        // FIX 1: Handle "customer already exists" gracefully
        let razorpayCustomer = null;
        try {
            razorpayCustomer = await razorpay.customers.create({
                name: name || email,
                email,
                fail_existing: 0,
            });
        }
        catch (customerError) {
            const isAlreadyExists = customerError?.error?.code === "BAD_REQUEST_ERROR" &&
                customerError?.error?.description
                    ?.toLowerCase()
                    .includes("already exists");
            if (isAlreadyExists) {
                logger_js_1.default.warn(`Razorpay customer already exists for ${email}, fetching existing`);
                try {
                    const existing = await razorpay.customers.all({ email });
                    razorpayCustomer = existing?.items?.[0] ?? { id: undefined };
                }
                catch (fetchError) {
                    logger_js_1.default.warn(`Failed to fetch existing Razorpay customer for ${email}: ${JSON.stringify(fetchError)}`);
                    razorpayCustomer = { id: undefined };
                }
            }
            else {
                throw customerError;
            }
        }
        const frontendUrl = (process.env.FRONTEND_URL || "").replace(/\/$/, "");
        const razorpaySubscription = await razorpay.subscriptions.create({
            plan_id: plan.razorpayPlanId,
            customer_notify: 1,
            quantity: 1,
            total_count: plan.billingInterval === "YEARLY" ? 12 : 120,
            addons: [],
            notes: {
                subscriberId: subscriber.id,
                planId: plan.id,
                email,
            },
            // callback_url is NOT a valid field on subscriptions.create() —
            // Razorpay returns BAD_REQUEST_ERROR if it is included.
            // The redirect URL after hosted checkout is configured in the
            // Razorpay Dashboard under Settings → Checkout → Redirect URL.
        });
        await index_js_1.default.newsletterSubscription.create({
            data: {
                subscriberId: subscriber.id,
                planId: plan.id,
                provider: "RAZORPAY",
                status: "ACTIVE",
                razorpayCustomerId: razorpayCustomer?.id ?? undefined,
                razorpaySubscriptionId: razorpaySubscription.id,
                currentPeriodStart: new Date(),
                currentPeriodEnd: new Date(),
            },
        });
        logger_js_1.default.info(`Checkout created for ${email}, subscription: ${razorpaySubscription.id}`);
        return res.status(200).json({
            subscriptionId: razorpaySubscription.id,
            checkoutUrl: razorpaySubscription.short_url,
            razorpayKeyId: process.env.RAZORPAY_KEY_ID,
        });
    }
    catch (error) {
        console.error(error);
        logger_js_1.default.error(`createCheckout error: ${JSON.stringify(error)}`);
        return res.status(500).json({ error: "Failed to create checkout" });
    }
};
exports.createCheckout = createCheckout;
const unsubscribe = async (req, res) => {
    const { token } = req.query;
    if (!token || typeof token !== "string") {
        return res.status(400).json({ error: "Invalid unsubscribe token" });
    }
    try {
        const subscriber = await index_js_1.default.newsletterSubscriber.findUnique({
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
                    await razorpay.subscriptions.cancel(sub.razorpaySubscriptionId, {
                        cancel_at_cycle_end: 1,
                    });
                }
                catch (rzpError) {
                    logger_js_1.default.warn(`Failed to cancel Razorpay subscription ${sub.razorpaySubscriptionId}: ${rzpError.message}`);
                }
            }
            await index_js_1.default.newsletterSubscription.update({
                where: { id: sub.id },
                data: {
                    cancelAtPeriodEnd: true,
                    canceledAt: new Date(),
                },
            });
        }
        await index_js_1.default.newsletterSubscriber.update({
            where: { id: subscriber.id },
            data: {
                status: "UNSUBSCRIBED",
                unsubscribedAt: new Date(),
            },
        });
        logger_js_1.default.info(`Subscriber unsubscribed: ${subscriber.email}`);
        return res.status(200).json({ message: "Successfully unsubscribed" });
    }
    catch (error) {
        logger_js_1.default.error(`unsubscribe error: ${error.message}`);
        return res.status(500).json({ error: "Failed to unsubscribe" });
    }
};
exports.unsubscribe = unsubscribe;
const getSubscriptionStatusById = async (req, res) => {
    const { razorpaySubscriptionId } = req.params;
    try {
        const subscription = await index_js_1.default.newsletterSubscription.findUnique({
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
    }
    catch (error) {
        logger_js_1.default.error(`getSubscriptionStatusById error: ${error.message}`);
        return res
            .status(500)
            .json({ error: "Failed to fetch subscription status" });
    }
};
exports.getSubscriptionStatusById = getSubscriptionStatusById;
const getSubscriberStatus = async (req, res) => {
    const { email } = req.params;
    try {
        const subscriber = await index_js_1.default.newsletterSubscriber.findUnique({
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
    }
    catch (error) {
        logger_js_1.default.error(`getSubscriberStatus error: ${error.message}`);
        return res.status(500).json({ error: "Failed to fetch status" });
    }
};
exports.getSubscriberStatus = getSubscriberStatus;
