import client from "..";
import { Request, Response } from "express";
import axios from "axios";
import { getFromCache, setCache, deleteCache } from "../config/redis";
interface TrendingMovie {
  id: number;
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  release_date: Date;
  vote_average: number;
  vote_count: number;
  popularity_score: number;
  trending_rank: number;
  genre_ids: number[];
  last_updated: Date;
}

interface TMDBMovie {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  release_date: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids: number[];
}

// Get all trending movies (for frontend consumption)
export const getTrendingMovies = async (req: Request, res: Response) => {
  try {
    const cacheKey = "trending_movies";

    // Try cache first
    const cachedMovies = await getFromCache(cacheKey);

    if (cachedMovies) {
      console.log("📦 Cache HIT - returning cached trending movies");
      return res.status(200).json(JSON.parse(cachedMovies));
    }

    console.log("🔍 Cache MISS - fetching trending movies from database");

    const movies = await client.trendingMovie.findMany({
      orderBy: { trendingRank: "asc" },
      take: 20,
    });

    const formattedMovies: TrendingMovie[] = movies.map((movie) => ({
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

    const response = {
      success: true,
      data: formattedMovies,
      count: formattedMovies.length,
      last_updated: movies[0]?.lastUpdated || null,
    };

    // Cache for 10 minutes
    await setCache(cacheKey, JSON.stringify(response), 600);
    console.log("💾 Trending movies cached for 10 minutes");

    res.status(200).json(response);
  } catch (error: any) {
    console.error("Error fetching trending movies:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch trending movies",
      error: error.message,
    });
  }
};
// Manual refresh endpoint - fetches latest data from TMDB
export const refreshTrendingMovies = async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    // Log refresh attempt
    await client.contentRefreshLog.create({
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
    await client.trendingMovie.deleteMany({});
    console.log("🗑️  Cleared existing trending movies");

    // Insert new trending movies
    const insertedMovies = [];
    for (let i = 0; i < tmdbData.length; i++) {
      const movie = tmdbData[i];

      const insertedMovie = await client.trendingMovie.create({
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
    await client.contentRefreshLog.updateMany({
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

    console.log(
      `✅ Successfully refreshed ${insertedMovies.length} trending movies in ${processingTime}ms`
    );
    // Add this after successful database insertion
    await deleteCache("trending_movies");
    console.log("🗑️ Cleared trending movies cache");

    res.status(200).json({
      success: true,
      message: "Trending movies refreshed successfully",
      data: {
        movies_updated: insertedMovies.length,
        processing_time_ms: processingTime,
        last_updated: new Date(),
      },
    });
  } catch (error: any) {
    const processingTime = Date.now() - startTime;

    console.error("❌ Error refreshing trending movies:", error.message);

    // Log failed refresh
    await client.contentRefreshLog.updateMany({
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

// Fetch data from TMDB API
// Fetch data from TMDB API
const fetchFromTMDB = async (): Promise<TMDBMovie[]> => {
  const TMDB_API_KEY = process.env.TMDB_API_KEY;
  const BASE_URL = "https://api.themoviedb.org/3";

  if (!TMDB_API_KEY) {
    throw new Error("TMDB_API_KEY is not configured in environment variables");
  }

  try {
    // Get current date and date range for movies in theaters
    const today = new Date();
    const threeWeeksAgo = new Date(today);
    threeWeeksAgo.setDate(today.getDate() - 21);

    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + 7);

    const releaseDateGte = threeWeeksAgo.toISOString().split("T")[0];
    const releaseDateLte = futureDate.toISOString().split("T")[0];

    // Fetch movies from multiple regions
    const regions = ['US', 'IN', 'GB', 'CA', 'AU']; // US, India, UK, Canada, Australia
    const allMovies: TMDBMovie[] = [];

    // Fetch now playing movies from all regions
    for (const region of regions) {
      try {
        const nowPlayingResponse = await axios.get(
          `${BASE_URL}/movie/now_playing?api_key=${TMDB_API_KEY}&language=en-US&page=1&region=${region}`
        );
        
        if (nowPlayingResponse.data?.results) {
          allMovies.push(...nowPlayingResponse.data.results);
        }
      } catch (error: any) {
        console.warn(`Failed to fetch now playing for region ${region}:`, error.message);
      }
    }

    // Fetch discover endpoint without region restriction for global trending
    const discoverResponse = await axios.get(
      `${BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&language=en-US&sort_by=popularity.desc&include_adult=false&include_video=false&page=1&release_date.gte=${releaseDateGte}&release_date.lte=${releaseDateLte}&with_release_type=2|3`
    );

    if (discoverResponse.data?.results) {
      allMovies.push(...discoverResponse.data.results);
    }

    // Fetch popular movies from different language industries
    const languages = ['hi', 'te', 'ta', 'ml', 'kn']; // Hindi, Telugu, Tamil, Malayalam, Kannada
    
    for (const language of languages) {
      try {
        const languageResponse = await axios.get(
          `${BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&language=en-US&sort_by=popularity.desc&include_adult=false&page=1&release_date.gte=${releaseDateGte}&release_date.lte=${releaseDateLte}&with_original_language=${language}&with_release_type=2|3`
        );
        
        if (languageResponse.data?.results) {
          allMovies.push(...languageResponse.data.results);
        }
      } catch (error: any) {
        console.warn(`Failed to fetch movies for language ${language}:`, error.message);
      }
    }

    // Remove duplicates based on movie ID
    const movieMap = new Map<number, TMDBMovie>();

    allMovies.forEach((movie: TMDBMovie) => {
      if (!movieMap.has(movie.id)) {
        movieMap.set(movie.id, movie);
      }
    });

    // Convert map to array and sort by popularity
    const combinedMovies = Array.from(movieMap.values()).sort(
      (a, b) => b.popularity - a.popularity
    );

    // Get detailed information for top 20 movies
    const detailedMovies = await Promise.all(
      combinedMovies.slice(0, 20).map(async (movie: TMDBMovie) => {
        try {
          const detailResponse = await axios.get(
            `${BASE_URL}/movie/${movie.id}?api_key=${TMDB_API_KEY}`
          );

          return {
            ...movie,
            ...detailResponse.data,
          };
        } catch (detailError: any) {
          console.warn(
            `Failed to fetch details for movie ID ${movie.id}:`,
            detailError.message
          );
          return movie;
        }
      })
    );

    console.log(
      `🎭 Fetched ${detailedMovies.length} movies from multiple industries currently in theaters`
    );
    return detailedMovies;
  } catch (error: any) {
    if (error.response) {
      throw new Error(
        `TMDB API Error: ${error.response.status} - ${
          error.response.data?.status_message || error.message
        }`
      );
    }
    throw new Error(`Network Error: ${error.message}`);
  }
};

// Get refresh status and last update info
export const getRefreshStatus = async (req: Request, res: Response) => {
  try {
    const lastLog = await client.contentRefreshLog.findFirst({
      where: { sectionType: "movies" },
      orderBy: { lastRefreshAttempt: "desc" },
    });

    const movieCount = await client.trendingMovie.count();

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
  } catch (error: any) {
    console.error("Error fetching refresh status:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch refresh status",
      error: error.message,
    });
  }
};

// Get single movie by ID
export const getMovieById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const movie = await client.trendingMovie.findUnique({
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
  } catch (error: any) {
    console.error("Error fetching movie:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch movie",
      error: error.message,
    });
  }
};

export const editTrendingMoviesRank = async (req: Request, res: Response) => {
  try {
    const { movieData } = req.body;
    for (const movie of movieData) {
      await client.trendingMovie.update({
        where: { id: movie.id },
        data: { trendingRank: movie.trendingRank },
      });
    }
    // Add this after the rank update loop
    await deleteCache("trending_movies");
    console.log("🗑️ Cleared trending movies cache after rank update");
    res.status(200).json({
      success: true,
      message: "Movie rank updated successfully",
    });
  } catch (error: any) {
    console.log(error.message);
    res.status(500).json({
      success: false,
      message: "Failed to update movie rank",
      error: error.message,
    });
  }
};
