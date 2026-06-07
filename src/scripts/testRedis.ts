// scripts/testRedis.ts
// Standalone Redis + BullMQ connectivity test.
// Run from TheCineprismBackend/:
//   npx ts-node scripts/testRedis.ts

import dotenv from "dotenv";
dotenv.config();

import Redis from "ioredis";
import { Queue } from "bullmq";

const SEP = "=".repeat(60);
const REDIS_URL = process.env.REDIS_URL;
const TEST_QUEUE = `redis-test-queue-${Date.now()}`;

// ── helpers ───────────────────────────────────────────────────────────────────

function pass(msg: string) {
  console.log(`   ✅  ${msg}`);
}

function fail(msg: string, err?: any) {
  console.error(`   ❌  ${msg}`);
  if (err) console.error(`       ${err?.message ?? err}`);
}

function info(msg: string) {
  console.log(`   ℹ️   ${msg}`);
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${SEP}`);
  console.log("  Redis & BullMQ Connectivity Test");
  console.log(`${SEP}\n`);

  // ── Env check ───────────────────────────────────────────────────────────────
  console.log("0️⃣   Environment check");
  if (!REDIS_URL) {
    fail("REDIS_URL is not set in .env");
    process.exit(1);
  }
  // Mask password in logs
  const maskedUrl = REDIS_URL.replace(/:([^@]+)@/, ":***@");
  info(`REDIS_URL: ${maskedUrl}`);
  pass("REDIS_URL is set");

  // ── Step 1: ioredis basic connection ────────────────────────────────────────
  console.log("\n1️⃣   ioredis connection");

  const isTls = REDIS_URL.startsWith("rediss://");
  const redisClient = new Redis(REDIS_URL, {
    enableReadyCheck: false,
    maxRetriesPerRequest: 1,
    connectTimeout: 10_000,
    lazyConnect: true,
    ...(isTls ? { tls: { rejectUnauthorized: false } } : {}),
  });

  try {
    await redisClient.connect();
    pass("Connected to Redis via ioredis");
  } catch (err: any) {
    fail("Failed to connect", err);
    await redisClient.quit().catch(() => {});
    process.exit(1);
  }

  // ── Step 2: PING ─────────────────────────────────────────────────────────────
  console.log("\n2️⃣   PING");
  try {
    const pong = await redisClient.ping();
    if (pong === "PONG") {
      pass(`PING → ${pong}`);
    } else {
      fail(`Unexpected PING response: ${pong}`);
    }
  } catch (err: any) {
    fail("PING failed", err);
  }

  // ── Step 3: SET / GET / DEL ───────────────────────────────────────────────
  console.log("\n3️⃣   Basic SET / GET / DEL");
  const testKey = `cineprism:test:${Date.now()}`;
  const testValue = "hello-redis-test";

  try {
    await redisClient.set(testKey, testValue, "EX", 30);
    pass(`SET "${testKey}"`);

    const got = await redisClient.get(testKey);
    if (got === testValue) {
      pass(`GET returned correct value`);
    } else {
      fail(`GET returned unexpected value: "${got}"`);
    }

    await redisClient.del(testKey);
    const afterDel = await redisClient.get(testKey);
    if (afterDel === null) {
      pass("DEL confirmed — key no longer exists");
    } else {
      fail("DEL may not have worked — key still present");
    }
  } catch (err: any) {
    fail("SET/GET/DEL test failed", err);
  }

  // ── Step 4: SETEX / TTL ───────────────────────────────────────────────────
  console.log("\n4️⃣   SETEX / TTL");
  const ttlKey = `cineprism:test:ttl:${Date.now()}`;
  try {
    await redisClient.setex(ttlKey, 60, "ttl-test");
    const ttl = await redisClient.ttl(ttlKey);
    if (ttl > 0 && ttl <= 60) {
      pass(`SETEX with 60s TTL — TTL returned ${ttl}s`);
    } else {
      fail(`Unexpected TTL value: ${ttl}`);
    }
    await redisClient.del(ttlKey);
  } catch (err: any) {
    fail("SETEX/TTL test failed", err);
  }

  // ── Step 5: BullMQ queue connection ──────────────────────────────────────
  console.log("\n5️⃣   BullMQ queue connection");

  const bullConnection = {
    url: REDIS_URL,
    ...(isTls ? { tls: { rejectUnauthorized: false } } : {}),
  };

  const testQueue = new Queue(TEST_QUEUE, {
    connection: bullConnection,
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: true,
    },
  });

  try {
    // Verify queue can be accessed (BullMQ connects lazily; getJobCounts forces it)
    await testQueue.getJobCounts();
    pass(`BullMQ Queue "${TEST_QUEUE}" created and connected`);
  } catch (err: any) {
    fail("BullMQ queue connection failed", err);
    await testQueue.close().catch(() => {});
    await redisClient.quit().catch(() => {});
    process.exit(1);
  }

  // ── Step 6: Add job then remove it ────────────────────────────────────────
  console.log("\n6️⃣   BullMQ add job → remove job");
  try {
    const job = await testQueue.add("test-job", {
      message: "This is a test job — will be removed immediately",
      timestamp: Date.now(),
    });
    pass(`Job added — id: ${job.id}`);

    // Remove the job immediately
    await job.remove();
    pass("Job removed cleanly");

    // Confirm queue is empty
    const counts = await testQueue.getJobCounts("wait", "active", "delayed");
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    if (total === 0) {
      pass("Queue is empty after cleanup");
    } else {
      info(`Queue still has ${total} job(s) — may be timing related`);
    }
  } catch (err: any) {
    fail("BullMQ add/remove job test failed", err);
  }

  // ── Step 7: Drain and close queue ─────────────────────────────────────────
  console.log("\n7️⃣   Cleanup");
  try {
    await testQueue.obliterate({ force: true });
    pass(`Test queue "${TEST_QUEUE}" obliterated`);
  } catch (err: any) {
    // obliterate may fail if queue is already empty — not critical
    info(`Queue obliterate skipped: ${err?.message}`);
  }

  try {
    await testQueue.close();
    pass("BullMQ Queue connection closed");
  } catch (err: any) {
    fail("Failed to close BullMQ queue", err);
  }

  try {
    redisClient.disconnect();
    pass("ioredis connection closed");
  } catch (err: any) {
    fail("Failed to close ioredis connection", err);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`\n${SEP}`);
  console.log("  ✨  All Redis tests completed.");
  console.log(`${SEP}\n`);
}

main().catch((err) => {
  console.error("\n💥 Unexpected error:", err);
  process.exit(1);
});
