"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.latestReviews = exports.hasLiked = exports.deleteImage = exports.deletePost = exports.editPost = exports.fetchTopPicks = exports.addTopPicks = exports.fetchAllPost = exports.uploadImages = exports.createPost = exports.uploadReviewPoster = exports.uploadPoster = void 0;
const dataUri_1 = __importDefault(require("../config/dataUri"));
const __1 = __importDefault(require(".."));
const cloudinary_1 = __importDefault(require("cloudinary"));
const redis_1 = require("../config/redis");
const uploadPoster = async (req, res) => {
    try {
        const user = req.user;
        if (user.role === "ADMIN") {
            const file = req.file;
            const { postId } = req.body;
            const existingPoster = await __1.default.post.findFirst({
                where: {
                    id: postId,
                },
            });
            if (existingPoster?.posterImageUrl) {
                const existingPosterImage = await __1.default.postImage.findFirst({
                    where: {
                        imageUrl: existingPoster?.posterImageUrl,
                    },
                });
                await __1.default.postImage.delete({
                    where: {
                        id: existingPosterImage?.id,
                    },
                });
                existingPoster.posterImageUrl = "";
                if (!file) {
                    return res.status(400).json({ message: "No file uploaded" });
                }
                const fileBuffer = (0, dataUri_1.default)(file);
                if (!fileBuffer || !fileBuffer.content) {
                    res.status(500).json({
                        message: "Was not able to convert the file from buffer to base64.",
                    });
                }
                else {
                    const cloud = await cloudinary_1.default.v2.uploader.upload(fileBuffer.content, {
                        folder: "posters",
                    });
                    if (!cloud) {
                        res
                            .status(500)
                            .json({ message: "An error occurred while uploading" });
                    }
                    const poster = await __1.default.postImage.create({
                        data: {
                            imageUrl: cloud.url,
                            postId,
                        },
                    });
                    if (poster) {
                        await __1.default.post.update({
                            where: {
                                id: postId,
                            },
                            data: {
                                posterImageUrl: poster.imageUrl,
                            },
                        });
                        res
                            .status(201)
                            .json({ poster, message: "Poster uploaded successfully" });
                    }
                    else {
                        res.status(500).json({ message: "An error occurred" });
                    }
                }
            }
            else {
                if (!file) {
                    return res.status(400).json({ message: "No file uploaded" });
                }
                const fileBuffer = (0, dataUri_1.default)(file);
                if (!fileBuffer || !fileBuffer.content) {
                    res.status(500).json({
                        message: "Was not able to convert the file from buffer to base64.",
                    });
                }
                else {
                    const cloud = await cloudinary_1.default.v2.uploader.upload(fileBuffer.content, {
                        folder: "posters",
                    });
                    if (!cloud) {
                        res
                            .status(500)
                            .json({ message: "An error occurred while uploading" });
                    }
                    const poster = await __1.default.postImage.create({
                        data: {
                            imageUrl: cloud.url,
                            postId,
                        },
                    });
                    if (poster) {
                        await __1.default.post.update({
                            where: {
                                id: postId,
                            },
                            data: {
                                posterImageUrl: poster.imageUrl,
                            },
                        });
                        res
                            .status(201)
                            .json({ poster, message: "Poster uploaded successfully" });
                    }
                    else {
                        res.status(500).json({ message: "An error occurred" });
                    }
                }
            }
        }
        else {
            res.status(401).json({ message: "You are not an admin" });
        }
    }
    catch (error) {
        console.log(error.message);
        res.status(500).json({ message: error.message });
    }
};
exports.uploadPoster = uploadPoster;
const uploadReviewPoster = async (req, res) => {
    try {
        const user = req.user;
        if (user.role === "ADMIN") {
            const file = req.file;
            const { postId } = req.body;
            const existingPoster = await __1.default.post.findFirst({
                where: {
                    id: postId,
                },
            });
            if (existingPoster?.reviewPosterImageUrl) {
                const existingReviewPosterImage = await __1.default.postImage.findFirst({
                    where: {
                        imageUrl: existingPoster?.reviewPosterImageUrl,
                    },
                });
                await __1.default.postImage.delete({
                    where: {
                        id: existingReviewPosterImage?.id,
                    },
                });
                existingPoster.posterImageUrl = "";
                if (!file) {
                    return res.status(400).json({ message: "No file uploaded" });
                }
                const fileBuffer = (0, dataUri_1.default)(file);
                if (!fileBuffer || !fileBuffer.content) {
                    res.status(500).json({
                        message: "Was not able to convert the file from buffer to base64.",
                    });
                }
                else {
                    const cloud = await cloudinary_1.default.v2.uploader.upload(fileBuffer.content, {
                        folder: "posters",
                    });
                    if (!cloud) {
                        res
                            .status(500)
                            .json({ message: "An error occurred while uploading" });
                    }
                    const poster = await __1.default.postImage.create({
                        data: {
                            imageUrl: cloud.url,
                            postId,
                        },
                    });
                    if (poster) {
                        await __1.default.post.update({
                            where: {
                                id: postId,
                            },
                            data: {
                                reviewPosterImageUrl: poster.imageUrl,
                            },
                        });
                        res
                            .status(201)
                            .json({ poster, message: "Poster uploaded successfully" });
                    }
                    else {
                        res.status(500).json({ message: "An error occurred" });
                    }
                }
            }
            else {
                if (!file) {
                    return res.status(400).json({ message: "No file uploaded" });
                }
                const fileBuffer = (0, dataUri_1.default)(file);
                if (!fileBuffer || !fileBuffer.content) {
                    res.status(500).json({
                        message: "Was not able to convert the file from buffer to base64.",
                    });
                }
                else {
                    const cloud = await cloudinary_1.default.v2.uploader.upload(fileBuffer.content, {
                        folder: "posters",
                    });
                    if (!cloud) {
                        res
                            .status(500)
                            .json({ message: "An error occurred while uploading" });
                    }
                    const poster = await __1.default.postImage.create({
                        data: {
                            imageUrl: cloud.url,
                            postId,
                        },
                    });
                    if (poster) {
                        await __1.default.post.update({
                            where: {
                                id: postId,
                            },
                            data: {
                                reviewPosterImageUrl: poster.imageUrl,
                            },
                        });
                        res
                            .status(201)
                            .json({ poster, message: "Poster uploaded successfully" });
                    }
                    else {
                        res.status(500).json({ message: "An error occurred" });
                    }
                }
            }
        }
        else {
            res.status(401).json({ message: "You are not an admin" });
        }
    }
    catch (error) {
        console.log(error.message);
        res.status(500).json({ message: error.message });
    }
};
exports.uploadReviewPoster = uploadReviewPoster;
const createPost = async (req, res) => {
    try {
        const user = req.user;
        if (user.role === "ADMIN") {
            const { title, content, genres, year, directedBy, streamingAt, relatedPostIds, ratingCategories, } = req.body;
            const post = await __1.default.post.create({
                data: {
                    title,
                    content,
                    genres,
                    year,
                    directedBy,
                    streamingAt,
                    relatedPostIds,
                    ratingCategories,
                },
            });
            // Clear cache so next fetch gets fresh data
            await (0, redis_1.deleteCache)("all_posts");
            console.log("🗑️ Cleared posts cache");
            res.status(201).json({ post, message: "Post created successfully" });
        }
        else {
            res.status(401).json({ message: "You are not an admin" });
        }
    }
    catch (error) {
        console.log(error.message);
        res.status(500).json({ message: error.message });
    }
};
exports.createPost = createPost;
const uploadImages = async (req, res) => {
    try {
        const user = req.user;
        if (user.role === "ADMIN") {
            const files = req.files;
            const { postId } = req.body;
            if (!files || files.length === 0) {
                return res.status(400).json({ message: "No files uploaded" });
            }
            const uploadedImages = [];
            for (const file of files) {
                const fileBuffer = (0, dataUri_1.default)(file);
                if (!fileBuffer || !fileBuffer.content) {
                    return res.status(500).json({
                        message: "Was not able to convert the file from buffer to base64.",
                    });
                }
                const cloud = await cloudinary_1.default.v2.uploader.upload(fileBuffer.content, {
                    folder: "images",
                });
                if (!cloud) {
                    return res.status(500).json({
                        message: "An error occurred while uploading to cloudinary",
                    });
                }
                const image = await __1.default.postImage.create({
                    data: {
                        imageUrl: cloud.url,
                        postId,
                    },
                });
                if (!image) {
                    return res.status(500).json({
                        message: "An error occurred while saving to database",
                    });
                }
                uploadedImages.push(image);
            }
            res.status(201).json({
                images: uploadedImages,
                message: `${uploadedImages.length} images uploaded successfully`,
            });
        }
        else {
            res.status(401).json({ message: "You are not an admin" });
        }
    }
    catch (error) {
        console.log(error.message);
        res.status(500).json({ message: error.message });
    }
};
exports.uploadImages = uploadImages;
const fetchAllPost = async (req, res) => {
    try {
        const cacheKey = "all_posts";
        // Try cache first
        const cachedPosts = await (0, redis_1.getFromCache)(cacheKey);
        if (cachedPosts) {
            console.log("📦 Cache HIT - returning cached posts");
            return res.status(200).json({
                posts: JSON.parse(cachedPosts),
                message: "Posts fetched successfully (from cache)",
            });
        }
        console.log("🔍 Cache MISS - fetching from database");
        // Get from database
        const posts = await __1.default.post.findMany({
            include: {
                images: true,
            },
        });
        // Filter out poster images
        const filteredPosts = posts.map((post) => ({
            ...post,
            images: post.images.filter((image) => image.imageUrl !== post.reviewPosterImageUrl &&
                image.imageUrl !== post.posterImageUrl),
        }));
        // Cache for 5 minutes
        await (0, redis_1.setCache)(cacheKey, JSON.stringify(filteredPosts), 300);
        console.log("💾 Data cached for 5 minutes");
        res.status(200).json({
            posts: filteredPosts,
            message: "Posts fetched successfully",
        });
    }
    catch (error) {
        console.log(error.message);
        res.status(500).json({ message: error.message });
    }
};
exports.fetchAllPost = fetchAllPost;
const addTopPicks = async (req, res) => {
    try {
        const { year, title, genre } = req.body;
        const file = req.file;
        const yearInt = parseInt(year);
        if (!file) {
            return res.status(400).json({ message: "No file uploaded" });
        }
        const fileBuffer = (0, dataUri_1.default)(file);
        if (!fileBuffer || !fileBuffer.content) {
            return res.status(500).json({
                message: "Was not able to convert the file from buffer to base64.",
            });
        }
        const cloud = await cloudinary_1.default.v2.uploader.upload(fileBuffer.content, {
            folder: "posters",
        });
        if (!cloud) {
            return res.status(500).json({
                message: "An error occurred while uploading to cloudinary",
            });
        }
        const topPick = await __1.default.topPicks.create({
            data: {
                title,
                genre,
                year: yearInt,
                posterImageUrl: cloud.url,
            },
        });
        await (0, redis_1.deleteCache)("top_picks");
        console.log("🗑️ Cleared top picks cache");
        res.status(200).json({ topPick, message: "Top pick added successfully" });
    }
    catch (error) {
        console.log(error.message);
        res.status(500).json({ message: error.message });
    }
};
exports.addTopPicks = addTopPicks;
const fetchTopPicks = async (req, res) => {
    try {
        const cacheKey = "top_picks";
        const cachedTopPicks = await (0, redis_1.getFromCache)(cacheKey);
        if (cachedTopPicks) {
            console.log("📦 Cache HIT - returning cached top picks");
            return res.status(200).json({
                topPicks: JSON.parse(cachedTopPicks),
                message: "Top picks fetched successfully (from cache)",
            });
        }
        console.log("🔍 Cache MISS - fetching from database");
        const topPicks = await __1.default.topPicks.findMany({});
        // Cache for 10 minutes
        await (0, redis_1.setCache)(cacheKey, JSON.stringify(topPicks), 600);
        console.log("💾 Top picks cached for 10 minutes");
        res.status(200).json({
            topPicks,
            message: "Top picks fetched successfully",
        });
    }
    catch (error) {
        console.log(error.message);
        res.status(500).json({ message: error.message });
    }
};
exports.fetchTopPicks = fetchTopPicks;
const editPost = async (req, res) => {
    try {
        const user = req.user;
        if (user.role === "USER") {
            res.status(400).json("You are not authorized");
        }
        else {
            const { postId, title, content, genres, year, directedBy, streamingAt, relatedPostIds, ratingCategories, } = req.body;
            const post = await __1.default.post.findFirst({
                where: {
                    id: postId,
                },
            });
            if (!post) {
                return res.status(404).json({ message: "Post not found" });
            }
            else {
                await __1.default.post.update({
                    where: {
                        id: postId,
                    },
                    data: {
                        title,
                        content,
                        genres,
                        year,
                        directedBy,
                        streamingAt,
                        relatedPostIds,
                        ratingCategories,
                    },
                });
                return res.status(200).json({ message: "Post updated successfully" });
            }
        }
    }
    catch (error) {
        console.log(error.message);
        res.status(500).json({ message: error.message });
    }
};
exports.editPost = editPost;
const deletePost = async (req, res) => {
    try {
        const user = req.user;
        if (user.role === "ADMIN") {
            const { postId } = req.body;
            const post = await __1.default.post.findFirst({
                where: {
                    id: postId,
                },
            });
            if (!post) {
                return res.status(404).json({ message: "Post not found" });
            }
            else {
                await __1.default.post.delete({
                    where: {
                        id: postId,
                    },
                });
                return res.status(200).json({ message: "Post deleted successfully" });
            }
        }
    }
    catch (error) {
        console.log(error.message);
        res.status(500).json({ message: error.message });
    }
};
exports.deletePost = deletePost;
const deleteImage = async (req, res) => {
    try {
        const user = req.user;
        if (user.role === "ADMIN") {
            const { imageId } = req.body;
            const image = await __1.default.postImage.findFirst({
                where: {
                    id: imageId,
                },
            });
            if (!image) {
                return res.status(404).json({ message: "Image not found" });
            }
            else {
                await __1.default.postImage.delete({
                    where: {
                        id: imageId,
                    },
                });
                return res.status(200).json({ message: "Image deleted successfully" });
            }
        }
    }
    catch (error) {
        console.log(error.message);
        res.status(500).json({ message: error.message });
    }
};
exports.deleteImage = deleteImage;
const hasLiked = async (req, res) => {
    try {
        const user = req.user;
        const { postId } = req.body;
        const hasLiked = await __1.default.like.findFirst({
            where: {
                userId: user.id,
                postId: postId,
            },
        });
        if (hasLiked) {
            return res.status(200).json({ hasLiked: true });
        }
        else {
            return res.status(200).json({ hasLiked: false });
        }
    }
    catch (error) {
        console.log(error.message);
        res.status(500).json({ message: error.message });
    }
};
exports.hasLiked = hasLiked;
const latestReviews = async (req, res) => {
    try {
        const cacheKey = "latest_reviews";
        const cachedTopPicks = await (0, redis_1.getFromCache)(cacheKey);
        if (cachedTopPicks) {
            console.log("📦 Cache HIT - returning cached top picks");
            return res.status(200).json({
                latestReviews: JSON.parse(cachedTopPicks),
                message: "Latest reviews fetched successfully (from cache)",
            });
        }
        console.log("🔍 Cache MISS - fetching from database");
        const latestReveiews = await __1.default.post.findMany({
            orderBy: {
                createdAt: "desc",
            },
            take: 7,
        });
        await (0, redis_1.setCache)(cacheKey, JSON.stringify(exports.latestReviews), 600);
        res.status(200).json({
            latestReviews: exports.latestReviews,
            message: "Latest reviews fetched successfully",
        });
    }
    catch (error) {
        console.log(error.message);
        res.status(500).json({ message: error.message });
    }
};
exports.latestReviews = latestReviews;
