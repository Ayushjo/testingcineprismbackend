"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchArticles = exports.getLikeStatus = exports.toggleLike = exports.fetchCommentThread = exports.fetchReplies = exports.fetchComments = exports.deleteComment = exports.updateComment = exports.createReply = exports.createComment = exports.getSingleArticle = exports.getArticles = exports.createArticle = void 0;
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
        await (0, redis_1.setCache)(cacheKey, JSON.stringify(articles), 300);
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
        const { slug } = req.params;
        const cacheKey = `article:${slug}`;
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
const createComment = async (req, res) => {
    try {
        const { articleId } = req.params;
        const { content } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }
        if (!content || content.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: "Comment content is required",
            });
        }
        if (content.length > 1000) {
            return res.status(400).json({
                success: false,
                message: "Comment content too long (max 1000 characters)",
            });
        }
        // Verify post exists
        const postExists = await __1.default.article.findUnique({
            where: { id: articleId },
            select: { id: true },
        });
        if (!postExists) {
            return res.status(404).json({
                success: false,
                message: "Article not found",
            });
        }
        const newComment = await __1.default.comment.create({
            data: {
                content: content.trim(),
                userId,
                articleId,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
                _count: {
                    select: { replies: true },
                },
            },
        });
        res.status(201).json({
            success: true,
            comment: {
                ...newComment,
                replyCount: 0,
                replies: [],
            },
        });
    }
    catch (error) {
        console.error("Error creating comment:", error.message);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.createComment = createComment;
const createReply = async (req, res) => {
    try {
        const { commentId } = req.params;
        const { content } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }
        if (!content || content.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: "Reply content is required",
            });
        }
        if (content.length > 1000) {
            return res.status(400).json({
                success: false,
                message: "Reply content too long (max 1000 characters)",
            });
        }
        // Verify parent comment exists and get postId
        const parentComment = await __1.default.comment.findUnique({
            where: { id: commentId },
            select: {
                id: true,
                articleId: true,
                parentCommentId: true,
                // Optional: Add depth tracking
                user: {
                    select: { username: true },
                },
            },
        });
        if (!parentComment) {
            return res.status(404).json({
                success: false,
                message: "Parent comment not found",
            });
        }
        // Optional: Add maximum nesting depth limit (uncomment if needed)
        /*
        const depth = await getCommentDepth(commentId);
        const MAX_NESTING_DEPTH = 10; // Adjust as needed
        
        if (depth >= MAX_NESTING_DEPTH) {
          return res.status(400).json({
            success: false,
            message: `Maximum nesting depth (${MAX_NESTING_DEPTH}) reached. Please start a new thread.`,
          });
        }
        */
        const newReply = await __1.default.comment.create({
            data: {
                content: content.trim(),
                userId,
                articleId: parentComment.articleId,
                parentCommentId: commentId,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
                _count: {
                    select: { replies: true },
                },
                // Include parent comment info for context
                parentComment: {
                    select: {
                        id: true,
                        user: {
                            select: { username: true },
                        },
                    },
                },
            },
        });
        res.status(201).json({
            success: true,
            reply: {
                ...newReply,
                replyCount: 0,
                replies: [],
            },
        });
    }
    catch (error) {
        console.error("Error creating reply:", error.message);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.createReply = createReply;
const updateComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const { content } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }
        if (!content || content.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: "Comment content is required",
            });
        }
        // Verify comment ownership
        const comment = await __1.default.comment.findUnique({
            where: { id: commentId },
            select: { userId: true, createdAt: true },
        });
        if (!comment) {
            return res.status(404).json({
                success: false,
                message: "Comment not found",
            });
        }
        if (comment.userId !== userId) {
            return res.status(403).json({
                success: false,
                message: "Not authorized to update this comment",
            });
        }
        // Check if comment is too old to edit (24 hours)
        const hoursSinceCreation = (Date.now() - comment.createdAt.getTime()) / (1000 * 60 * 60);
        if (hoursSinceCreation > 24) {
            return res.status(400).json({
                success: false,
                message: "Comments cannot be edited after 24 hours",
            });
        }
        const updatedComment = await __1.default.comment.update({
            where: { id: commentId },
            data: {
                content: content.trim(),
                updatedAt: new Date(),
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
                _count: {
                    select: { replies: true },
                },
            },
        });
        res.status(200).json({
            success: true,
            comment: updatedComment,
        });
    }
    catch (error) {
        console.error("Error updating comment:", error.message);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.updateComment = updateComment;
const deleteComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }
        // Verify comment ownership
        const comment = await __1.default.comment.findUnique({
            where: { id: commentId },
            select: {
                userId: true,
                _count: { select: { replies: true } },
            },
        });
        if (!comment) {
            return res.status(404).json({
                success: false,
                message: "Comment not found",
            });
        }
        if (comment.userId !== userId) {
            return res.status(403).json({
                success: false,
                message: "Not authorized to delete this comment",
            });
        }
        // If comment has replies, mark as deleted instead of hard delete
        if (comment._count.replies > 0) {
            await __1.default.comment.update({
                where: { id: commentId },
                data: {
                    content: "[This comment has been deleted]",
                    updatedAt: new Date(),
                },
            });
            res.status(200).json({
                success: true,
                message: "Comment marked as deleted",
            });
        }
        else {
            // Hard delete if no replies
            await __1.default.comment.delete({
                where: { id: commentId },
            });
            res.status(200).json({
                success: true,
                message: "Comment deleted successfully",
            });
        }
    }
    catch (error) {
        console.error("Error deleting comment:", error.message);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.deleteComment = deleteComment;
const fetchComments = async (req, res) => {
    try {
        const { articleId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const comments = await __1.default.comment.findMany({
            where: {
                articleId,
                parentCommentId: null, // Only top-level comments
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
                _count: {
                    select: { replies: true },
                },
            },
            orderBy: { createdAt: "desc" },
            skip,
            take: limit,
        });
        const totalComments = await __1.default.comment.count({
            where: {
                articleId,
                parentCommentId: null,
            },
        });
        const transformedComments = comments.map((comment) => ({
            ...comment,
            replyCount: comment._count.replies,
            replies: [], // Replies loaded separately
        }));
        res.status(200).json({
            success: true,
            comments: transformedComments,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalComments / limit),
                totalComments,
                hasMore: skip + comments.length < totalComments,
            },
        });
    }
    catch (error) {
        console.error("Error fetching comments:", error.message);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.fetchComments = fetchComments;
const fetchReplies = async (req, res) => {
    try {
        const { commentId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const nested = req.query.nested === "true"; // Flag to fetch nested structure
        const skip = (page - 1) * limit;
        if (nested) {
            // Fetch replies with their nested replies (recursive structure)
            const replies = await fetchNestedReplies(commentId, skip, limit);
            const totalReplies = await __1.default.comment.count({
                where: { parentCommentId: commentId },
            });
            res.status(200).json({
                success: true,
                replies,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalReplies / limit),
                    totalReplies,
                    hasMore: skip + replies.length < totalReplies,
                },
            });
        }
        else {
            // Original flat structure for backward compatibility
            const replies = await __1.default.comment.findMany({
                where: {
                    parentCommentId: commentId,
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                        },
                    },
                    _count: {
                        select: { replies: true },
                    },
                },
                orderBy: { createdAt: "asc" },
                skip,
                take: limit,
            });
            const totalReplies = await __1.default.comment.count({
                where: { parentCommentId: commentId },
            });
            res.status(200).json({
                success: true,
                replies,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalReplies / limit),
                    totalReplies,
                    hasMore: skip + replies.length < totalReplies,
                },
            });
        }
    }
    catch (error) {
        console.error("Error fetching replies:", error.message);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.fetchReplies = fetchReplies;
const fetchCommentThread = async (req, res) => {
    try {
        const { commentId } = req.params;
        // Get the full thread starting from root comment
        const rootComment = await findRootComment(commentId);
        if (!rootComment) {
            return res.status(404).json({
                success: false,
                message: "Comment not found",
            });
        }
        const thread = await fetchNestedReplies(rootComment.id);
        res.status(200).json({
            success: true,
            thread: {
                ...rootComment,
                replies: thread,
            },
        });
    }
    catch (error) {
        console.error("Error fetching comment thread:", error.message);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.fetchCommentThread = fetchCommentThread;
const toggleLike = async (req, res) => {
    try {
        const { articleId } = req.params;
        const userId = req.user?.id;
        console.log(userId);
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }
        // Verify post exists
        const articletExists = await __1.default.article.findUnique({
            where: { id: articleId },
            select: { id: true },
        });
        if (!articletExists) {
            return res.status(404).json({
                success: false,
                message: "Article not found",
            });
        }
        // Check if like already exists
        const existingLike = await __1.default.like.findFirst({
            where: {
                userId: userId,
                articleId: articleId,
            },
        });
        let isLiked;
        let likeCount;
        if (existingLike) {
            // Unlike
            await __1.default.like.delete({
                where: { id: existingLike.id },
            });
            isLiked = false;
        }
        else {
            // Like
            await __1.default.like.create({
                data: {
                    userId,
                    articleId,
                },
            });
            isLiked = true;
        }
        // Get updated like count
        likeCount = await __1.default.like.count({
            where: { articleId },
        });
        res.status(200).json({
            success: true,
            isLiked,
            likeCount,
        });
    }
    catch (error) {
        console.error("Error toggling like:", error.message);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.toggleLike = toggleLike;
const getLikeStatus = async (req, res) => {
    try {
        const { articleId } = req.params;
        const userId = req.user?.id;
        const likeCount = await __1.default.like.count({
            where: { articleId },
        });
        let isLiked = false;
        if (userId) {
            const userLike = await __1.default.like.findFirst({
                where: {
                    userId: userId,
                    articleId: articleId,
                },
            });
            isLiked = !!userLike;
        }
        res.status(200).json({
            success: true,
            isLiked,
            likeCount,
        });
    }
    catch (error) {
        console.error("Error getting like status:", error.message);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.getLikeStatus = getLikeStatus;
const searchArticles = async (req, res) => {
    try {
        const filter = req.query.filter;
        const articles = await __1.default.article.findMany({
            where: {
                title: {
                    contains: filter,
                    mode: "insensitive"
                }
            }
        });
        res.status(200).json({
            success: true,
            articles
        });
    }
    catch (error) {
        console.log(error.meesage);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.searchArticles = searchArticles;
async function fetchNestedReplies(commentId, skip = 0, limit = 10, depth = 0) {
    // Optional: Add max depth limit to prevent infinite recursion
    const MAX_DEPTH = 50; // Adjust as needed
    if (depth > MAX_DEPTH) {
        return [];
    }
    const replies = await __1.default.comment.findMany({
        where: {
            parentCommentId: commentId,
        },
        include: {
            user: {
                select: {
                    id: true,
                    username: true,
                    email: true,
                },
            },
            _count: {
                select: { replies: true },
            },
        },
        orderBy: { createdAt: "asc" },
        skip: depth === 0 ? skip : 0, // Only apply pagination to first level
        take: depth === 0 ? limit : undefined, // Only limit first level
    });
    // Recursively fetch nested replies for each reply
    const repliesWithNested = await Promise.all(replies.map(async (reply) => {
        const nestedReplies = reply._count.replies > 0
            ? await fetchNestedReplies(reply.id, 0, undefined, depth + 1)
            : [];
        return {
            ...reply,
            replyCount: reply._count.replies,
            replies: nestedReplies,
            depth: depth + 1, // Add depth information
        };
    }));
    return repliesWithNested;
}
async function findRootComment(commentId) {
    let currentComment = await __1.default.comment.findUnique({
        where: { id: commentId },
        include: {
            user: {
                select: {
                    id: true,
                    username: true,
                    email: true,
                },
            },
            _count: {
                select: { replies: true },
            },
        },
    });
    if (!currentComment)
        return null;
    // Traverse up to find root comment
    while (currentComment && currentComment.parentCommentId) {
        const parentComment = await __1.default.comment.findUnique({
            where: { id: currentComment.parentCommentId },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
                _count: {
                    select: { replies: true },
                },
            },
        });
        if (!parentComment)
            break;
        currentComment = parentComment;
    }
    return currentComment;
}
