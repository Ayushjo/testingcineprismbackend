import { Response } from "express";
import { AuthorizedRequest } from "../middlewares/extractUser";
import {
  getAllCacheKeys,
  getCacheInfo,
  deleteCache,
  deleteCachePattern,
  clearAllCache,
} from "../config/redis";

// Get all cached items with details
export const listAllCaches = async (req: AuthorizedRequest, res: Response) => {
  try {
    const user = req.user;

    if (user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "You are not authorized",
      });
    }

    // Get all cache keys
    const keys = await getAllCacheKeys();

    if (keys.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No caches found",
        caches: [],
        totalCaches: 0,
      });
    }

    // Get detailed info for each cache
    const cacheDetails = await Promise.all(
      keys.map(async (key) => {
        const info = await getCacheInfo(key);
        return info;
      })
    );

    // Group caches by type
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

// Delete specific cache by key
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

// Delete multiple caches by pattern
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

// Delete all article caches
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

    // Delete all article-related caches
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

// Delete all post caches
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

// Clear ALL caches (nuclear option)
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
