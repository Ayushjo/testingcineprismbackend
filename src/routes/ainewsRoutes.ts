// src/routes/newsRoutes.ts

import { Router } from "express";
import {
  getNewsById,
  getRefreshStatus,
  getTrendingNews,
  refreshTrendingNews,
  getNewsByCategory,
  searchNews,
} from "../controllers/ainewsControllers";
import { validateRefreshToken } from "../middlewares/refresh";

const router = Router();

router.route("/").get(getTrendingNews);
router.route("/search").get(searchNews);
router.route("/category/:category").get(getNewsByCategory);
router.route("/refresh").post(validateRefreshToken,refreshTrendingNews);
router.route("/status/refresh").get(getRefreshStatus);
router.route("/:id").get(getNewsById);

export default router;
