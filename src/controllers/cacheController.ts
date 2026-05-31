import { Request, Response } from "express";
import { AuthorizedRequest } from "../middlewares/extractUser";
import redisClient, {
  getAllCacheKeys,
  getCacheInfo,
  deleteCache,
  deleteCachePattern,
  clearAllCache,
} from "../config/redis";

const NAMESPACE_PREFIXES = [
  "newsletter:plans",
  "newsletter:campaigns",
  "newsletter:stats",
  "trending:movies",
  "trending:news",
  "news:",
  "article:",
  "all_articles",
  "all_posts",
  "top_picks",
  "latest_reviews",
  "quotes",
  "genre:",
  "indie:",
  "post:",
];

function classifyKey(key: string): string {
  if (key === "all_articles") return "articles";
  if (key.startsWith("article:")) return "articles";
  if (key === "all_posts" || key === "top_picks" || key === "latest_reviews" || key.startsWith("post:")) return "posts";
  if (key === "quotes") return "quotes";
  if (key.startsWith("genre:")) return "genres";
  if (key.startsWith("indie:")) return "indie";
  if (key === "trending:movies") return "trending_movies";
  if (key === "trending:news") return "trending_news";
  if (key.startsWith("news:")) return "news";
  if (key === "newsletter:plans") return "newsletter";
  if (key === "newsletter:campaigns") return "newsletter";
  if (key === "newsletter:stats") return "newsletter";
  return "other";
}

export const checkRedisHealth = async (req: Request, res: Response) => {
  try {
    const start = Date.now();
    await redisClient.ping();
    const latencyMs = Date.now() - start;
    const status = redisClient.status;
    return res.status(200).json({
      connected: true,
      status,
      latencyMs,
      message: "Redis is healthy",
    });
  } catch (error: any) {
    return res.status(500).json({
      connected: false,
      status: redisClient.status,
      message: error.message,
    });
  }
};

export const listAllCaches = async (req: AuthorizedRequest, res: Response) => {
  try {
    const user = req.user;

    if (user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "You are not authorized",
      });
    }

    const keys = await getAllCacheKeys();

    if (keys.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No caches found",
        caches: [],
        totalCaches: 0,
      });
    }

    const cacheDetails = await Promise.all(
      keys.map(async (key) => {
        const info = await getCacheInfo(key);
        return info;
      })
    );

    const grouped = {
      articles: cacheDetails.filter((c) => c?.key.startsWith("article:")),
      allArticles: cacheDetails.filter((c) => c?.key === "all_articles"),
      posts: cacheDetails.filter((c) => c?.key === "all_posts"),
      topPicks: cacheDetails.filter((c) => c?.key === "top_picks"),
      latestReviews: cacheDetails.filter((c) => c?.key === "latest_reviews"),
      other: cacheDetails.filter(
        (c) =>
          c &&
          !c.key.startsWith("article:") &&
          ![
            "all_articles",
            "all_posts",
            "top_picks",
            "latest_reviews",
          ].includes(c.key)
      ),
    };

    res.status(200).json({
      success: true,
      totalCaches: keys.length,
      caches: cacheDetails,
      grouped,
      summary: {
        articles: grouped.articles.length,
        allArticles: grouped.allArticles.length,
        posts: grouped.posts.length,
        topPicks: grouped.topPicks.length,
        latestReviews: grouped.latestReviews.length,
        other: grouped.other.length,
      },
    });
  } catch (error: any) {
    console.error("Error listing caches:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to list caches",
      error: error.message,
    });
  }
};

export const deleteSingleCache = async (
  req: AuthorizedRequest,
  res: Response
) => {
  try {
    const user = req.user;
    const { key } = req.params;

    if (user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "You are not authorized",
      });
    }

    await deleteCache(key);

    console.log(`🗑️ Cache deleted by admin: ${key}`);

    res.status(200).json({
      success: true,
      message: `Cache deleted: ${key}`,
      deletedKey: key,
    });
  } catch (error: any) {
    console.error("Error deleting cache:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to delete cache",
      error: error.message,
    });
  }
};

export const deleteCachesByPattern = async (
  req: AuthorizedRequest,
  res: Response
) => {
  try {
    const user = req.user;
    const { pattern } = req.body;

    if (user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "You are not authorized",
      });
    }

    if (!pattern) {
      return res.status(400).json({
        success: false,
        message: "Pattern is required",
      });
    }

    const deletedCount = await deleteCachePattern(pattern);

    console.log(`🗑️ ${deletedCount} caches deleted by pattern: ${pattern}`);

    res.status(200).json({
      success: true,
      message: `Deleted ${deletedCount} cache(s) matching pattern: ${pattern}`,
      pattern,
      deletedCount,
    });
  } catch (error: any) {
    console.error("Error deleting caches by pattern:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to delete caches",
      error: error.message,
    });
  }
};

export const deleteAllArticleCaches = async (
  req: AuthorizedRequest,
  res: Response
) => {
  try {
    const user = req.user;

    if (user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "You are not authorized",
      });
    }


    const articleCount = await deleteCachePattern("article:*");
    await deleteCache("all_articles");

    const totalDeleted = articleCount + 1;

    console.log(`🗑️ All article caches deleted (${totalDeleted} items)`);

    res.status(200).json({
      success: true,
      message: `Deleted all article caches (${totalDeleted} items)`,
      deletedCount: totalDeleted,
    });
  } catch (error: any) {
    console.error("Error deleting article caches:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to delete article caches",
      error: error.message,
    });
  }
};


export const deleteAllPostCaches = async (
  req: AuthorizedRequest,
  res: Response
) => {
  try {
    const user = req.user;

    if (user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "You are not authorized",
      });
    }

    // Delete all post-related caches
    const postCount = await deleteCachePattern("post:*"); // ✅ Added individual posts
    await deleteCache("all_posts");
    await deleteCache("top_picks");
    await deleteCache("latest_reviews");

    const totalDeleted = postCount + 3;

    console.log(`🗑️ All post caches deleted (${totalDeleted} items)`);

    res.status(200).json({
      success: true,
      message: `Deleted all post caches (${totalDeleted} items)`,
      deletedCaches: [
        "all_posts",
        "top_picks",
        "latest_reviews",
        `${postCount} individual posts`,
      ],
    });
  } catch (error: any) {
    console.error("Error deleting post caches:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to delete post caches",
      error: error.message,
    });
  }
};


export const getCacheStats = async (req: AuthorizedRequest, res: Response) => {
  try {
    const user = req.user;

    if (user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "You are not authorized",
      });
    }

    const keys = await getAllCacheKeys();

    if (keys.length === 0) {
      return res.status(200).json({
        success: true,
        totalKeys: 0,
        totalSizeBytes: 0,
        byNamespace: {},
        keys: [],
        note: "Hit/miss counts are not tracked at the application level.",
      });
    }

    // Fetch TTL and size for all keys in parallel
    const keyDetails = await Promise.all(
      keys.map(async (key) => {
        const [value, ttl, memUsage] = await Promise.all([
          redisClient.get(key),
          redisClient.ttl(key),
          redisClient.call("MEMORY", "USAGE", key).catch(() => null),
        ]);

        return {
          key,
          namespace: classifyKey(key),
          ttlSeconds: ttl === -1 ? null : ttl === -2 ? 0 : ttl,
          sizeBytes: value ? Buffer.byteLength(value, "utf8") : 0,
          memoryBytes: typeof memUsage === "number" ? memUsage : null,
        };
      })
    );

    // Aggregate by namespace
    const byNamespace: Record<string, { count: number; totalSizeBytes: number; keys: string[] }> = {};
    let totalSizeBytes = 0;

    for (const detail of keyDetails) {
      if (!byNamespace[detail.namespace]) {
        byNamespace[detail.namespace] = { count: 0, totalSizeBytes: 0, keys: [] };
      }
      byNamespace[detail.namespace].count++;
      byNamespace[detail.namespace].totalSizeBytes += detail.sizeBytes;
      byNamespace[detail.namespace].keys.push(detail.key);
      totalSizeBytes += detail.sizeBytes;
    }

    return res.status(200).json({
      success: true,
      totalKeys: keys.length,
      totalSizeBytes,
      totalSizeKB: (totalSizeBytes / 1024).toFixed(2),
      byNamespace,
      keys: keyDetails,
      note: "Hit/miss counts are not tracked at the application level.",
    });
  } catch (error: any) {
    console.error("Error fetching cache stats:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch cache stats",
      error: error.message,
    });
  }
};

export const deleteAllCaches = async (
  req: AuthorizedRequest,
  res: Response
) => {
  try {
    const user = req.user;

    if (user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "You are not authorized",
      });
    }

    await clearAllCache();

    console.log(`🗑️ ALL caches cleared by admin: ${user.username}`);

    res.status(200).json({
      success: true,
      message: "All caches cleared successfully",
    });
  } catch (error: any) {
    console.error("Error clearing all caches:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to clear all caches",
      error: error.message,
    });
  }
};
