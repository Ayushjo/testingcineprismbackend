import Redis from "ioredis";

const redisClient = new Redis.Cluster(
  [
    {
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT),
    },
  ],
  {
    redisOptions: {
      tls: {}, // required for AWS Serverless Redis
    },
  }
);

redisClient.on("connect", () => {
  console.log("✅ Connected to AWS Redis Cluster");
});

redisClient.on("error", (err) => {
  console.error("❌ Redis error:", err);
});

// ---------- CACHING HELPERS ----------

export const setCache = async (key: string, value: string, ttl?: number) => {
  try {
    if (ttl) {
      await redisClient.setex(key, ttl, value);
    } else {
      await redisClient.set(key, value);
    }
  } catch (error) {
    console.error("Cache set error:", error);
  }
};

export const getFromCache = async (key: string): Promise<string | null> => {
  try {
    return await redisClient.get(key);
  } catch (error) {
    console.error("Cache get error:", error);
    return null;
  }
};

export const deleteCache = async (key: string) => {
  try {
    await redisClient.del(key);
  } catch (error) {
    console.error("Cache delete error:", error);
  }
};

export const getAllCacheKeys = async (): Promise<string[]> => {
  try {
    return await redisClient.keys("*");
  } catch (error) {
    console.error("Get keys error:", error);
    return [];
  }
};

export const getCacheInfo = async (key: string) => {
  try {
    const value = await redisClient.get(key);
    const ttl = await redisClient.ttl(key);

    return {
      key,
      size: value ? Buffer.byteLength(value, "utf8") : 0,
      ttl: ttl === -1 ? "No expiry" : ttl === -2 ? "Expired" : `${ttl}s`,
      preview: value ? value.substring(0, 100) + "..." : null,
    };
  } catch (error) {
    console.error("Get cache info error:", error);
    return null;
  }
};

export const deleteCachePattern = async (pattern: string): Promise<number> => {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length === 0) return 0;

    await redisClient.del(...keys);
    return keys.length;
  } catch (error) {
    console.error("Delete pattern error:", error);
    return 0;
  }
};

export const clearAllCache = async (): Promise<void> => {
  try {
    await redisClient.flushdb();
  } catch (error) {
    console.error("Clear all cache error:", error);
    throw error;
  }
};

export default redisClient;
