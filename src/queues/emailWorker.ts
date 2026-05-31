import { Worker, Job } from "bullmq";
import {
  SESClient,
  SendEmailCommand,
  SendEmailCommandInput,
} from "@aws-sdk/client-ses";
import { PrismaClient } from "@prisma/client";
import { EmailJobData } from "../types/newsletter.types.js";
import logger from "../logger.js";

const client = new PrismaClient();

const sesClient = new SESClient({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const redisUrl = process.env.REDIS_URL!;
export const emailWorkerConnection = {
  url: redisUrl,
  maxRetriesPerRequest: null, // required by BullMQ
  enableReadyCheck: false,
  ...(redisUrl?.startsWith("rediss://")
    ? { tls: { rejectUnauthorized: false } }
    : {}),
};
const connection = emailWorkerConnection;

const FROM_ADDRESS =
  process.env.SES_FROM_EMAIL || "newsletter@thecineprism.com";

export const processEmail = async (job: Job<EmailJobData>) => {
  const {
    subscriberId,
    campaignId,
    email,
    subject,
    htmlContent,
    unsubscribeToken,
  } = job.data;

  logger.info(`Processing email job ${job.id} for ${email}`);

  try {
    const frontendUrl = (process.env.FRONTEND_URL || "").replace(/\/$/, "");
    const unsubscribeUrl = `${frontendUrl}/unsubscribe?token=${unsubscribeToken}`;

    // Replace placeholder after HTML is built (supports multiple footer links)
    const finalHtml = htmlContent.replace(
      /\{\{UNSUBSCRIBE_URL\}\}/g,
      unsubscribeUrl,
    );

    const params: SendEmailCommandInput = {
      Source: `The Cineprism <${FROM_ADDRESS}>`,
      Destination: {
        ToAddresses: [email],
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: "UTF-8",
        },
        Body: {
          Html: {
            Data: finalHtml,
            Charset: "UTF-8",
          },
        },
      },
      ConfigurationSetName: "cineprism-newsletter",
    };

    const command = new SendEmailCommand(params);
    const result = await sesClient.send(command);
    const sesMessageId = result.MessageId;

    // Transactional emails (welcome, etc.) have no campaignId — skip log/stats
    if (campaignId) {
      await client.newsletterEmailLog.updateMany({
        where: { subscriberId, campaignId },
        data: {
          status: "SENT",
          sesMessageId,
          sentAt: new Date(),
        },
      });

      await client.newsletterCampaign.update({
        where: { id: campaignId },
        data: { totalSent: { increment: 1 } },
      });
    }

    logger.info(`Email sent to ${email}, SES ID: ${sesMessageId}`);
    return { sesMessageId };
  } catch (error: any) {
    logger.error(`Failed to send email to ${email}: ${error.message}`);
    throw error;
  }
};

// Create the worker - this runs in the background processing jobs
export const emailWorker = new Worker<EmailJobData>(
  "newsletter-emails",
  processEmail,
  {
    connection,
    concurrency: 5, // process 5 emails at a time - adjust based on SES sending rate
  },
);

// Worker event handlers for logging
emailWorker.on("completed", (job) => {
  logger.info(`Email job ${job.id} completed`);
});

emailWorker.on("failed", async (job, error) => {
  logger.error(`Email job ${job?.id} failed: ${error.message}`);

  if (job && job.attemptsMade >= (job.opts.attempts || 3)) {
    // Only update campaign email logs — transactional emails have no log row
    if (job.data.campaignId) {
      await client.newsletterEmailLog.updateMany({
        where: {
          subscriberId: job.data.subscriberId,
          campaignId: job.data.campaignId,
        },
        data: { status: "FAILED" },
      });
    }
  }
});

emailWorker.on("error", (error) => {
  // Log Redis/connection errors without crashing the process — BullMQ reconnects
  logger.error(`Email worker connection error (will retry): ${error.message}`);
});

process.on("unhandledRejection", (reason) => {
  logger.error(`Email worker unhandled rejection: ${reason}`);
});

logger.info("Email worker started and listening for jobs");
