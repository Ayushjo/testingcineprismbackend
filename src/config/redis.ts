import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL!;

const redisClient = new Redis(redisUrl, {
  enableReadyCheck: false,
  maxRetriesPerRequest: 1,
  connectTimeout: 5000,
  retryStrategy(times) {
    if (times > 10) return null;
    return Math.min(times * 500, 5000);
  },
});

redisClient.on("connect", () => {
  console.log("✅ Connected to Redis");
});

redisClient.on("error", (err) => {
  if (err?.message?.includes("MOVED")) {
    console.warn("⚠️ Ignoring MOVED redirect (expected for AWS Serverless Redis)");
    return;
  }
  console.error("❌ Redis error:", err.message);
});

const withTimeout = <T>(promise: Promise<T>, ms = 2000): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Redis timeout")), ms)
    ),
  ]);
};

// ---------- CACHING HELPERS ----------
export const setCache = async (key: string, value: string, ttl?: number) => {
  try {
    if (ttl) {
      await withTimeout(redisClient.setex(key, ttl, value));
    } else {
      await withTimeout(redisClient.set(key, value));
    }
  } catch (error) {
    console.error("Cache set error (non-fatal):", (error as Error).message);
  }
};

export const getFromCache = async (key: string): Promise<string | null> => {
  try {
    return await withTimeout(redisClient.get(key));
  } catch (error) {
    console.error("Cache get error (non-fatal):", (error as Error).message);
    return null;
  }
};

export const deleteCache = async (key: string) => {
  try {
    await withTimeout(redisClient.del(key));
  } catch (error) {
    console.error("Cache delete error (non-fatal):", (error as Error).message);
  }
};

export const getAllCacheKeys = async (): Promise<string[]> => {
  try {
    return await withTimeout(redisClient.keys("*"));
  } catch (error) {
    console.error("Get keys error (non-fatal):", (error as Error).message);
    return [];
  }
};

export const getCacheInfo = async (key: string) => {
  try {
    const value = await withTimeout(redisClient.get(key));
    const ttl = await withTimeout(redisClient.ttl(key));
    return {
      key,
      size: value ? Buffer.byteLength(value, "utf8") : 0,
      ttl: ttl === -1 ? "No expiry" : ttl === -2 ? "Expired" : `${ttl}s`,
      preview: value ? value.substring(0, 100) + "..." : null,
    };
  } catch (error) {
    console.error("Get cache info error (non-fatal):", (error as Error).message);
    return null;
  }
};

export const deleteCachePattern = async (pattern: string): Promise<number> => {
  try {
    const keys = await withTimeout(redisClient.keys(pattern));
    if (keys.length === 0) return 0;
    await withTimeout(redisClient.del(...keys));
    return keys.length;
  } catch (error) {
    console.error("Delete pattern error (non-fatal):", (error as Error).message);
    return 0;
  }
};

export const clearAllCache = async (): Promise<void> => {
  try {
    await withTimeout(redisClient.flushdb());
  } catch (error) {
    console.error("Clear all cache error (non-fatal):", (error as Error).message);
    throw error;
  }
};

export default redisClient;
