"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchAllPost = exports.uploadImages = exports.createPost = exports.uploadPoster = void 0;
const dataUri_1 = __importDefault(require("../config/dataUri"));
const __1 = __importDefault(require(".."));
const cloudinary_1 = __importDefault(require("cloudinary"));
const uploadPoster = async (req, res) => {
    try {
        const user = req.user;
        if (user.role === "ADMIN") {
            const file = req.file;
            const { postId } = req.body;
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
            res.status(401).json({ message: "You are not an admin" });
        }
    }
    catch (error) {
        console.log(error.message);
        res.status(500).json({ message: error.message });
    }
};
exports.uploadPoster = uploadPoster;
const createPost = async (req, res) => {
    try {
        const user = req.user;
        if (user.role === "ADMIN") {
            const { title, content, origin, duration, genres, year, ratingCategory, relatedPostIds, } = req.body;
            const post = await __1.default.post.create({
                data: {
                    title,
                    content,
                    origin,
                    duration,
                    genres,
                    year,
                    ratingCategory,
                    relatedPostIds,
                },
            });
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
        const posts = await __1.default.post.findMany({
            include: {
                images: true,
            },
        });
        res.status(200).json({ posts, message: "Posts fetched successfully" });
    }
    catch (error) {
        console.log(error.message);
        res.status(500).json({ message: error.message });
    }
};
exports.fetchAllPost = fetchAllPost;
