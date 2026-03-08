import { Router } from "express";
import {
  editTrendingMoviesRank,
  getMovieById,
  getRefreshStatus,
  getTrendingMovies,
  refreshTrendingMovies,
} from "../controllers/trendingMovieController";
import { validateRefreshToken } from "../middlewares/refresh";

const router = Router();

router.get("/", getTrendingMovies);

router.get("/:id", getMovieById);

router.post("/refresh", validateRefreshToken,refreshTrendingMovies);
router.get("/status/refresh", getRefreshStatus);
router.post("/edit-rank", editTrendingMoviesRank);
export default router;
