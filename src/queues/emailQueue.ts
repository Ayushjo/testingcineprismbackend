import { Queue } from "bullmq";
import { EmailJobData } from "../types/newsletter.types.js";

// Use REDIS_URL from env - make sure this is the PUBLIC URL if backend is not on Railway
const connection = {
  url: process.env.REDIS_URL!,
};

// Main queue for sending newsletter emails
export const emailQueue = new Queue<EmailJobData>("newsletter-emails", {
  connection,
  defaultJobOptions: {
    attempts: 3, // retry 3 times on failure
    backoff: {
      type: "exponential",
      delay: 5000, // start with 5s, then 25s, then 125s
    },
    removeOnComplete: 1000, // keep last 1000 completed jobs for debugging
    removeOnFail: 500,
  },
});

// Helper to add a single email job to the queue
export const queueEmail = async (data: EmailJobData) => {
  await emailQueue.add(`email-${data.subscriberId}-${data.campaignId}`, data, {
    jobId: `${data.campaignId}-${data.subscriberId}`, // prevents duplicate jobs for same campaign+subscriber
  });
};

// Helper to add bulk emails - used when sending a campaign
// Adds in batches to avoid overwhelming the queue
export const queueBulkEmails = async (jobs: EmailJobData[]) => {
  const BATCH_SIZE = 100;

  for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
    const batch = jobs.slice(i, i + BATCH_SIZE);

    await emailQueue.addBulk(
      batch.map((data) => ({
        name: `email-${data.subscriberId}-${data.campaignId}`,
        data,
        opts: {
          jobId: `${data.campaignId}-${data.subscriberId}`,
        },
      })),
    );

    // Small delay between batches to be gentle on Redis
    if (i + BATCH_SIZE < jobs.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
};
