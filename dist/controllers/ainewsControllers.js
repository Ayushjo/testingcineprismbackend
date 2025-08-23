"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNewsById = exports.getRefreshStatus = exports.refreshTrendingNews = exports.getTrendingNews = void 0;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const __1 = __importDefault(require(".."));
const newsSources = [
    {
        name: 'Variety',
        url: 'https://variety.com/c/film/news/',
        baseUrl: 'https://variety.com',
        selector: {
            container: 'article.c-card',
            title: '.c-title__link',
            description: '.c-card__summary',
            link: '.c-title__link',
            image: '.c-card__image img',
            author: '.c-card__author',
            publishedAt: '.c-card__datetime'
        }
    },
    {
        name: 'The Hollywood Reporter',
        url: 'https://www.hollywoodreporter.com/c/movies/',
        baseUrl: 'https://www.hollywoodreporter.com',
        selector: {
            container: '.lrv-a-unstyle-link',
            title: '.c-title',
            description: '.c-dek',
            link: '',
            image: '.c-featured-image img'
        }
    },
    {
        name: 'Entertainment Weekly',
        url: 'https://ew.com/movies/',
        baseUrl: 'https://ew.com',
        selector: {
            container: '.card',
            title: '.card-title',
            description: '.card-summary',
            link: '.card-title a',
            image: '.card-img img'
        }
    }
];
// Keywords that indicate important entertainment news
const importantKeywords = [
    'dead', 'dies', 'death', 'passed away', 'obituary',
    'casting', 'cast', 'starring', 'joins',
    'director', 'directed by', 'helmed by',
    'box office', 'opening weekend', 'record breaking',
    'oscar', 'academy award', 'golden globe', 'emmy',
    'controversy', 'scandal', 'lawsuit', 'fired',
    'sequel', 'franchise', 'reboot', 'remake',
    'marvel', 'dc', 'disney', 'netflix', 'streaming',
    'premiere', 'release date', 'delayed', 'postponed'
];
// Get all trending news (for frontend consumption)
const getTrendingNews = async (req, res) => {
    try {
        const news = await __1.default.trendingNews.findMany({
            orderBy: [
                { trendingScore: 'desc' },
                { publishedAt: 'desc' }
            ],
            take: 15 // Limit to top 15 trending news
        });
        const formattedNews = news.map(article => ({
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
            last_updated: article.lastUpdated
        }));
        res.status(200).json({
            success: true,
            data: formattedNews,
            count: formattedNews.length,
            last_updated: news[0]?.lastUpdated || null
        });
    }
    catch (error) {
        console.error('Error fetching trending news:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch trending news',
            error: error.message
        });
    }
};
exports.getTrendingNews = getTrendingNews;
// Manual refresh endpoint - scrapes latest news
const scrapeNewsSource = async (source) => {
    const response = await axios_1.default.get(source.url, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
    });
    const $ = cheerio.load(response.data);
    const articles = [];
    $(source.selector.container).each((index, element) => {
        try {
            const $el = $(element);
            const title = $el.find(source.selector.title).text().trim();
            if (!title)
                return;
            let link = "";
            if (source.selector.link) {
                link = $el.find(source.selector.link).attr("href") || "";
            }
            else {
                link = $el.attr("href") || "";
            }
            if (link && !link.startsWith("http")) {
                link = (source.baseUrl || "") + link;
            }
            if (!link)
                return;
            const description = source.selector.description
                ? $el.find(source.selector.description).text().trim()
                : "";
            // Enhanced image extraction with multiple fallback strategies
            let imageUrl = "";
            if (source.selector.image) {
                // Try multiple image attributes and selectors
                const imageSelectors = [
                    source.selector.image,
                    "img",
                    ".featured-image img",
                    ".article-image img",
                    ".thumbnail img",
                    "[data-src]",
                    ".lazy-image",
                ];
                for (const selector of imageSelectors) {
                    const $img = $el.find(selector).first();
                    if ($img.length) {
                        // Try different attributes for image URL
                        imageUrl =
                            $img.attr("src") ||
                                $img.attr("data-src") ||
                                $img.attr("data-lazy-src") ||
                                $img.attr("data-original") ||
                                $img.attr("srcset")?.split(" ")[0] ||
                                "";
                        if (imageUrl)
                            break;
                    }
                }
                // If still no image, try background-image in style attribute
                if (!imageUrl) {
                    const bgImageEl = $el.find('[style*="background-image"]').first();
                    if (bgImageEl.length) {
                        const style = bgImageEl.attr("style") || "";
                        const bgMatch = style.match(/background-image:\s*url\(['"]?([^'"]+)['"]?\)/);
                        if (bgMatch) {
                            imageUrl = bgMatch[1];
                        }
                    }
                }
                // Convert relative URLs to absolute
                if (imageUrl && !imageUrl.startsWith("http")) {
                    if (imageUrl.startsWith("//")) {
                        imageUrl = "https:" + imageUrl;
                    }
                    else if (imageUrl.startsWith("/")) {
                        imageUrl = (source.baseUrl || "") + imageUrl;
                    }
                    else {
                        imageUrl = (source.baseUrl || "") + "/" + imageUrl;
                    }
                }
            }
            // If no image found, use a fallback based on category or source
            if (!imageUrl) {
                imageUrl = getDefaultImageForCategory("entertainment", source.name);
            }
            const author = source.selector.author
                ? $el.find(source.selector.author).text().trim()
                : undefined;
            // Try to extract publish date
            let publishedAt = new Date();
            if (source.selector.publishedAt) {
                const dateText = $el.find(source.selector.publishedAt).text().trim();
                const parsedDate = new Date(dateText);
                if (!isNaN(parsedDate.getTime())) {
                    publishedAt = parsedDate;
                }
            }
            articles.push({
                title,
                description: description || title,
                url: link,
                source_name: source.name,
                author,
                published_at: publishedAt,
                image_url: imageUrl || undefined,
                category: "entertainment",
            });
        }
        catch (error) {
            console.warn("Error parsing article:", error.message);
        }
    });
    return articles.filter((article) => article.title.length > 10 && article.url.startsWith("http"));
};
// Function to provide default images when scraping fails
const getDefaultImageForCategory = (category, sourceName) => {
    const defaultImages = {
        entertainment: [
            "https://images.unsplash.com/photo-1489599833486-55f4a22ea2c6?w=500&h=300&fit=crop",
            "https://images.unsplash.com/photo-1596727147705-61a532a659bd?w=500&h=300&fit=crop",
            "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=500&h=300&fit=crop",
            "https://images.unsplash.com/photo-1489599833486-55f4a22ea2c6?w=500&h=300&fit=crop",
        ],
        news: [
            "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=500&h=300&fit=crop",
            "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=500&h=300&fit=crop",
        ],
    };
    const images = defaultImages[category] ||
        defaultImages.entertainment;
    const hash = sourceName.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
    return images[hash % images.length];
};
// Alternative: Fetch image from article page
const fetchImageFromArticlePage = async (articleUrl) => {
    try {
        const response = await axios_1.default.get(articleUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
            timeout: 5000, // 5 second timeout
        });
        const $ = cheerio.load(response.data);
        // Try multiple selectors for article images
        const imageSelectors = [
            'meta[property="og:image"]',
            'meta[name="twitter:image"]',
            ".featured-image img",
            ".article-hero img",
            ".wp-post-image",
            "article img",
            ".content img",
        ];
        for (const selector of imageSelectors) {
            const $img = $(selector).first();
            let imgUrl = "";
            if (selector.includes("meta")) {
                imgUrl = $img.attr("content") || "";
            }
            else {
                imgUrl = $img.attr("src") || $img.attr("data-src") || "";
            }
            if (imgUrl && imgUrl.startsWith("http")) {
                return imgUrl;
            }
        }
        return null;
    }
    catch (error) {
        console.warn("Failed to fetch image from article page:", error);
        return null;
    }
};
// Enhanced refresh function that tries to get images from article pages
const refreshTrendingNews = async (req, res) => {
    const startTime = Date.now();
    try {
        // Log refresh attempt
        await __1.default.contentRefreshLog.create({
            data: {
                sectionType: "news",
                status: "in_progress",
            },
        });
        console.log("📰 Starting trending news refresh...");
        // Scrape from all news sources
        const allNews = [];
        for (const source of newsSources) {
            try {
                console.log(`🔍 Scraping ${source.name}...`);
                const scrapedNews = await scrapeNewsSource(source);
                // Try to enhance articles with images from their individual pages
                const enhancedNews = await Promise.all(scrapedNews.slice(0, 10).map(async (article, index) => {
                    // Limit to first 10 to avoid too many requests
                    if (!article.image_url && index < 5) {
                        // Only try for first 5 articles
                        console.log(`🖼️ Trying to fetch image for: ${article.title.substring(0, 50)}...`);
                        const fetchedImage = await fetchImageFromArticlePage(article.url);
                        if (fetchedImage) {
                            article.image_url = fetchedImage;
                            console.log(`✅ Found image for article`);
                        }
                        // Add small delay between requests
                        await new Promise((resolve) => setTimeout(resolve, 1000));
                    }
                    return article;
                }));
                // Add remaining articles without image enhancement
                const remainingNews = scrapedNews.slice(10);
                allNews.push(...enhancedNews, ...remainingNews);
                console.log(`✅ Scraped ${scrapedNews.length} articles from ${source.name}`);
                // Add delay between sources
                await new Promise((resolve) => setTimeout(resolve, 2000));
            }
            catch (error) {
                console.warn(`⚠️ Failed to scrape ${source.name}:`, error.message);
            }
        }
        if (allNews.length === 0) {
            throw new Error("No news articles were scraped from any source");
        }
        console.log(`📥 Total articles scraped: ${allNews.length}`);
        // Filter and score articles
        const scoredNews = scoreNewsArticles(allNews);
        const topNews = scoredNews.slice(0, 20); // Keep top 20
        // Clear existing trending news
        await __1.default.trendingNews.deleteMany({});
        console.log("🗑️ Cleared existing trending news");
        // Insert new trending news
        const insertedNews = [];
        for (const article of topNews) {
            try {
                const insertedArticle = await __1.default.trendingNews.create({
                    data: {
                        title: article.title,
                        description: article.description,
                        content: article.description, // Using description as content for now
                        url: article.url,
                        sourceName: article.source_name,
                        author: article.author || null,
                        publishedAt: article.published_at,
                        imageUrl: article.image_url || null,
                        category: article.category,
                        trendingScore: calculateTrendingScore(article),
                    },
                });
                insertedNews.push(insertedArticle);
            }
            catch (dbError) {
                console.warn(`Failed to insert article: ${article.title}`, dbError.message);
            }
        }
        const processingTime = Date.now() - startTime;
        // Log successful refresh
        await __1.default.contentRefreshLog.updateMany({
            where: {
                sectionType: "news",
                status: "in_progress",
            },
            data: {
                status: "success",
                lastSuccessfulRefresh: new Date(),
                recordsUpdated: insertedNews.length,
            },
        });
        console.log(`✅ Successfully refreshed ${insertedNews.length} trending news articles in ${processingTime}ms`);
        res.status(200).json({
            success: true,
            message: "Trending news refreshed successfully",
            data: {
                articles_updated: insertedNews.length,
                sources_scraped: newsSources.length,
                processing_time_ms: processingTime,
                last_updated: new Date(),
            },
        });
    }
    catch (error) {
        const processingTime = Date.now() - startTime;
        console.error("❌ Error refreshing trending news:", error.message);
        // Log failed refresh
        await __1.default.contentRefreshLog.updateMany({
            where: {
                sectionType: "news",
                status: "in_progress",
            },
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
// Score news articles based on importance
const scoreNewsArticles = (articles) => {
    return articles
        .map(article => ({
        ...article,
        score: calculateTrendingScore(article)
    }))
        .sort((a, b) => b.score - a.score);
};
// Calculate trending score for an article
const calculateTrendingScore = (article) => {
    let score = 50; // Base score
    const titleLower = article.title.toLowerCase();
    const descriptionLower = (article.description || '').toLowerCase();
    const content = titleLower + ' ' + descriptionLower;
    // Check for important keywords
    importantKeywords.forEach(keyword => {
        if (content.includes(keyword.toLowerCase())) {
            score += 15;
        }
    });
    // Boost score for recent articles
    const hoursOld = (Date.now() - article.published_at.getTime()) / (1000 * 60 * 60);
    if (hoursOld < 6)
        score += 20;
    else if (hoursOld < 12)
        score += 10;
    else if (hoursOld < 24)
        score += 5;
    // Boost for certain sources
    if (article.source_name === 'Variety')
        score += 10;
    if (article.source_name === 'The Hollywood Reporter')
        score += 8;
    return Math.min(score, 100); // Cap at 100
};
// Get refresh status
const getRefreshStatus = async (req, res) => {
    try {
        const lastLog = await __1.default.contentRefreshLog.findFirst({
            where: { sectionType: 'news' },
            orderBy: { lastRefreshAttempt: 'desc' }
        });
        const newsCount = await __1.default.trendingNews.count();
        res.status(200).json({
            success: true,
            data: {
                last_refresh_attempt: lastLog?.lastRefreshAttempt || null,
                last_successful_refresh: lastLog?.lastSuccessfulRefresh || null,
                status: lastLog?.status || 'never_run',
                error_message: lastLog?.errorMessage || null,
                records_count: newsCount,
                records_updated_last_run: lastLog?.recordsUpdated || 0
            }
        });
    }
    catch (error) {
        console.error('Error fetching refresh status:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch refresh status',
            error: error.message
        });
    }
};
exports.getRefreshStatus = getRefreshStatus;
// Get single news article by ID
const getNewsById = async (req, res) => {
    try {
        const { id } = req.params;
        const article = await __1.default.trendingNews.findUnique({
            where: { id: parseInt(id) }
        });
        if (!article) {
            return res.status(404).json({
                success: false,
                message: 'News article not found'
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
                last_updated: article.lastUpdated
            }
        });
    }
    catch (error) {
        console.error('Error fetching news article:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch news article',
            error: error.message
        });
    }
};
exports.getNewsById = getNewsById;
