"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMovieById = exports.getRefreshStatus = exports.refreshTrendingMovies = exports.getTrendingMovies = void 0;
const __1 = __importDefault(require(".."));
const axios_1 = __importDefault(require("axios"));
// Get all trending movies (for frontend consumption)
const getTrendingMovies = async (req, res) => {
    try {
        const movies = await __1.default.trendingMovie.findMany({
            orderBy: { trendingRank: "asc" },
            take: 20, // Limit to top 20 trending movies
        });
        // Transform data for frontend
        const formattedMovies = movies.map((movie) => ({
            id: movie.id,
            tmdb_id: movie.tmdbId,
            title: movie.title,
            poster_path: movie.posterPath,
            backdrop_path: movie.backdropPath,
            overview: movie.overview || "",
            release_date: movie.releaseDate,
            vote_average: parseFloat(movie.voteAverage.toString()),
            vote_count: movie.voteCount,
            popularity_score: parseFloat(movie.popularityScore.toString()),
            trending_rank: movie.trendingRank,
            genre_ids: JSON.parse(movie.genreIds || "[]"),
            last_updated: movie.lastUpdated,
        }));
        res.status(200).json({
            success: true,
            data: formattedMovies,
            count: formattedMovies.length,
            last_updated: movies[0]?.lastUpdated || null,
        });
    }
    catch (error) {
        console.error("Error fetching trending movies:", error.message);
        res.status(500).json({
            success: false,
            message: "Failed to fetch trending movies",
            error: error.message,
        });
    }
};
exports.getTrendingMovies = getTrendingMovies;
// Manual refresh endpoint - fetches latest data from TMDB
const refreshTrendingMovies = async (req, res) => {
    const startTime = Date.now();
    try {
        // Log refresh attempt
        await __1.default.contentRefreshLog.create({
            data: {
                sectionType: "movies",
                status: "in_progress",
            },
        });
        console.log("🎬 Starting trending movies refresh...");
        // Fetch trending movies from TMDB
        const tmdbData = await fetchFromTMDB();
        if (!tmdbData || tmdbData.length === 0) {
            throw new Error("No data received from TMDB API");
        }
        console.log(`📥 Fetched ${tmdbData.length} movies from TMDB`);
        // Clear existing trending movies
        await __1.default.trendingMovie.deleteMany({});
        console.log("🗑️  Cleared existing trending movies");
        // Insert new trending movies
        const insertedMovies = [];
        for (let i = 0; i < tmdbData.length; i++) {
            const movie = tmdbData[i];
            const insertedMovie = await __1.default.trendingMovie.create({
                data: {
                    tmdbId: movie.id,
                    title: movie.title,
                    posterPath: movie.poster_path || null,
                    backdropPath: movie.backdrop_path || null,
                    overview: movie.overview || "",
                    releaseDate: new Date(movie.release_date),
                    voteAverage: movie.vote_average,
                    voteCount: movie.vote_count,
                    popularityScore: movie.popularity,
                    trendingRank: i + 1,
                    genreIds: JSON.stringify(movie.genre_ids || []),
                },
            });
            insertedMovies.push(insertedMovie);
        }
        const processingTime = Date.now() - startTime;
        // Log successful refresh
        await __1.default.contentRefreshLog.updateMany({
            where: {
                sectionType: "movies",
                status: "in_progress",
            },
            data: {
                status: "success",
                lastSuccessfulRefresh: new Date(),
                recordsUpdated: insertedMovies.length,
            },
        });
        console.log(`✅ Successfully refreshed ${insertedMovies.length} trending movies in ${processingTime}ms`);
        res.status(200).json({
            success: true,
            message: "Trending movies refreshed successfully",
            data: {
                movies_updated: insertedMovies.length,
                processing_time_ms: processingTime,
                last_updated: new Date(),
            },
        });
    }
    catch (error) {
        const processingTime = Date.now() - startTime;
        console.error("❌ Error refreshing trending movies:", error.message);
        // Log failed refresh
        await __1.default.contentRefreshLog.updateMany({
            where: {
                sectionType: "movies",
                status: "in_progress",
            },
            data: {
                status: "failed",
                errorMessage: error.message,
            },
        });
        res.status(500).json({
            success: false,
            message: "Failed to refresh trending movies",
            error: error.message,
            processing_time_ms: processingTime,
        });
    }
};
exports.refreshTrendingMovies = refreshTrendingMovies;
// Fetch data from TMDB API
const fetchFromTMDB = async () => {
    const TMDB_API_KEY = process.env.TMDB_API_KEY;
    const BASE_URL = "https://api.themoviedb.org/3";
    if (!TMDB_API_KEY) {
        throw new Error("TMDB_API_KEY is not configured in environment variables");
    }
    try {
        // Fetch trending movies for the week
        const trendingResponse = await axios_1.default.get(`${BASE_URL}/trending/movie/week?api_key=${TMDB_API_KEY}`);
        if (!trendingResponse.data || !trendingResponse.data.results) {
            throw new Error("Invalid response format from TMDB API");
        }
        const movies = trendingResponse.data.results;
        // Get detailed information for each movie
        const detailedMovies = await Promise.all(movies.slice(0, 20).map(async (movie) => {
            try {
                const detailResponse = await axios_1.default.get(`${BASE_URL}/movie/${movie.id}?api_key=${TMDB_API_KEY}`);
                return {
                    ...movie,
                    ...detailResponse.data,
                };
            }
            catch (detailError) {
                console.warn(`Failed to fetch details for movie ID ${movie.id}:`, detailError.message);
                return movie; // Return basic movie data if detailed fetch fails
            }
        }));
        return detailedMovies;
    }
    catch (error) {
        if (error.response) {
            throw new Error(`TMDB API Error: ${error.response.status} - ${error.response.data?.status_message || error.message}`);
        }
        throw new Error(`Network Error: ${error.message}`);
    }
};
// Get refresh status and last update info
const getRefreshStatus = async (req, res) => {
    try {
        const lastLog = await __1.default.contentRefreshLog.findFirst({
            where: { sectionType: "movies" },
            orderBy: { lastRefreshAttempt: "desc" },
        });
        const movieCount = await __1.default.trendingMovie.count();
        res.status(200).json({
            success: true,
            data: {
                last_refresh_attempt: lastLog?.lastRefreshAttempt || null,
                last_successful_refresh: lastLog?.lastSuccessfulRefresh || null,
                status: lastLog?.status || "never_run",
                error_message: lastLog?.errorMessage || null,
                records_count: movieCount,
                records_updated_last_run: lastLog?.recordsUpdated || 0,
            },
        });
    }
    catch (error) {
        console.error("Error fetching refresh status:", error.message);
        res.status(500).json({
            success: false,
            message: "Failed to fetch refresh status",
            error: error.message,
        });
    }
};
exports.getRefreshStatus = getRefreshStatus;
// Get single movie by ID
const getMovieById = async (req, res) => {
    try {
        const { id } = req.params;
        const movie = await __1.default.trendingMovie.findUnique({
            where: { id: parseInt(id) },
        });
        if (!movie) {
            return res.status(404).json({
                success: false,
                message: "Movie not found",
            });
        }
        res.status(200).json({
            success: true,
            data: {
                id: movie.id,
                tmdb_id: movie.tmdbId,
                title: movie.title,
                poster_path: movie.posterPath,
                backdrop_path: movie.backdropPath,
                overview: movie.overview,
                release_date: movie.releaseDate,
                vote_average: parseFloat(movie.voteAverage.toString()),
                vote_count: movie.voteCount,
                popularity_score: parseFloat(movie.popularityScore.toString()),
                trending_rank: movie.trendingRank,
                genre_ids: JSON.parse(movie.genreIds || "[]"),
                last_updated: movie.lastUpdated,
            },
        });
    }
    catch (error) {
        console.error("Error fetching movie:", error.message);
        res.status(500).json({
            success: false,
            message: "Failed to fetch movie",
            error: error.message,
        });
    }
};
exports.getMovieById = getMovieById;
