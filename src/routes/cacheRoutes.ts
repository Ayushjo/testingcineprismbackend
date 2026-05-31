import { Router } from "express";
import {
  checkRedisHealth,
  listAllCaches,
  getCacheStats,
  deleteSingleCache,
  deleteCachesByPattern,
  deleteAllArticleCaches,
  deleteAllPostCaches,
  deleteAllCaches,
} from "../controllers/cacheController.js";
import { extractUserDetails } from "../middlewares/extractUser.js";

const router = Router();

// Public health check — no auth needed
router.get("/health", checkRedisHealth);

// Cache stats summary (admin only)
router.get("/stats", extractUserDetails, getCacheStats);

// Get all caches
router.get("/list", extractUserDetails, listAllCaches);

// Delete specific cache
router.delete("/delete/:key", extractUserDetails, deleteSingleCache);

// Delete by pattern
router.post("/delete-pattern", extractUserDetails, deleteCachesByPattern);

// Delete all article caches
router.delete("/delete-all-articles", extractUserDetails, deleteAllArticleCaches);

// Delete all post caches
router.delete("/delete-all-posts", extractUserDetails, deleteAllPostCaches);

// Delete ALL caches (nuclear option)
router.delete("/delete-all", extractUserDetails, deleteAllCaches);

export default router;
