"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSubscriberStatus = exports.unsubscribe = exports.createCheckout = exports.getPlans = void 0;
const razorpay_1 = __importDefault(require("razorpay"));
const index_js_1 = __importDefault(require("../index.js"));
const logger_js_1 = __importDefault(require("../logger.js"));
const razorpay = new razorpay_1.default({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});
// ─── GET ALL ACTIVE PLANS ─────────────────────────────────────────────────────
// Frontend calls this to display pricing page
const getPlans = async (req, res) => {
    try {
        const plans = await index_js_1.default.newsletterPlan.findMany({
            where: { isActive: true },
            orderBy: { amount: "asc" },
        });
        return res.status(200).json({ plans });
    }
    catch (error) {
        logger_js_1.default.error(`getPlans error: ${error.message}`);
        return res.status(500).json({ error: "Failed to fetch plans" });
    }
};
exports.getPlans = getPlans;
// ─── CREATE CHECKOUT ──────────────────────────────────────────────────────────
// Called when user fills the signup form and clicks "Subscribe"
// Creates subscriber record + Razorpay subscription and returns checkout URL
const createCheckout = async (req, res) => {
    const { email, name, planId, country, userId } = req.body;
    if (!email || !planId || !country) {
        return res
            .status(400)
            .json({ error: "email, planId and country are required" });
    }
    try {
        // Fetch the plan
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
        // Check if subscriber already exists with this email + plan combo
        const existingSubscriber = await index_js_1.default.newsletterSubscriber.findUnique({
            where: { email },
            include: {
                subscriptions: {
                    where: { planId },
                },
            },
        });
        if (existingSubscriber?.subscriptions[0]?.status === "ACTIVE") {
            return res.status(409).json({ error: "Already subscribed to this plan" });
        }
        // Create or reuse subscriber record
        let subscriber = existingSubscriber;
        if (!subscriber) {
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
        // Create Razorpay customer
        const razorpayCustomer = await razorpay.customers.create({
            name: name || email,
            email,
            fail_existing: 0, // don't fail if customer already exists
        });
        // Create Razorpay subscription
        // This generates the checkout URL the user completes
        const razorpaySubscription = await razorpay.subscriptions.create({
            plan_id: plan.razorpayPlanId,
            customer_notify: 1, // Razorpay sends payment notifications
            quantity: 1,
            total_count: plan.billingInterval === "YEARLY" ? 12 : 120, // how many billing cycles (120 = ~10 years for monthly = effectively forever)
            addons: [],
            notes: {
                subscriberId: subscriber.id,
                planId: plan.id,
                email,
            },
        });
        // Create subscription record in DB — status starts as ACTIVE after webhook confirms
        await index_js_1.default.newsletterSubscription.create({
            data: {
                subscriberId: subscriber.id,
                planId: plan.id,
                provider: "RAZORPAY",
                status: "ACTIVE",
                razorpayCustomerId: razorpayCustomer.id,
                razorpaySubscriptionId: razorpaySubscription.id,
                currentPeriodStart: new Date(),
                currentPeriodEnd: new Date(), // placeholder, webhook will update this
            },
        });
        logger_js_1.default.info(`Checkout created for ${email}, subscription: ${razorpaySubscription.id}`);
        // Return the short URL — frontend redirects user here to complete payment
        return res.status(200).json({
            subscriptionId: razorpaySubscription.id,
            checkoutUrl: razorpaySubscription.short_url,
            razorpayKeyId: process.env.RAZORPAY_KEY_ID,
        });
    }
    catch (error) {
        logger_js_1.default.error(`createCheckout error: ${error.message}`);
        return res.status(500).json({ error: "Failed to create checkout" });
    }
};
exports.createCheckout = createCheckout;
// ─── UNSUBSCRIBE ──────────────────────────────────────────────────────────────
// No auth needed — just the token from the email footer link
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
        // Cancel active Razorpay subscriptions
        for (const sub of subscriber.subscriptions) {
            if (sub.razorpaySubscriptionId && sub.status === "ACTIVE") {
                try {
                    await razorpay.subscriptions.cancel(sub.razorpaySubscriptionId, {
                        cancel_at_cycle_end: 1, // cancel at end of current period, not immediately
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
        // Mark subscriber as unsubscribed
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
// ─── GET SUBSCRIBER STATUS ────────────────────────────────────────────────────
// Frontend calls this to show subscription status in account page
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
