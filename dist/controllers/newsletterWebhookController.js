"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSNSNotification = exports.handleRazorpayWebhook = void 0;
const crypto_1 = __importDefault(require("crypto"));
const index_js_1 = __importDefault(require("../index.js"));
const logger_js_1 = __importDefault(require("../logger.js"));
// ─── RAZORPAY WEBHOOK ─────────────────────────────────────────────────────────
// All subscription events from Razorpay hit this handler
// Razorpay sends: subscription.activated, subscription.charged,
// subscription.charge.failed, subscription.cancelled, subscription.completed
const handleRazorpayWebhook = async (req, res) => {
    const signature = req.headers["x-razorpay-signature"];
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    // Step 1: Verify signature — ALWAYS do this first
    // req.body must be raw buffer for this to work (see webhook routes)
    const expectedSignature = crypto_1.default
        .createHmac("sha256", secret)
        .update(req.body) // raw body buffer
        .digest("hex");
    if (expectedSignature !== signature) {
        logger_js_1.default.warn("Invalid Razorpay webhook signature");
        return res.status(400).json({ error: "Invalid signature" });
    }
    // Parse the body after verification
    const payload = JSON.parse(req.body.toString());
    const event = payload.event;
    logger_js_1.default.info(`Razorpay webhook received: ${event}`);
    try {
        switch (event) {
            // Fires when UPI mandate is approved / card subscription is activated
            // This is when you give access to the subscriber
            case "subscription.activated": {
                const sub = payload.payload.subscription?.entity;
                if (!sub)
                    break;
                await index_js_1.default.newsletterSubscription.updateMany({
                    where: { razorpaySubscriptionId: sub.id },
                    data: {
                        status: "ACTIVE",
                        currentPeriodStart: new Date(sub.current_start * 1000),
                        currentPeriodEnd: new Date(sub.current_end * 1000),
                        retryCount: 0,
                        lastPaymentError: null,
                    },
                });
                // Activate the subscriber too
                const subscription = await index_js_1.default.newsletterSubscription.findFirst({
                    where: { razorpaySubscriptionId: sub.id },
                    include: { subscriber: true },
                });
                if (subscription) {
                    await index_js_1.default.newsletterSubscriber.update({
                        where: { id: subscription.subscriberId },
                        data: { status: "ACTIVE" },
                    });
                }
                logger_js_1.default.info(`Subscription activated: ${sub.id}`);
                break;
            }
            // Fires on every successful renewal charge
            case "subscription.charged": {
                const sub = payload.payload.subscription?.entity;
                const payment = payload.payload.payment?.entity;
                if (!sub || !payment)
                    break;
                // Update subscription period
                await index_js_1.default.newsletterSubscription.updateMany({
                    where: { razorpaySubscriptionId: sub.id },
                    data: {
                        status: "ACTIVE",
                        currentPeriodStart: new Date(sub.current_start * 1000),
                        currentPeriodEnd: new Date(sub.current_end * 1000),
                        retryCount: 0,
                        lastPaymentError: null,
                    },
                });
                // Log the payment
                const subscription = await index_js_1.default.newsletterSubscription.findFirst({
                    where: { razorpaySubscriptionId: sub.id },
                });
                if (subscription) {
                    await index_js_1.default.newsletterPayment.create({
                        data: {
                            subscriptionId: subscription.id,
                            provider: "RAZORPAY",
                            status: "PAID",
                            amount: payment.amount / 100, // Razorpay sends paise
                            currency: payment.currency,
                            razorpayPaymentId: payment.id,
                            paidAt: new Date(),
                        },
                    });
                }
                logger_js_1.default.info(`Subscription charged successfully: ${sub.id}`);
                break;
            }
            // Fires when a charge attempt fails
            case "subscription.charge.failed": {
                const sub = payload.payload.subscription?.entity;
                const payment = payload.payload.payment?.entity;
                if (!sub)
                    break;
                const subscription = await index_js_1.default.newsletterSubscription.findFirst({
                    where: { razorpaySubscriptionId: sub.id },
                });
                if (subscription) {
                    const newRetryCount = subscription.retryCount + 1;
                    await index_js_1.default.newsletterSubscription.update({
                        where: { id: subscription.id },
                        data: {
                            status: "PAST_DUE",
                            retryCount: newRetryCount,
                            lastPaymentError: payment?.error_description || "Payment failed",
                        },
                    });
                    await index_js_1.default.newsletterSubscriber.update({
                        where: { id: subscription.subscriberId },
                        data: { status: "PAST_DUE" },
                    });
                    if (payment) {
                        await index_js_1.default.newsletterPayment.create({
                            data: {
                                subscriptionId: subscription.id,
                                provider: "RAZORPAY",
                                status: "FAILED",
                                amount: payment.amount / 100,
                                currency: payment.currency,
                                razorpayPaymentId: payment.id,
                                failureReason: payment.error_description,
                            },
                        });
                    }
                    logger_js_1.default.warn(`Subscription charge failed: ${sub.id}, retry count: ${newRetryCount}`);
                }
                break;
            }
            // Fires when subscription is cancelled (either by user or after all retries failed)
            case "subscription.cancelled":
            case "subscription.completed": {
                const sub = payload.payload.subscription?.entity;
                const payment = payload.payload.payment?.entity;
                if (!sub)
                    break;
                const subscription = await index_js_1.default.newsletterSubscription.findFirst({
                    where: { razorpaySubscriptionId: sub.id },
                });
                if (subscription) {
                    await index_js_1.default.newsletterSubscription.update({
                        where: { id: subscription.id },
                        data: {
                            status: "CANCELED",
                            canceledAt: new Date(),
                        },
                    });
                    await index_js_1.default.newsletterSubscriber.update({
                        where: { id: subscription.subscriberId },
                        data: { status: "CANCELED" },
                    });
                    logger_js_1.default.info(`Subscription cancelled: ${sub.id}`);
                }
                break;
            }
            default:
                logger_js_1.default.info(`Unhandled Razorpay event: ${event}`);
        }
        // Always return 200 to Razorpay — if you return anything else
        // Razorpay will keep retrying the webhook
        return res.status(200).json({ received: true });
    }
    catch (error) {
        logger_js_1.default.error(`Razorpay webhook error: ${error.message}`);
        // Still return 200 to prevent Razorpay retrying — log the error and investigate
        return res.status(200).json({ received: true });
    }
};
exports.handleRazorpayWebhook = handleRazorpayWebhook;
// ─── AWS SNS WEBHOOK ──────────────────────────────────────────────────────────
// AWS SES sends bounce and complaint notifications via SNS to this endpoint
// This is critical — missing bounces will get your SES account suspended
const handleSNSNotification = async (req, res) => {
    const messageType = req.headers["x-amz-sns-message-type"];
    try {
        const body = JSON.parse(req.body.toString());
        // SNS first sends a subscription confirmation — you must visit the URL to confirm
        if (messageType === "SubscriptionConfirmation") {
            logger_js_1.default.info(`SNS subscription confirmation URL: ${body.SubscribeURL}`);
            // In production, auto-confirm by fetching the URL
            const https = await import("https");
            https.get(body.SubscribeURL, () => {
                logger_js_1.default.info("SNS subscription confirmed automatically");
            });
            return res.status(200).json({ received: true });
        }
        if (messageType === "Notification") {
            const notification = JSON.parse(body.Message);
            const notifType = notification.notificationType;
            if (notifType === "Bounce" && notification.bounce) {
                const { bounceType, bounceSubType, bouncedRecipients } = notification.bounce;
                const messageId = notification.mail.messageId;
                for (const recipient of bouncedRecipients) {
                    // Find the email log by SES message ID
                    const emailLog = await index_js_1.default.newsletterEmailLog.findFirst({
                        where: { sesMessageId: messageId },
                    });
                    if (emailLog) {
                        await index_js_1.default.newsletterEmailLog.update({
                            where: { id: emailLog.id },
                            data: {
                                status: "BOUNCED",
                                bouncedAt: new Date(),
                                bounceType,
                                bounceSubType,
                            },
                        });
                        // Increment campaign bounce count
                        await index_js_1.default.newsletterCampaign.update({
                            where: { id: emailLog.campaignId },
                            data: { totalBounced: { increment: 1 } },
                        });
                    }
                    // On permanent bounce — mark subscriber so we never email them again
                    if (bounceType === "Permanent") {
                        await index_js_1.default.newsletterSubscriber.updateMany({
                            where: { email: recipient.emailAddress },
                            data: { status: "UNSUBSCRIBED" },
                        });
                        logger_js_1.default.warn(`Permanent bounce for ${recipient.emailAddress} — marked unsubscribed`);
                    }
                }
            }
            if (notifType === "Complaint" && notification.complaint) {
                const { complainedRecipients } = notification.complaint;
                const messageId = notification.mail.messageId;
                for (const recipient of complainedRecipients) {
                    const emailLog = await index_js_1.default.newsletterEmailLog.findFirst({
                        where: { sesMessageId: messageId },
                    });
                    if (emailLog) {
                        await index_js_1.default.newsletterEmailLog.update({
                            where: { id: emailLog.id },
                            data: {
                                status: "COMPLAINED",
                                complainedAt: new Date(),
                            },
                        });
                    }
                    // Complaint = user hit spam button — remove immediately, no exceptions
                    await index_js_1.default.newsletterSubscriber.updateMany({
                        where: { email: recipient.emailAddress },
                        data: { status: "UNSUBSCRIBED" },
                    });
                    logger_js_1.default.warn(`Spam complaint from ${recipient.emailAddress} — marked unsubscribed`);
                }
            }
        }
        return res.status(200).json({ received: true });
    }
    catch (error) {
        logger_js_1.default.error(`SNS notification error: ${error.message}`);
        return res.status(200).json({ received: true });
    }
};
exports.handleSNSNotification = handleSNSNotification;
