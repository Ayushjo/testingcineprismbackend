import { Router } from "express";
import {
  getNewsById,
  getRefreshStatus,
  getTrendingNews,
  refreshTrendingNews,
} from "../controllers/ainewsControllers";

const router = Router();

router.route("/").get(getTrendingNews);
router.route("/:id").get(getNewsById);
router.route("/refresh").post(refreshTrendingNews);
router.route("/status/refresh").get(getRefreshStatus);

export default router;
