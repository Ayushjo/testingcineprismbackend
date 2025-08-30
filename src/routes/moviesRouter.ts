import { Router } from "express";
import {
  editTrendingMoviesRank,
  getMovieById,
  getRefreshStatus,
  getTrendingMovies,
  refreshTrendingMovies,
} from "../controllers/trendingMovieController";

const router = Router();

router.get("/", getTrendingMovies);

router.get("/:id", getMovieById);

router.post("/refresh", refreshTrendingMovies);
router.get("/status/refresh", getRefreshStatus);
router.post("/edit-rank", editTrendingMoviesRank);
export default router;
