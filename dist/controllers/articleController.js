"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSingleArticle = exports.getArticles = exports.createArticle = void 0;
const __1 = __importDefault(require(".."));
const dataUri_1 = __importDefault(require("../config/dataUri"));
const cloudinary_1 = __importDefault(require("cloudinary"));
const redis_1 = require("../config/redis");
const generateSlug = (title) => {
    return title
        .toLowerCase() // "Top 25..." → "top 25..."
        .replace(/[^\w\s-]/g, "") // Remove special chars → "top 25 movies of all time  a complete analysis"
        .replace(/\s+/g, "-") // Spaces to hyphens → "top-25-movies-of-all-time--a-complete-analysis"
        .replace(/--+/g, "-") // Multiple hyphens to single → "top-25-movies-of-all-time-a-complete-analysis"
        .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
};
const createArticle = async (req, res) => {
    try {
        const user = req.user;
        if (user.role === "USER") {
            return res.status(400).json({ message: "You are not authorized" });
        }
        const { title, shortDescription, author, published, blocks } = req.body;
        const slug = generateSlug(title);
        const parsedBlocks = JSON.parse(blocks);
        // Fix: Add safety check for files
        const files = req.files || [];
        let mainImageUrl = "";
        // Fix: Use optional chaining
        const mainImageFile = files?.find?.((file) => file.fieldname === "mainImage");
        if (mainImageFile) {
            const fileBuffer = (0, dataUri_1.default)(mainImageFile);
            if (!fileBuffer || !fileBuffer.content) {
                return res.status(500).json({
                    message: "Was not able to convert the file from buffer to base64.",
                });
            }
            const cloud = await cloudinary_1.default.v2.uploader.upload(fileBuffer.content, {
                folder: "articles",
            });
            if (!cloud) {
                return res
                    .status(500)
                    .json({ message: "An error occurred while uploading to cloudinary" });
            }
            mainImageUrl = cloud.url;
        }
        const processedBlocks = await Promise.all(parsedBlocks.map(async (block, index) => {
            if (block.type === "IMAGE") {
                // Fix: Use optional chaining and safe find
                const blockImageFile = files?.find?.((file) => file.fieldname === `blockImage_${index}`);
                if (!blockImageFile) {
                    return block;
                }
                const fileBuffer = (0, dataUri_1.default)(blockImageFile);
                if (!fileBuffer || !fileBuffer.content) {
                    throw new Error("Was not able to convert the file from buffer to base64.");
                }
                const cloud = await cloudinary_1.default.v2.uploader.upload(fileBuffer.content, { folder: "articles" });
                if (!cloud) {
                    throw new Error("An error occurred while uploading to cloudinary");
                }
                return {
                    ...block,
                    content: {
                        ...block.content,
                        url: cloud.url,
                        publicId: cloud.public_id,
                    },
                };
            }
            return block;
        }));
        const article = await __1.default.article.create({
            data: {
                title,
                slug,
                shortDescription,
                author,
                published: published === "true",
                publishedAt: published === "true" ? new Date() : null,
                mainImageUrl,
                blocks: {
                    create: processedBlocks.map((block, index) => ({
                        type: block.type,
                        content: block.content,
                        order: index,
                    })),
                },
            },
            include: {
                blocks: {
                    orderBy: { order: "asc" },
                },
            },
        });
        await (0, redis_1.deleteCache)("all_articles");
        res.status(200).json({ article });
    }
    catch (error) {
        console.log(error.message);
        res.status(500).json({ message: error.message });
    }
};
exports.createArticle = createArticle;
const getArticles = async (req, res) => {
    try {
        const cacheKey = "all_articles";
        // Try cache first
        const cachedArticles = await (0, redis_1.getFromCache)(cacheKey);
        if (cachedArticles) {
            console.log("📦 Cache HIT - returning cached posts");
            return res.status(200).json({
                articles: JSON.parse(cachedArticles),
                message: "Articles fetched successfully (from cache)",
            });
        }
        console.log("🔍 Cache MISS - fetching from database");
        const articles = await __1.default.article.findMany();
        await (0, redis_1.setCache)(cacheKey, JSON.stringify(articles), 3600);
        res.status(200).json({ articles });
    }
    catch (error) {
        console.log(error.message);
        res.status(500).json({ message: error.message });
    }
};
exports.getArticles = getArticles;
const getSingleArticle = async (req, res) => {
    try {
        const user = req.user;
        const { slug } = req.params;
        const cacheKey = `article:${slug}:${user.id}`;
        const cachedArticle = await (0, redis_1.getFromCache)(cacheKey);
        if (cachedArticle) {
            const parsedArticle = JSON.parse(cachedArticle);
            // Still increment view count for cached articles
            if (parsedArticle.viewCount !== undefined) {
                await __1.default.article.update({
                    where: { id: parsedArticle.id },
                    data: {
                        viewCount: parsedArticle.viewCount + 1,
                    },
                });
                // Update the cached article's view count
                parsedArticle.viewCount += 1;
                await (0, redis_1.setCache)(cacheKey, JSON.stringify(parsedArticle), 300); // 5 minutes
            }
            return res.status(200).json({ article: parsedArticle });
        }
        // If not in cache, fetch from database
        const article = await __1.default.article.findFirst({
            where: { slug },
            include: {
                blocks: {
                    orderBy: {
                        order: "asc",
                    },
                },
            },
        });
        if (!article) {
            return res.status(404).json({ message: "Article not found" });
        }
        // Increment view count
        let updatedArticle = article;
        if (article.viewCount !== undefined) {
            updatedArticle = await __1.default.article.update({
                where: { id: article.id },
                data: {
                    viewCount: article.viewCount + 1,
                },
                include: {
                    blocks: {
                        orderBy: {
                            order: "asc",
                        },
                    },
                },
            });
        }
        // Cache the article for 5 minutes (300 seconds)
        await (0, redis_1.setCache)(cacheKey, JSON.stringify(updatedArticle), 300);
        res.status(200).json({ article: updatedArticle });
    }
    catch (error) {
        console.log(error.message);
        res.status(500).json({ message: error.message });
    }
};
exports.getSingleArticle = getSingleArticle;
