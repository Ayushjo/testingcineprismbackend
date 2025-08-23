import { Router } from "express";
import { getMovieById, getRefreshStatus, getTrendingMovies, refreshTrendingMovies } from "../controllers/trendingMovieController";

const router = Router();

router.get("/",getTrendingMovies);

router.get("/:id",getMovieById)

router.post("/refresh",refreshTrendingMovies)
router.get("/status/refresh",getRefreshStatus)

export default router