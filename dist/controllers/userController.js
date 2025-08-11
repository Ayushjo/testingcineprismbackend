"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadMoreReplies = exports.fetchCommentsWithOpinionId = exports.handleComment = exports.logoutUser = exports.toggleLike = exports.fetchAllOpinions = exports.postOpinion = exports.fetchUser = exports.loginUser = exports.registerUser = void 0;
const __1 = __importDefault(require(".."));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
const commentHelpers_1 = require("../helpers/commentHelpers");
dotenv_1.default.config();
const registerUser = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const existingUser = await __1.default.user.findFirst({
            where: {
                email,
            },
        });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        const user = await __1.default.user.create({
            data: {
                username,
                email,
                password: hashedPassword,
            },
        });
        res.status(200).json({ user, message: "User registered successfully" });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "An error occurred" });
    }
};
exports.registerUser = registerUser;
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await __1.default.user.findFirst({
            where: { email },
        });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const isPasswordValid = await bcrypt_1.default.compare(password, user.password);
        if (isPasswordValid) {
            const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "7d" });
            res.cookie("token", token, {
                httpOnly: true,
                secure: true,
                //@ts-ignore
                sameSite: "None",
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            });
            res.status(200).json({
                message: "Login successful",
                token,
                debug: {
                    cookieVariations: 4,
                    checkDevTools: "Look in Application > Cookies to see which ones were accepted",
                },
            });
        }
        else {
            res.status(401).json({ message: "Invalid credentials" });
        }
    }
    catch (error) {
        console.log("Login error:", error.message);
        res.status(500).json({ message: error.message });
    }
};
exports.loginUser = loginUser;
const fetchUser = async (req, res) => {
    try {
        const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
        if (!token) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const decodedToken = jsonwebtoken_1.default.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const user = await __1.default.user.findFirst({
            where: {
                id: decodedToken.id,
            },
        });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json({ user, message: "User fetched successfully" });
    }
    catch (error) {
        console.log(error.message);
        res.status(500).json({ message: error.message });
    }
};
exports.fetchUser = fetchUser;
const postOpinion = async (req, res) => {
    try {
        const { content, genres } = req.body;
        if (!genres) {
            return res
                .status(400)
                .json({ message: "Please select at least one genre" });
        }
        const user = req.user;
        const opinion = await __1.default.unpopularOpinion.create({
            data: {
                content,
                userId: user.id,
                genres,
            },
        });
        res.status(201).json({ opinion, message: "Opinion posted successfully" });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "An error occurred" });
    }
};
exports.postOpinion = postOpinion;
const fetchAllOpinions = async (req, res) => {
    try {
        const opinions = await __1.default.unpopularOpinion.findMany({
            include: {
                user: {
                    select: {
                        username: true,
                        email: true,
                    },
                },
                likes: true,
                comments: true,
            },
        });
        res
            .status(200)
            .json({ opinions, message: "Opinions fetched successfully" });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "An error occurred" });
    }
};
exports.fetchAllOpinions = fetchAllOpinions;
const toggleLike = async (req, res) => {
    try {
        const opinionId = req.body?.opinionId;
        const postId = req.body?.postId;
        console.log(opinionId, postId);
        if (!opinionId && !postId) {
            return res.status(400).json({ message: "Bad request" });
        }
        else if (opinionId) {
            const user = req.user;
            const userId = user.id;
            const existingLike = await __1.default.like.findFirst({
                where: {
                    opinionId,
                    userId,
                },
            });
            if (existingLike) {
                await __1.default.like.delete({
                    where: {
                        id: existingLike.id,
                    },
                });
                return res.status(200).json({ message: "Like deleted successfully" });
            }
            else {
                await __1.default.like.create({
                    data: {
                        opinionId,
                        userId,
                    },
                });
                res.status(200).json({ message: "Like created successfully" });
            }
        }
        else {
            const user = req.user;
            const userId = user.id;
            const existingLike = await __1.default.like.findFirst({
                where: {
                    postId,
                    userId,
                },
            });
            if (existingLike) {
                await __1.default.like.delete({
                    where: {
                        id: existingLike.id,
                    },
                });
                return res.status(200).json({ message: "Like deleted successfully" });
            }
            else {
                await __1.default.like.create({
                    data: {
                        postId,
                        userId,
                    },
                });
                res.status(200).json({ message: "Like created successfully" });
            }
        }
    }
    catch (error) {
        console.log(error.message);
        res.status(500).json({ message: error.message });
    }
};
exports.toggleLike = toggleLike;
const logoutUser = async (req, res) => {
    try {
        // Method 1: Using res.clearCookie() - Recommended
        res.clearCookie("token", {
            httpOnly: true, // Include if your cookie was set with httpOnly
            secure: true, // Include if your cookie was set with secure flag
            sameSite: "none", // Include if your cookie was set with  // Include if your cookie was set with a specific path
        });
        // Method 2: Alternative - Set cookie with expired date
        // res.cookie("token", "", {
        //   httpOnly: true,
        //   secure: process.env.NODE_ENV === "production",
        //   sameSite: "strict",
        //   expires: new Date(0) // Set expiry to past date
        // });
        res.status(200).json({ message: "Logged out successfully" });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message });
    }
};
exports.logoutUser = logoutUser;
const handleComment = async (req, res) => {
    try {
        const { opinionId, postId, parentCommentId, content } = req.body;
        if (!opinionId && !postId && !parentCommentId) {
            return res.status(400).json({ message: "Bad request" });
        }
        if (!content?.trim()) {
            return res.status(400).json({ message: "Comment content is required" });
        }
        const userId = req.user.id;
        // Validate that the parent comment exists if parentCommentId is provided
        if (parentCommentId) {
            const parentComment = await __1.default.comment.findUnique({
                where: { id: parentCommentId },
            });
            if (!parentComment) {
                return res.status(404).json({ message: "Parent comment not found" });
            }
        }
        const comment = await __1.default.comment.create({
            data: {
                content: content.trim(),
                userId,
                opinionId,
                postId,
                parentCommentId,
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
                    select: {
                        replies: true,
                    },
                },
            },
        });
        const formattedComment = (0, commentHelpers_1.formatComment)(comment);
        res.status(200).json({
            formattedComment,
            message: "Comment created successfully",
        });
    }
    catch (error) {
        console.log(error.message);
        res.status(500).json({ message: error.message });
    }
};
exports.handleComment = handleComment;
const fetchCommentsWithOpinionId = async (req, res) => {
    try {
        const { opinionId, parentCommentId = null, page = 1, limit = 20, loadReplies = false, } = req.body;
        if (!opinionId) {
            return res.status(400).json({ message: "OpinionId is required" });
        }
        const offset = (page - 1) * limit;
        if (loadReplies && parentCommentId) {
            // Load replies for a specific comment (lazy loading)
            const replies = await __1.default.comment.findMany({
                where: {
                    parentCommentId: parentCommentId,
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
                        select: {
                            replies: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: "asc",
                },
                skip: offset,
                take: limit,
            });
            const formattedReplies = replies.map(commentHelpers_1.formatComment);
            const totalReplies = await __1.default.comment.count({
                where: {
                    parentCommentId: parentCommentId,
                },
            });
            return res.status(200).json({
                comments: formattedReplies,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalReplies / limit),
                    hasMore: offset + replies.length < totalReplies,
                    totalCount: totalReplies,
                },
                message: "Replies fetched successfully",
            });
        }
        // Load top-level comments with limited depth (first load)
        const comments = await __1.default.comment.findMany({
            where: {
                opinionId: opinionId,
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
                replies: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                email: true,
                            },
                        },
                        _count: {
                            select: {
                                replies: true,
                            },
                        },
                    },
                    orderBy: {
                        createdAt: "asc",
                    },
                    take: 3, // Only show first 3 replies initially
                },
                _count: {
                    select: {
                        replies: true,
                    },
                },
            },
            orderBy: {
                createdAt: "asc",
            },
            skip: offset,
            take: limit,
        });
        // Format comments with "load more" indicators
        const formattedComments = comments.map((comment) => ({
            ...(0, commentHelpers_1.formatComment)(comment),
            replies: comment.replies.map(commentHelpers_1.formatComment),
            hasMoreReplies: (comment._count?.replies || 0) > 3,
            totalReplies: comment._count?.replies || 0,
        }));
        const totalComments = await __1.default.comment.count({
            where: {
                opinionId: opinionId,
                parentCommentId: null,
            },
        });
        res.status(200).json({
            comments: formattedComments,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalComments / limit),
                hasMore: offset + comments.length < totalComments,
                totalCount: totalComments,
            },
            message: "Comments fetched successfully",
        });
    }
    catch (error) {
        console.log(error.message);
        res.status(500).json({ message: error.message });
    }
};
exports.fetchCommentsWithOpinionId = fetchCommentsWithOpinionId;
const loadMoreReplies = async (req, res) => {
    try {
        const { parentCommentId, page = 1, limit = 10 } = req.body;
        if (!parentCommentId) {
            return res.status(400).json({ message: "Parent comment ID is required" });
        }
        const offset = (page - 1) * limit;
        const replies = await __1.default.comment.findMany({
            where: {
                parentCommentId: parentCommentId,
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
                    select: {
                        replies: true,
                    },
                },
            },
            orderBy: {
                createdAt: "asc",
            },
            skip: offset,
            take: limit,
        });
        const formattedReplies = replies.map(commentHelpers_1.formatComment);
        const totalReplies = await __1.default.comment.count({
            where: {
                parentCommentId: parentCommentId,
            },
        });
        res.status(200).json({
            replies: formattedReplies,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalReplies / limit),
                hasMore: offset + replies.length < totalReplies,
                totalCount: totalReplies,
            },
            parentCommentId,
            message: "Replies loaded successfully",
        });
    }
    catch (error) {
        console.log(error.message);
        res.status(500).json({ message: error.message });
    }
};
exports.loadMoreReplies = loadMoreReplies;
