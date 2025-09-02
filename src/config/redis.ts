import { createClient } from "redis";

const redisClient = createClient({
  url: process.env.REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 50, 1000),
  },
});

redisClient.on("error", (err) => {
  console.log("Redis Client Error:", err);
});

redisClient.on("connect", () => {
  console.log("✅ Connected to Railway Redis");
});

let isRedisConnected = false;

redisClient
  .connect()
  .then(() => {
    isRedisConnected = true;
    console.log("Redis connection established");
  })
  .catch((err:any) => {
    console.error("❌ Failed to connect to Redis:", err);
    isRedisConnected = false;
  });

export const getFromCache = async (key: string) => {
  if (!isRedisConnected) return null;
  try {
    return await redisClient.get(key);
  } catch (error) {
    console.error("Cache get error:", error);
    return null;
  }
};

export const setCache = async (key: string, value: string, ttl: number) => {
  if (!isRedisConnected) return;
  try {
    await redisClient.setEx(key, ttl, value);
  } catch (error) {
    console.error("Cache set error:", error);
  }
};

export const deleteCache = async (key: string) => {
  if (!isRedisConnected) return;
  try {
    await redisClient.del(key);
  } catch (error) {
    console.error("Cache delete error:", error);
  }
};

export default redisClient;
