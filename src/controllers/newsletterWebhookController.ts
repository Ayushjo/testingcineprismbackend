import { Request, Response } from "express";
import crypto from "crypto";
import client from "../index.js";
import logger from "../logger.js";
import {
  RazorpayWebhookPayload,
  SNSBounceNotification,
} from "../types/newsletter.types.js";

// ─── RAZORPAY WEBHOOK ─────────────────────────────────────────────────────────
// All subscription events from Razorpay hit this handler
// Razorpay sends: subscription.activated, subscription.charged,
// subscription.charge.failed, subscription.cancelled, subscription.completed

export const handleRazorpayWebhook = async (req: Request, res: Response) => {
  const signature = req.headers["x-razorpay-signature"] as string;
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET!;

  // Step 1: Verify signature — ALWAYS do this first
  // req.body must be raw buffer for this to work (see webhook routes)
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(req.body) // raw body buffer
    .digest("hex");

  if (expectedSignature !== signature) {
    logger.warn("Invalid Razorpay webhook signature");
    return res.status(400).json({ error: "Invalid signature" });
  }

  // Parse the body after verification
  const payload: RazorpayWebhookPayload = JSON.parse(req.body.toString());
  const event = payload.event;

  logger.info(`Razorpay webhook received: ${event}`);

  try {
    switch (event) {
      // Fires when UPI mandate is approved / card subscription is activated
      // This is when you give access to the subscriber
      case "subscription.activated": {
        const sub = payload.payload.subscription?.entity;
        if (!sub) break;

        await client.newsletterSubscription.updateMany({
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
        const subscription = await client.newsletterSubscription.findFirst({
          where: { razorpaySubscriptionId: sub.id },
          include: { subscriber: true },
        });

        if (subscription) {
          await client.newsletterSubscriber.update({
            where: { id: subscription.subscriberId },
            data: { status: "ACTIVE" },
          });
        }

        logger.info(`Subscription activated: ${sub.id}`);
        break;
      }

      // Fires on every successful renewal charge
      case "subscription.charged": {
        const sub = payload.payload.subscription?.entity;
        const payment = payload.payload.payment?.entity;
        if (!sub || !payment) break;

        // Update subscription period
        await client.newsletterSubscription.updateMany({
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
        const subscription = await client.newsletterSubscription.findFirst({
          where: { razorpaySubscriptionId: sub.id },
        });

        if (subscription) {
          await client.newsletterPayment.create({
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

        logger.info(`Subscription charged successfully: ${sub.id}`);
        break;
      }

      // Fires when a charge attempt fails
      case "subscription.charge.failed": {
        const sub = payload.payload.subscription?.entity;
        const payment = payload.payload.payment?.entity;
        if (!sub) break;

        const subscription = await client.newsletterSubscription.findFirst({
          where: { razorpaySubscriptionId: sub.id },
        });

        if (subscription) {
          const newRetryCount = subscription.retryCount + 1;

          await client.newsletterSubscription.update({
            where: { id: subscription.id },
            data: {
              status: "PAST_DUE",
              retryCount: newRetryCount,
              lastPaymentError: payment?.error_description || "Payment failed",
            },
          });

          await client.newsletterSubscriber.update({
            where: { id: subscription.subscriberId },
            data: { status: "PAST_DUE" },
          });

          if (payment) {
            await client.newsletterPayment.create({
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

          logger.warn(
            `Subscription charge failed: ${sub.id}, retry count: ${newRetryCount}`,
          );
        }
        break;
      }

      case "subscription.cancelled":
      case "subscription.completed": {
        const sub = payload.payload.subscription?.entity;
        const payment = payload.payload.payment?.entity;
        if (!sub) break;

        const subscription = await client.newsletterSubscription.findFirst({
          where: { razorpaySubscriptionId: sub.id },
        });

        if (subscription) {
          await client.newsletterSubscription.update({
            where: { id: subscription.id },
            data: {
              status: "CANCELED",
              canceledAt: new Date(),
            },
          });

          await client.newsletterSubscriber.update({
            where: { id: subscription.subscriberId },
            data: { status: "CANCELED" },
          });

          logger.info(`Subscription cancelled: ${sub.id}`);
        }
        break;
      }

      default:
        logger.info(`Unhandled Razorpay event: ${event}`);
    }

    return res.status(200).json({ received: true });
  } catch (error: any) {
    logger.error(`Razorpay webhook error: ${error.message}`);

    return res.status(200).json({ received: true });
  }
};


export const handleSNSNotification = async (req: Request, res: Response) => {
  const messageType = req.headers["x-amz-sns-message-type"] as string;

  try {
    const body = JSON.parse(req.body.toString());


    if (messageType === "SubscriptionConfirmation") {
      logger.info(`SNS subscription confirmation URL: ${body.SubscribeURL}`);
 
      const https = await import("https");
      https.get(body.SubscribeURL, () => {
        logger.info("SNS subscription confirmed automatically");
      });
      return res.status(200).json({ received: true });
    }

    if (messageType === "Notification") {
      const notification: SNSBounceNotification = JSON.parse(body.Message);
      const notifType = notification.notificationType;

      if (notifType === "Bounce" && notification.bounce) {
        const { bounceType, bounceSubType, bouncedRecipients } =
          notification.bounce;
        const messageId = notification.mail.messageId;

        for (const recipient of bouncedRecipients) {

          const emailLog = await client.newsletterEmailLog.findFirst({
            where: { sesMessageId: messageId },
          });

          if (emailLog) {
            await client.newsletterEmailLog.update({
              where: { id: emailLog.id },
              data: {
                status: "BOUNCED",
                bouncedAt: new Date(),
                bounceType,
                bounceSubType,
              },
            });


            await client.newsletterCampaign.update({
              where: { id: emailLog.campaignId },
              data: { totalBounced: { increment: 1 } },
            });
          }

          if (bounceType === "Permanent") {
            await client.newsletterSubscriber.updateMany({
              where: { email: recipient.emailAddress },
              data: { status: "UNSUBSCRIBED" },
            });
            logger.warn(
              `Permanent bounce for ${recipient.emailAddress} — marked unsubscribed`,
            );
          }
        }
      }

      if (notifType === "Complaint" && notification.complaint) {
        const { complainedRecipients } = notification.complaint;
        const messageId = notification.mail.messageId;

        for (const recipient of complainedRecipients) {
          const emailLog = await client.newsletterEmailLog.findFirst({
            where: { sesMessageId: messageId },
          });

          if (emailLog) {
            await client.newsletterEmailLog.update({
              where: { id: emailLog.id },
              data: {
                status: "COMPLAINED",
                complainedAt: new Date(),
              },
            });
          }

          await client.newsletterSubscriber.updateMany({
            where: { email: recipient.emailAddress },
            data: { status: "UNSUBSCRIBED" },
          });

          logger.warn(
            `Spam complaint from ${recipient.emailAddress} — marked unsubscribed`,
          );
        }
      }
    }

    return res.status(200).json({ received: true });
  } catch (error: any) {
    logger.error(`SNS notification error: ${error.message}`);
    return res.status(200).json({ received: true });
  }
};
