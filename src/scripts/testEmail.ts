// scripts/testEmail.ts
// End-to-end test: BullMQ queue → email worker → AWS SES
// Run from TheCineprismBackend/:
//   npx tsx scripts/testEmail.ts

import dotenv from "dotenv";
dotenv.config();

import { EmailJobData } from "../../src/types/newsletter.types.js";

// ← Change this to your inbox before running
const TEST_RECIPIENT = "ayushsingh202586@gmail.com";

const TEST_UNSUBSCRIBE_TOKEN = "test-token-123";
const TEST_SUBSCRIBER_ID = "test-subscriber-e2e";
const QUEUE_NAME = "newsletter-emails";
const WAIT_MS = 15_000;

const SEP = "=".repeat(60);

function pass(msg: string) {
  console.log(`   ✅  ${msg}`);
}

function fail(msg: string, err?: unknown) {
  console.error(`   ❌  ${msg}`);
  if (err) console.error(`       ${err instanceof Error ? err.message : err}`);
}

async function main() {
  console.log(`\n${SEP}`);
  console.log("  Newsletter Email Pipeline Test");
  console.log(`${SEP}\n`);

  if (!process.env.REDIS_URL) {
    fail("REDIS_URL is not set in .env");
    process.exit(1);
  }
  if (!process.env.AWS_REGION || !process.env.AWS_ACCESS_KEY_ID) {
    fail("AWS credentials are not set in .env");
    process.exit(1);
  }

  const { QueueEvents } = await import("bullmq");
  const { emailQueue } = await import("../../src/queues/emailQueue.js");
  const { emailWorker, emailWorkerConnection } = await import(
    "../../src/queues/emailWorker.js"
  );
  const { buildWelcomeEmail } = await import("../../src/helpers/emailTemplate.js");

  console.log(`0️⃣   Config`);
  console.log(`   ℹ️   Recipient: ${TEST_RECIPIENT}`);
  console.log(`   ℹ️   Queue: ${QUEUE_NAME}`);
  pass("Email worker loaded");

  const queueEvents = new QueueEvents(QUEUE_NAME, {
    connection: emailWorkerConnection,
  });

  emailWorker.on("error", (err) => {
    console.error(`   ⚠️   Worker connection error (will retry): ${err.message}`);
  });

  const html = buildWelcomeEmail({
    name: "Test Subscriber",
    planName: "The Cineprism Weekly",
    unsubscribeToken: TEST_UNSUBSCRIBE_TOKEN,
  });

  const jobData: EmailJobData = {
    subscriberId: TEST_SUBSCRIBER_ID,
    email: TEST_RECIPIENT,
    name: "Test Subscriber",
    subject: "[TEST] The Cineprism Newsletter",
    htmlContent: html,
    unsubscribeToken: TEST_UNSUBSCRIBE_TOKEN,
    // No campaignId — transactional welcome email path
  };

  console.log("\n1️⃣   Queue test job");

  const jobId = `test-email-${Date.now()}`;

  const resultPromise = new Promise<"completed" | "failed" | "timeout">(
    (resolve) => {
      const timer = setTimeout(() => resolve("timeout"), WAIT_MS);

      const onCompleted = ({ jobId: completedId }: { jobId: string }) => {
        if (completedId !== jobId) return;
        clearTimeout(timer);
        queueEvents.off("completed", onCompleted);
        queueEvents.off("failed", onFailed);
        console.log(`   ℹ️   Job completed: ${completedId}`);
        resolve("completed");
      };

      const onFailed = ({
        jobId: failedId,
        failedReason,
      }: {
        jobId: string;
        failedReason: string;
      }) => {
        if (failedId !== jobId) return;
        clearTimeout(timer);
        queueEvents.off("completed", onCompleted);
        queueEvents.off("failed", onFailed);
        console.error(`   ℹ️   Job failed: ${failedId} — ${failedReason}`);
        resolve("failed");
      };

      queueEvents.on("completed", onCompleted);
      queueEvents.on("failed", onFailed);
    },
  );

  try {
    await emailQueue.add("test-welcome-email", jobData, { jobId });
    pass(`Job added to BullMQ queue (id: ${jobId})`);
  } catch (err) {
    fail("Failed to queue job", err);
    await emailWorker.close();
    await queueEvents.close();
    process.exit(1);
  }

  console.log(`\n2️⃣   Waiting up to ${WAIT_MS / 1000}s for worker to process job`);

  const result = await resultPromise;

  console.log("\n3️⃣   Result");
  if (result === "completed") {
    pass(`Test email sent to ${TEST_RECIPIENT}`);
    pass('Check inbox for subject: "[TEST] The Cineprism Newsletter"');
    pass(
      "Unsubscribe link should point to FRONTEND_URL/unsubscribe?token=test-token-123",
    );
  } else if (result === "failed") {
    fail(
      "Worker failed to send the email — check AWS SES credentials and FROM address",
    );
    process.exitCode = 1;
  } else {
    fail(`Timed out after ${WAIT_MS / 1000}s — job may still be in queue`);
    process.exitCode = 1;
  }

  await emailWorker.close();
  await queueEvents.close();

  console.log(`\n${SEP}\n`);
}

main().catch((err) => {
  console.error("\n💥 Unexpected error:", err);
  process.exit(1);
});
