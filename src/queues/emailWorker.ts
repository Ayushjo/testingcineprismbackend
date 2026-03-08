import { Worker, Job } from "bullmq";
import {
  SESClient,
  SendEmailCommand,
  SendEmailCommandInput,
} from "@aws-sdk/client-ses";
import { EmailJobData } from "../types/newsletter.types.js";
import client from "../index.js"; // your prisma client
import logger from "../logger.js";

const sesClient = new SESClient({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const connection = {
  url: process.env.REDIS_URL!,
};

const processEmail = async (job: Job<EmailJobData>) => {
  const {
    subscriberId,
    campaignId,
    email,
    name,
    subject,
    htmlContent,
    unsubscribeToken,
  } = job.data;

  logger.info(`Processing email job ${job.id} for ${email}`);

  // Build unsubscribe URL - appended to every email (CAN-SPAM requirement)
  const unsubscribeUrl = `${process.env.FRONTEND_URL}/unsubscribe?token=${unsubscribeToken}`;

  // Inject unsubscribe link into HTML before sending
  const finalHtml = htmlContent.replace("{{UNSUBSCRIBE_URL}}", unsubscribeUrl);

  const params: SendEmailCommandInput = {
    Source: `The Cineprism <${process.env.SES_FROM_EMAIL}>`,
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
    // This ties the send to your configuration set for open/click tracking
    ConfigurationSetName: "cineprism-newsletter",
  };

  const command = new SendEmailCommand(params);
  const result = await sesClient.send(command);

  const sesMessageId = result.MessageId;

  // Update email log with sent status and SES message ID
  await client.newsletterEmailLog.updateMany({
    where: {
      subscriberId,
      campaignId,
    },
    data: {
      status: "SENT",
      sesMessageId,
      sentAt: new Date(),
    },
  });

  // Increment campaign sent count
  await client.newsletterCampaign.update({
    where: { id: campaignId },
    data: {
      totalSent: { increment: 1 },
    },
  });

  logger.info(`Email sent to ${email}, SES ID: ${sesMessageId}`);

  return { sesMessageId };
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

  if (job) {
    // If all retries exhausted, mark as failed in DB
    if (job.attemptsMade >= (job.opts.attempts || 3)) {
      await client.newsletterEmailLog.updateMany({
        where: {
          subscriberId: job.data.subscriberId,
          campaignId: job.data.campaignId,
        },
        data: {
          status: "FAILED",
        },
      });
    }
  }
});

emailWorker.on("error", (error) => {
  logger.error(`Email worker error: ${error.message}`);
});

logger.info("Email worker started and listening for jobs");
