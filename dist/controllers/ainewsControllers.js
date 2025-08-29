"use strict";
// src/controllers/ainewsControllers.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchNews = exports.getNewsByCategory = exports.getNewsById = exports.getRefreshStatus = exports.refreshTrendingNews = exports.getTrendingNews = void 0;
const axios_1 = __importDefault(require("axios"));
const __1 = __importDefault(require(".."));
// NewsAPI Integration
const fetchFromNewsAPI = async () => {
    if (!process.env.NEWS_API_KEY) {
        throw new Error("NEWS_API_KEY is required in environment variables");
    }
    try {
        console.log("Fetching entertainment news from NewsAPI...");
        const response = await axios_1.default.get("https://newsapi.org/v2/everything", {
            params: {
                q: 'movies OR cinema OR hollywood OR film OR entertainment OR "box office" OR netflix OR disney OR marvel OR oscar',
                domains: "variety.com,ew.com,hollywoodreporter.com,thewrap.com,deadline.com,indiewire.com,slashfilm.com",
                language: "en",
                sortBy: "publishedAt",
                pageSize: 50,
                from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Last 7 days
            },
            headers: {
                "X-API-Key": process.env.NEWS_API_KEY,
            },
            timeout: 10000,
        });
        if (!response.data.articles || response.data.articles.length === 0) {
            console.log("No articles found from NewsAPI");
            return [];
        }
        const articles = response.data.articles
            .filter((article) => article.title &&
            article.url &&
            !article.title.includes("[Removed]") &&
            article.description &&
            article.description !== "[Removed]" &&
            article.title.length > 15 &&
            !article.url.includes("removed.com"))
            .map((article) => ({
            title: article.title.trim(),
            description: article.description?.trim() || "",
            content: article.content?.replace(/\[\+\d+ chars\]$/, "")?.trim() ||
                article.description?.trim() ||
                "",
            url: article.url,
            source_name: article.source.name,
            author: article.author || undefined,
            published_at: new Date(article.publishedAt),
            image_url: article.urlToImage || undefined,
            category: "entertainment",
        }));
        console.log(`NewsAPI: Found ${articles.length} articles`);
        return articles;
    }
    catch (error) {
        if (error.response?.status === 429) {
            throw new Error("NewsAPI rate limit exceeded. Please try again later.");
        }
        else if (error.response?.status === 401) {
            throw new Error("Invalid NewsAPI key. Please check your API key.");
        }
        else {
            throw new Error(`NewsAPI error: ${error.message}`);
        }
    }
};
// Alternative: Fetch from multiple entertainment RSS feeds as backup
const fetchFromRSSFeeds = async () => {
    const Parser = require("rss-parser");
    const rssParser = new Parser({
        customFields: {
            item: ["media:content", "media:thumbnail", "enclosure", "description"],
        },
    });
    const rssFeeds = [
        { name: "Variety", url: "https://variety.com/feed/" },
        { name: "Entertainment Weekly", url: "https://ew.com/feed/" },
        {
            name: "The Hollywood Reporter",
            url: "https://www.hollywoodreporter.com/feed/",
        },
        { name: "Deadline", url: "https://deadline.com/feed/" },
        { name: "IndieWire", url: "https://www.indiewire.com/feed/" },
    ];
    const allArticles = [];
    for (const feed of rssFeeds) {
        try {
            console.log(`RSS: Parsing ${feed.name}...`);
            const parsedFeed = await rssParser.parseURL(feed.url);
            const articles = parsedFeed.items
                .slice(0, 10)
                .map((item) => {
                // Extract image from RSS
                let imageUrl = "";
                if (item.enclosure?.url &&
                    item.enclosure.type?.startsWith("image/")) {
                    imageUrl = item.enclosure.url;
                }
                else if (item["media:content"]?.$?.url) {
                    imageUrl = item["media:content"].$.url;
                }
                else if (item["media:thumbnail"]?.$?.url) {
                    imageUrl = item["media:thumbnail"].$.url;
                }
                return {
                    title: item.title?.trim() || "",
                    description: item.contentSnippet?.trim() ||
                        item.content
                            ?.replace(/<[^>]*>/g, "")
                            .substring(0, 300)
                            .trim() ||
                        "",
                    content: item.content?.replace(/<[^>]*>/g, "").trim() || "",
                    url: item.link || "",
                    source_name: feed.name,
                    author: item.creator || item.author || undefined,
                    published_at: item.pubDate ? new Date(item.pubDate) : new Date(),
                    image_url: imageUrl || undefined,
                    category: "entertainment",
                };
            })
                .filter((article) => article.title.length > 15 && article.url);
            allArticles.push(...articles);
            // Add delay between requests
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        catch (error) {
            console.warn(`RSS parsing failed for ${feed.name}:`, error.message);
        }
    }
    console.log(`RSS: Total articles collected: ${allArticles.length}`);
    return allArticles;
};
// Keywords that indicate important entertainment news
const importantKeywords = [
    "casting",
    "cast",
    "starring",
    "joins",
    "director",
    "directed by",
    "box office",
    "opening weekend",
    "record breaking",
    "oscar",
    "academy award",
    "golden globe",
    "emmy",
    "controversy",
    "scandal",
    "sequel",
    "franchise",
    "reboot",
    "remake",
    "marvel",
    "dc",
    "disney",
    "netflix",
    "streaming",
    "premiere",
    "release date",
    "delayed",
    "postponed",
    "exclusive",
    "breaking",
    "first look",
    "review",
    "trailer",
    "blockbuster",
];
// Calculate trending score for articles
const calculateTrendingScore = (article) => {
    let score = 50;
    const content = (article.title +
        " " +
        (article.description || "")).toLowerCase();
    // Keyword scoring
    importantKeywords.forEach((keyword) => {
        if (content.includes(keyword.toLowerCase())) {
            score += 15;
        }
    });
    // Content quality
    if (article.content && article.content.length > 500)
        score += 20;
    else if (article.content && article.content.length > 200)
        score += 10;
    if (article.description && article.description.length > 100)
        score += 10;
    if (article.image_url)
        score += 15;
    if (article.author)
        score += 5;
    // Recency scoring
    const hoursOld = (Date.now() - article.published_at.getTime()) / (1000 * 60 * 60);
    if (hoursOld < 6)
        score += 25;
    else if (hoursOld < 24)
        score += 15;
    else if (hoursOld < 72)
        score += 10;
    // Source reliability
    const premiumSources = [
        "Variety",
        "Hollywood Reporter",
        "Entertainment Weekly",
        "Deadline",
        "IndieWire",
    ];
    if (premiumSources.some((source) => article.source_name.includes(source))) {
        score += 12;
    }
    return Math.max(score, 0);
};
// Remove duplicate articles
const removeDuplicateArticles = (articles) => {
    const seen = new Set();
    const unique = [];
    for (const article of articles) {
        const signature = article.title
            .toLowerCase()
            .replace(/[^\w\s]/g, "")
            .trim();
        if (!seen.has(signature) && signature.length > 15) {
            seen.add(signature);
            unique.push(article);
        }
    }
    return unique;
};
// Controllers
const getTrendingNews = async (req, res) => {
    try {
        console.log("Fetching trending news from database...");
        const news = await __1.default.trendingNews.findMany({
            orderBy: [{ trendingScore: "desc" }, { publishedAt: "desc" }],
            take: 20,
        });
        const formattedNews = news.map((article, index) => ({
            id: article.id,
            title: article.title,
            description: article.description,
            content: article.content ?? undefined,
            url: article.url,
            source_name: article.sourceName,
            author: article.author,
            published_at: article.publishedAt,
            image_url: article.imageUrl,
            category: article.category,
            trending_score: article.trendingScore,
            trending_rank: index + 1,
        }));
        res.status(200).json({
            success: true,
            data: formattedNews,
            meta: {
                count: formattedNews.length,
                last_updated: news[0]?.lastUpdated || null,
                sources: [...new Set(news.map((n) => n.sourceName))],
            },
        });
    }
    catch (error) {
        console.error("Error fetching trending news:", error.message);
        res.status(500).json({
            success: false,
            message: "Failed to fetch trending news",
            error: error.message,
        });
    }
};
exports.getTrendingNews = getTrendingNews;
const refreshTrendingNews = async (req, res) => {
    const startTime = Date.now();
    try {
        await __1.default.contentRefreshLog.create({
            data: {
                sectionType: "news",
                status: "in_progress",
            },
        });
        console.log("Starting news refresh with NewsAPI...");
        let allNews = [];
        // Try NewsAPI first (primary source)
        try {
            const newsApiArticles = await fetchFromNewsAPI();
            allNews.push(...newsApiArticles);
            console.log(`NewsAPI: Collected ${newsApiArticles.length} articles`);
        }
        catch (newsApiError) {
            console.warn("NewsAPI failed, falling back to RSS:", newsApiError.message);
            // Fallback to RSS feeds if NewsAPI fails
            const rssArticles = await fetchFromRSSFeeds();
            allNews.push(...rssArticles);
            console.log(`RSS Fallback: Collected ${rssArticles.length} articles`);
        }
        if (allNews.length === 0) {
            throw new Error("No articles were collected from any source");
        }
        // Process and score articles
        const uniqueArticles = removeDuplicateArticles(allNews);
        console.log(`Unique articles: ${uniqueArticles.length}`);
        const scoredNews = uniqueArticles
            .map((article) => ({
            ...article,
            score: calculateTrendingScore(article),
        }))
            .sort((a, b) => b.score - a.score);
        const topNews = scoredNews;
        // Update database
        await __1.default.trendingNews.deleteMany({});
        console.log("Cleared existing trending news");
        const insertedNews = [];
        for (const article of topNews) {
            try {
                const insertedArticle = await __1.default.trendingNews.create({
                    data: {
                        title: article.title.substring(0, 255),
                        description: article.description?.substring(0, 500) || "",
                        content: article.content?.substring(0, 2000) ||
                            article.description?.substring(0, 500) ||
                            "",
                        url: article.url,
                        sourceName: article.source_name,
                        author: article.author?.substring(0, 100) || null,
                        publishedAt: article.published_at,
                        imageUrl: article.image_url || null,
                        category: article.category,
                        trendingScore: article.score,
                    },
                });
                insertedNews.push(insertedArticle);
            }
            catch (dbError) {
                console.warn(`Failed to insert article: ${article.title.substring(0, 50)}...`);
            }
        }
        const processingTime = Date.now() - startTime;
        await __1.default.contentRefreshLog.updateMany({
            where: { sectionType: "news", status: "in_progress" },
            data: {
                status: "success",
                lastSuccessfulRefresh: new Date(),
                recordsUpdated: insertedNews.length,
            },
        });
        console.log(`Successfully refreshed ${insertedNews.length} articles in ${processingTime}ms`);
        res.status(200).json({
            success: true,
            message: "Trending news refreshed successfully",
            data: {
                articles_updated: insertedNews.length,
                total_collected: allNews.length,
                unique_articles: uniqueArticles.length,
                processing_time_ms: processingTime,
                source_used: allNews.length > 0 && allNews[0].source_name.includes("NewsAPI")
                    ? "NewsAPI"
                    : "RSS_Fallback",
            },
        });
    }
    catch (error) {
        const processingTime = Date.now() - startTime;
        console.error("Error refreshing trending news:", error.message);
        await __1.default.contentRefreshLog.updateMany({
            where: { sectionType: "news", status: "in_progress" },
            data: {
                status: "failed",
                errorMessage: error.message,
            },
        });
        res.status(500).json({
            success: false,
            message: "Failed to refresh trending news",
            error: error.message,
            processing_time_ms: processingTime,
        });
    }
};
exports.refreshTrendingNews = refreshTrendingNews;
const getRefreshStatus = async (req, res) => {
    try {
        const lastLog = await __1.default.contentRefreshLog.findFirst({
            where: { sectionType: "news" },
            orderBy: { id: "desc" },
        });
        const newsCount = await __1.default.trendingNews.count();
        res.status(200).json({
            success: true,
            data: {
                last_successful_refresh: lastLog?.lastSuccessfulRefresh || null,
                status: lastLog?.status || "never_run",
                error_message: lastLog?.errorMessage || null,
                articles_count: newsCount,
                records_updated: lastLog?.recordsUpdated || 0,
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
const getNewsById = async (req, res) => {
    try {
        const { id } = req.params;
        const article = await __1.default.trendingNews.findUnique({
            where: { id: parseInt(id) },
        });
        if (!article) {
            return res.status(404).json({
                success: false,
                message: "News article not found",
            });
        }
        res.status(200).json({
            success: true,
            data: {
                id: article.id,
                title: article.title,
                description: article.description,
                content: article.content,
                url: article.url,
                source_name: article.sourceName,
                author: article.author,
                published_at: article.publishedAt,
                image_url: article.imageUrl,
                category: article.category,
                trending_score: article.trendingScore,
            },
        });
    }
    catch (error) {
        console.error("Error fetching news article:", error.message);
        res.status(500).json({
            success: false,
            message: "Failed to fetch news article",
            error: error.message,
        });
    }
};
exports.getNewsById = getNewsById;
// Optional: Get news by category
const getNewsByCategory = async (req, res) => {
    try {
        const { category = "entertainment" } = req.params;
        const { limit = 10 } = req.query;
        const news = await __1.default.trendingNews.findMany({
            where: { category },
            orderBy: [{ trendingScore: "desc" }, { publishedAt: "desc" }],
            take: parseInt(limit),
        });
        res.status(200).json({
            success: true,
            data: news.map((article) => ({
                id: article.id,
                title: article.title,
                description: article.description,
                url: article.url,
                source_name: article.sourceName,
                author: article.author,
                published_at: article.publishedAt,
                image_url: article.imageUrl,
                trending_score: article.trendingScore,
            })),
            meta: {
                category,
                count: news.length,
            },
        });
    }
    catch (error) {
        console.error("Error fetching news by category:", error.message);
        res.status(500).json({
            success: false,
            message: "Failed to fetch news by category",
            error: error.message,
        });
    }
};
exports.getNewsByCategory = getNewsByCategory;
// Search news articles
const searchNews = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || typeof q !== "string") {
            return res.status(400).json({
                success: false,
                message: "Search query is required",
            });
        }
        const news = await __1.default.trendingNews.findMany({
            where: {
                OR: [
                    { title: { contains: q, mode: "insensitive" } },
                    { description: { contains: q, mode: "insensitive" } },
                    { content: { contains: q, mode: "insensitive" } },
                ],
            },
            orderBy: [{ trendingScore: "desc" }, { publishedAt: "desc" }],
            take: 50,
        });
        res.status(200).json({
            success: true,
            data: news.map((article) => ({
                id: article.id,
                title: article.title,
                description: article.description,
                url: article.url,
                source_name: article.sourceName,
                author: article.author,
                published_at: article.publishedAt,
                image_url: article.imageUrl,
                trending_score: article.trendingScore,
            })),
            meta: {
                query: q,
                count: news.length,
            },
        });
    }
    catch (error) {
        console.error("Error searching news:", error.message);
        res.status(500).json({
            success: false,
            message: "Failed to search news",
            error: error.message,
        });
    }
};
exports.searchNews = searchNews;
