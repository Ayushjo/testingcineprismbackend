// src/controllers/ainewsControllers.ts

import { Request, Response } from "express";
import axios from "axios";
import * as cheerio from "cheerio";
import Parser from "rss-parser";
import client from "..";
import { ScrapedNews, NewsSource, RSSFeed } from "../types/news";
import { newsSources, rssFeeds } from "../config/newsSources";

// RSS Parser setup
const rssParser = new Parser({
  customFields: {
    item: ["media:content", "media:thumbnail", "enclosure", "description"],
  },
});

// Keywords that indicate important entertainment news
const importantKeywords = [
  "dead",
  "dies",
  "death",
  "passed away",
  "obituary",
  "casting",
  "cast",
  "starring",
  "joins",
  "director",
  "directed by",
  "helmed by",
  "box office",
  "opening weekend",
  "record breaking",
  "oscar",
  "academy award",
  "golden globe",
  "emmy",
  "controversy",
  "scandal",
  "lawsuit",
  "fired",
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
];

// Cache for Unsplash images to avoid hitting rate limits
const unsplashImageCache = new Map<string, string>();

// Unsplash API Integration
const fetchUnsplashImage = async (
  searchQuery: string
): Promise<string | undefined> => {
  try {
    // Check if we have the API key
    if (!process.env.UNSPLASH_ACCESS_KEY) {
      console.warn("Unsplash API key not found in environment variables");
      return undefined;
    }

    // Clean and optimize search query
    const cleanQuery = searchQuery
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(" ")
      .filter(
        (word) =>
          word.length > 3 &&
          !["the", "and", "for", "with", "from", "about"].includes(word)
      )
      .slice(0, 3)
      .join(" ");

    // Check cache first
    if (unsplashImageCache.has(cleanQuery)) {
      console.log(`Using cached Unsplash image for: ${cleanQuery}`);
      return unsplashImageCache.get(cleanQuery);
    }

    console.log(`Fetching Unsplash image for: ${cleanQuery}`);

    const response = await axios.get("https://api.unsplash.com/search/photos", {
      params: {
        query: cleanQuery || "entertainment cinema movie",
        per_page: 1,
        orientation: "landscape",
        content_filter: "high",
      },
      headers: {
        Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`,
      },
      timeout: 5000,
    });

    if (response.data.results && response.data.results.length > 0) {
      const imageUrl =
        response.data.results[0].urls.regular ||
        response.data.results[0].urls.small;

      // Cache the result
      unsplashImageCache.set(cleanQuery, imageUrl);

      // Clear cache if it gets too large
      if (unsplashImageCache.size > 100) {
        const firstKey = unsplashImageCache.keys().next().value;
        if (typeof firstKey === "string") {
          unsplashImageCache.delete(firstKey);
        }
      }

      return imageUrl;
    }

    // Fallback query if no results
    if (
      !cleanQuery.includes("entertainment") &&
      !cleanQuery.includes("movie")
    ) {
      return fetchUnsplashImage("entertainment movie cinema");
    }

    return undefined;
  } catch (error: any) {
    console.warn(`Unsplash API error: ${error.message}`);

    // If rate limited, return a default placeholder
    if (error.response?.status === 403) {
      console.warn("Unsplash rate limit reached, using fallback");
      return getDefaultFallbackImage();
    }

    return undefined;
  }
};

// Get a default fallback image when everything else fails
const getDefaultFallbackImage = (): string => {
  // You can replace this with your own default image URL
  const fallbackImages = [
    "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&q=80", // Cinema
    "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800&q=80", // Movie theater
    "https://images.unsplash.com/photo-1524712245354-2c4e5e7121c0?w=800&q=80", // Hollywood
    "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=800&q=80", // Film reel
    "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&q=80", // Film production
  ];

  // Return a random fallback image
  return fallbackImages[Math.floor(Math.random() * fallbackImages.length)];
};

// Enhanced function to get appropriate image for article
const getArticleImage = async (
  article: ScrapedNews
): Promise<string | undefined> => {
  // If article already has an image, validate and return it
  if (article.image_url) {
    // Check if the image URL is valid
    if (
      article.image_url.startsWith("http") &&
      !article.image_url.includes("placeholder")
    ) {
      return article.image_url;
    }
  }

  // Try to fetch from Unsplash based on article content
  const searchTerms = extractSearchTerms(article);

  for (const term of searchTerms) {
    const unsplashImage = await fetchUnsplashImage(term);
    if (unsplashImage) {
      return unsplashImage;
    }

    // Add small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  // Return a default fallback image
  return getDefaultFallbackImage();
};

// Extract relevant search terms from article for image search
const extractSearchTerms = (article: ScrapedNews): string[] => {
  const terms: string[] = [];

  // Primary search based on title
  if (article.title) {
    terms.push(article.title.substring(0, 50));
  }

  // Look for celebrity/movie names in title
  const titleWords = article.title.toLowerCase().split(" ");
  const content = (
    article.title +
    " " +
    (article.description || "")
  ).toLowerCase();

  // Check for specific entertainment entities
  if (content.includes("marvel")) terms.push("marvel superhero movie");
  if (content.includes("disney")) terms.push("disney movie");
  if (content.includes("netflix")) terms.push("netflix streaming");
  if (content.includes("oscar") || content.includes("academy"))
    terms.push("oscar academy awards");
  if (content.includes("box office")) terms.push("movie box office cinema");
  if (content.includes("premiere")) terms.push("movie premiere red carpet");
  if (content.includes("trailer")) terms.push("movie trailer cinema");

  // Generic fallback
  terms.push("entertainment news cinema");

  return terms;
};

// RSS Feed Scraping
const scrapeFromRSS = async (
  feedUrl: string,
  sourceName: string
): Promise<ScrapedNews[]> => {
  try {
    console.log(`RSS: Parsing ${sourceName}...`);
    const feed = await rssParser.parseURL(feedUrl);

    const articles: ScrapedNews[] = [];

    for (const item of feed.items.slice(0, 15)) {
      // Extract image from various RSS fields
      let imageUrl = "";

      if (item.enclosure?.url && item.enclosure.type?.startsWith("image/")) {
        imageUrl = item.enclosure.url;
      } else if ((item as any)["media:content"]?.$?.url) {
        imageUrl = (item as any)["media:content"].$.url;
      } else if ((item as any)["media:thumbnail"]?.$?.url) {
        imageUrl = (item as any)["media:thumbnail"].$.url;
      }

      const title =
        item.title
          ?.replace(/&#\d+;/g, "")
          .replace(/&[a-zA-Z0-9]+;/g, "")
          .trim() || "";
      const description =
        item.contentSnippet
          ?.replace(/&#\d+;/g, "")
          .replace(/&[a-zA-Z0-9]+;/g, "")
          .trim() ||
        item.content
          ?.replace(/<[^>]*>/g, "")
          .replace(/&#\d+;/g, "")
          .substring(0, 300)
          .trim() ||
        "";

      if (title && item.link && title.length > 15) {
        articles.push({
          title,
          description,
          content: description,
          url: item.link,
          source_name: sourceName,
          author: (item as any).creator || (item as any).author || undefined,
          published_at: item.pubDate ? new Date(item.pubDate) : new Date(),
          image_url: imageUrl || undefined,
          category: "entertainment",
        });
      }
    }

    console.log(`RSS: Found ${articles.length} articles from ${sourceName}`);
    return articles;
  } catch (error: any) {
    console.warn(`RSS parsing failed for ${sourceName}:`, error.message);
    return [];
  }
};

// News API Integration (commented out for now - uncomment when you get API key)
const fetchFromNewsAPI = async (): Promise<ScrapedNews[]> => {
  console.log("News API integration disabled - no API key provided");
  return [];

  /* Uncomment this when you have NewsAPI key:
  if (!process.env.NEWS_API_KEY) {
    console.log('News API key not provided, skipping News API');
    return [];
  }

  try {
    const NewsAPI = require('newsapi');
    const newsapi = new NewsAPI(process.env.NEWS_API_KEY);
    
    console.log('Fetching from News API...');
    
    const response = await newsapi.v2.everything({
      q: 'movies OR cinema OR hollywood OR film OR entertainment',
      domains: 'variety.com,ew.com,hollywoodreporter.com,thewrap.com,deadline.com',
      language: 'en',
      sortBy: 'publishedAt',
      pageSize: 25,
      from: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() // Last 5 days
    });

    if (!response.articles || response.articles.length === 0) {
      console.log('No articles found from News API');
      return [];
    }

    const articles: ScrapedNews[] = response.articles
      .filter(article => 
        article.title && 
        article.url && 
        !article.title.includes('[Removed]') &&
        article.description &&
        article.description !== '[Removed]'
      )
      .map(article => ({
        title: article.title,
        description: article.description || '',
        content: article.content?.replace(/\[\+\d+ chars\]$/, '') || article.description || '',
        url: article.url,
        source_name: article.source.name,
        author: article.author || undefined,
        published_at: new Date(article.publishedAt),
        image_url: article.urlToImage || undefined,
        category: 'entertainment'
      }));

    console.log(`News API: Found ${articles.length} articles`);
    return articles;

  } catch (error: any) {
    console.warn('News API error:', error.message);
    return [];
  }
  */
};

// Enhanced full article content extraction
const scrapeFullArticle = async (
  articleUrl: string
): Promise<{ content: string; image: string }> => {
  try {
    const response = await axios.get(articleUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      },
      timeout: 12000,
      maxRedirects: 3,
    });

    const $ = cheerio.load(response.data);
    $(
      "script, style, nav, header, footer, aside, .advertisement, .ads, .social-share"
    ).remove();

    // Extract main content
    const contentSelectors = [
      "article .entry-content",
      "article .post-content",
      "article .article-body",
      '[data-module="ArticleBody"]',
      ".story-body",
      ".article-content",
      "main article",
      ".post-body",
      ".content",
    ];

    let fullContent = "";
    for (const selector of contentSelectors) {
      const contentEl = $(selector);
      if (contentEl.length) {
        const paragraphs = contentEl
          .find("p")
          .map((_, el) => $(el).text().trim())
          .get();
        const content = paragraphs.join(" ").trim();

        if (content && content.length > 200) {
          fullContent = content.substring(0, 1500);
          break;
        }
      }
    }

    // Extract featured image
    const imageSelectors = [
      'meta[property="og:image"]',
      'meta[name="twitter:image"]',
      ".featured-image img",
      ".hero-image img",
      "article img",
      ".wp-post-image",
    ];

    let featuredImage = "";
    for (const selector of imageSelectors) {
      let imgUrl = "";

      if (selector.includes("meta")) {
        imgUrl = $(selector).attr("content") || "";
      } else {
        const img = $(selector).first();
        imgUrl = img.attr("src") || img.attr("data-src") || "";
      }

      if (imgUrl && (imgUrl.startsWith("http") || imgUrl.startsWith("//"))) {
        featuredImage = imgUrl.startsWith("//") ? "https:" + imgUrl : imgUrl;
        break;
      }
    }

    return { content: fullContent || "", image: featuredImage || "" };
  } catch (error: any) {
    console.warn("Failed to scrape full article:", error.message);
    return { content: "", image: "" };
  }
};

// Enhanced web scraping
const scrapeNewsSource = async (source: NewsSource): Promise<ScrapedNews[]> => {
  try {
    console.log(`Web Scraping: ${source.name}...`);

    const response = await axios.get(source.url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);
    const articles: ScrapedNews[] = [];

    $(source.selector.container).each((index, element) => {
      if (index >= 15) return false;

      try {
        const $el = $(element);

        const title = $el.find(source.selector.title).text().trim();
        if (!title || title.length < 15) return;

        let link = "";
        if (source.selector.link) {
          link = $el.find(source.selector.link).attr("href") || "";
        } else {
          link = $el.attr("href") || "";
        }

        if (link && !link.startsWith("http")) {
          if (link.startsWith("//")) {
            link = "https:" + link;
          } else if (link.startsWith("/")) {
            link = source.baseUrl + link;
          } else {
            link = source.baseUrl + "/" + link;
          }
        }
        if (!link || !link.startsWith("http")) return;

        const description = source.selector.description
          ? $el.find(source.selector.description).text().trim()
          : "";

        // Enhanced image extraction
        let imageUrl = "";
        if (source.selector.image) {
          const imageSelectors = [
            source.selector.image,
            "img",
            ".lazy-image",
            "[data-src]",
          ];

          for (const imgSelector of imageSelectors) {
            const $img = $el.find(imgSelector).first();
            if ($img.length) {
              imageUrl =
                $img.attr("src") ||
                $img.attr("data-src") ||
                $img.attr("data-lazy-src") ||
                "";

              if (imageUrl) break;
            }
          }

          if (imageUrl && !imageUrl.startsWith("http")) {
            if (imageUrl.startsWith("//")) {
              imageUrl = "https:" + imageUrl;
            } else if (imageUrl.startsWith("/")) {
              imageUrl = source.baseUrl + imageUrl;
            } else {
              imageUrl = source.baseUrl + "/" + imageUrl;
            }
          }
        }

        const author = source.selector.author
          ? $el.find(source.selector.author).text().trim()
          : undefined;

        let publishedAt = new Date();
        if (source.selector.publishedAt) {
          const dateText =
            $el.find(source.selector.publishedAt).text().trim() ||
            $el.find(source.selector.publishedAt).attr("datetime");

          if (dateText) {
            const parsedDate = new Date(dateText);
            if (!isNaN(parsedDate.getTime())) {
              publishedAt = parsedDate;
            }
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
      } catch (error: any) {
        console.warn(
          `Error parsing article from ${source.name}:`,
          error.message
        );
      }
    });

    const validArticles = articles.filter(
      (article) =>
        article.title.length > 15 &&
        article.url.startsWith("http") &&
        !article.title.toLowerCase().includes("404")
    );

    console.log(
      `Web Scraping: Found ${validArticles.length} articles from ${source.name}`
    );
    return validArticles;
  } catch (error: any) {
    console.warn(`Failed to scrape ${source.name}:`, error.message);
    return [];
  }
};

// Scoring and filtering functions
const calculateTrendingScore = (article: ScrapedNews): number => {
  let score = 50;

  const content = (
    article.title +
    " " +
    (article.description || "")
  ).toLowerCase();

  // Keyword scoring
  importantKeywords.forEach((keyword) => {
    if (content.includes(keyword.toLowerCase())) {
      score += 15;
    }
  });

  // Content quality
  if (article.content && article.content.length > 500) score += 20;
  else if (article.content && article.content.length > 200) score += 10;

  if (article.description && article.description.length > 100) score += 10;
  if (article.image_url) score += 15;
  if (article.author) score += 5;

  // Recency scoring
  const hoursOld =
    (Date.now() - article.published_at.getTime()) / (1000 * 60 * 60);
  if (hoursOld < 6) score += 25;
  else if (hoursOld < 24) score += 15;
  else if (hoursOld < 72) score += 10;

  // Source reliability
  const premiumSources = [
    "Variety",
    "Hollywood Reporter",
    "Entertainment Weekly",
    "Deadline",
  ];
  if (premiumSources.some((source) => article.source_name.includes(source))) {
    score += 12;
  }

  return Math.max(score, 0);
};

const removeDuplicateArticles = (articles: ScrapedNews[]): ScrapedNews[] => {
  const seen = new Set();
  const unique: ScrapedNews[] = [];

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

// Main Controllers

export const getTrendingNews = async (req: Request, res: Response) => {
  try {
    console.log("Fetching trending news from database...");

    const news = await client.trendingNews.findMany({
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
  } catch (error: any) {
    console.error("Error fetching trending news:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch trending news",
      error: error.message,
    });
  }
};

export const refreshTrendingNews = async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    await client.contentRefreshLog.create({
      data: {
        sectionType: "news",
        status: "in_progress",
      },
    });

    console.log("Starting comprehensive news refresh...");

    const allNews: ScrapedNews[] = [];
    let sourcesProcessed = 0;

    // Phase 1: RSS Feeds (most reliable)
    console.log("Phase 1: Processing RSS feeds...");
    for (const feed of rssFeeds) {
      try {
        const rssNews = await scrapeFromRSS(feed.url, feed.name);
        allNews.push(...rssNews);
        sourcesProcessed++;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error: any) {
        console.warn(`RSS feed failed: ${feed.name}`);
      }
    }

    // Phase 2: News API (if available)
    console.log("Phase 2: Processing News API...");
    try {
      const apiNews = await fetchFromNewsAPI();
      allNews.push(...apiNews);
      if (apiNews.length > 0) sourcesProcessed++;
    } catch (error: any) {
      console.warn("News API phase failed");
    }

    // Phase 3: Web Scraping with content enhancement
    console.log("Phase 3: Processing web scraping...");
    for (const source of newsSources) {
      try {
        const scrapedNews = await scrapeNewsSource(source);

        // Enhance top 3 articles from each source
        const enhancedNews = await Promise.all(
          scrapedNews.slice(0, 3).map(async (article) => {
            const { content, image } = await scrapeFullArticle(article.url);
            return {
              ...article,
              content: content || article.description,
              image_url: image || article.image_url,
            };
          })
        );

        allNews.push(...enhancedNews, ...scrapedNews.slice(3));
        sourcesProcessed++;
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error: any) {
        console.warn(`Scraping failed: ${source.name}`);
      }
    }

    if (allNews.length === 0) {
      throw new Error("No news articles were collected from any source");
    }

    console.log(`Total articles collected: ${allNews.length}`);

    // Process articles
    const uniqueArticles = removeDuplicateArticles(allNews);
    console.log(`Unique articles: ${uniqueArticles.length}`);

    // Phase 4: Enhance articles with Unsplash images where needed
    console.log("Phase 4: Enhancing articles with images...");
    const articlesWithImages = await Promise.all(
      uniqueArticles.map(async (article) => {
        if (!article.image_url || article.image_url.includes("placeholder")) {
          const unsplashImage = await getArticleImage(article);
          return {
            ...article,
            image_url: unsplashImage || article.image_url,
          };
        }
        return article;
      })
    );

    const scoredNews = articlesWithImages
      .map((article) => ({
        ...article,
        score: calculateTrendingScore(article),
      }))
      .sort((a, b) => b.score - a.score);

    const topNews = scoredNews.slice(0, 25);

    // Update database
    await client.trendingNews.deleteMany({});
    console.log("Cleared existing trending news");

    const insertedNews = [];
    for (const article of topNews) {
      try {
        const insertedArticle = await client.trendingNews.create({
          data: {
            title: article.title.substring(0, 255),
            description: article.description?.substring(0, 500) || "",
            content:
              article.content?.substring(0, 2000) ||
              article.description?.substring(0, 500) ||
              "",
            url: article.url,
            sourceName: article.source_name,
            author: article.author?.substring(0, 100) || null,
            publishedAt: article.published_at,
            imageUrl: article.image_url || null,
            category: article.category,
            trendingScore: (article as any).score,
          },
        });
        insertedNews.push(insertedArticle);
      } catch (dbError: any) {
        console.warn(
          `Failed to insert article: ${article.title.substring(0, 50)}...`
        );
      }
    }

    const processingTime = Date.now() - startTime;

    await client.contentRefreshLog.updateMany({
      where: { sectionType: "news", status: "in_progress" },
      data: {
        status: "success",
        lastSuccessfulRefresh: new Date(),
        recordsUpdated: insertedNews.length,
      },
    });

    console.log(
      `Successfully refreshed ${insertedNews.length} articles in ${processingTime}ms`
    );

    res.status(200).json({
      success: true,
      message: "Trending news refreshed successfully",
      data: {
        articles_updated: insertedNews.length,
        sources_processed: sourcesProcessed,
        total_collected: allNews.length,
        processing_time_ms: processingTime,
        phases_completed: 4,
        images_generated: topNews.filter((a) => a.image_url).length,
        unsplash_images_used: topNews.filter(
          (a) => a.image_url && a.image_url.includes("unsplash")
        ).length,
      },
    });
  } catch (error: any) {
    const processingTime = Date.now() - startTime;

    console.error("Error refreshing trending news:", error.message);

    await client.contentRefreshLog.updateMany({
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

export const getRefreshStatus = async (req: Request, res: Response) => {
  try {
    const lastLog = await client.contentRefreshLog.findFirst({
      where: { sectionType: "news" },
      orderBy: { id: "desc" },
    });

    const newsCount = await client.trendingNews.count();

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
  } catch (error: any) {
    console.error("Error fetching refresh status:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch refresh status",
      error: error.message,
    });
  }
};

export const getNewsById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const article = await client.trendingNews.findUnique({
      where: { id: parseInt(id) },
    });

    if (!article) {
      return res.status(404).json({
        success: false,
        message: "News article not found",
      });
    }

    // If article doesn't have image, fetch one from Unsplash
    let imageUrl = article.imageUrl;
    if (!imageUrl || imageUrl.includes("placeholder")) {
      const tempArticle: ScrapedNews = {
        title: article.title,
        description: article.description,
        content: article.content ?? undefined,
        url: article.url,
        source_name: article.sourceName,
        author: article.author || undefined,
        published_at: article.publishedAt,
        image_url: article.imageUrl || undefined,
        category: article.category,
      };

      imageUrl = (await getArticleImage(tempArticle)) ?? null;

      // Update the database with the new image
      if (imageUrl && imageUrl !== article.imageUrl) {
        await client.trendingNews.update({
          where: { id: article.id },
          data: { imageUrl },
        });
      }
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
        image_url: imageUrl,
        category: article.category,
        trending_score: article.trendingScore,
      },
    });
  } catch (error: any) {
    console.error("Error fetching news article:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch news article",
      error: error.message,
    });
  }
};
