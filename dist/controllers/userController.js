"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchCommentsWithOpinionId = exports.handleComment = exports.logoutUser = exports.toggleLike = exports.fetchAllOpinions = exports.postOpinion = exports.fetchUser = exports.loginUser = exports.registerUser = void 0;
const __1 = __importDefault(require(".."));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
const js_cookie_1 = __importDefault(require("js-cookie"));
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
        js_cookie_1.default.remove("token");
        res.status(200).json({ message: "Cookie deleted successfully" });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message });
    }
};
exports.logoutUser = logoutUser;
const handleComment = async (req, res) => {
    try {
        const opinionId = req.body?.opinionId;
        const postId = req.body?.postId;
        const parentCommentId = req.body?.parentCommentId;
        if (!opinionId && !postId && !parentCommentId) {
            return res.status(400).json({ message: "Bad request" });
        }
        else if (opinionId) {
            const content = req.body?.content;
            const userId = req.user.id;
            const comment = await __1.default.comment.create({
                data: {
                    content,
                    userId,
                    opinionId,
                },
                include: {
                    user: true
                }
            });
            const formattedComment = {
                id: comment.id,
                username: comment.user.username,
                avatarInitial: comment.user.username[0].toUpperCase(),
                commentText: comment.content,
                userId: comment.userId,
                createdAt: comment.createdAt,
                replies: [],
            };
            res
                .status(200)
                .json({ formattedComment, message: "Comment created successfully" });
        }
        else if (parentCommentId) {
            const content = req.body?.content;
            const userId = req.user.id;
            const comment = await __1.default.comment.create({
                data: {
                    content,
                    userId,
                    parentCommentId,
                },
                include: {
                    user: true
                }
            });
            res
                .status(200)
                .json({ message: "Comment created successfully" });
        }
    }
    catch (error) {
        console.log(error.message);
        res.status(500).json({ message: error.message });
    }
};
exports.handleComment = handleComment;
const fetchCommentsWithOpinionId = async (req, res) => {
    try {
        const { opinionId } = req.body;
        if (!opinionId) {
            return res.status(400).json({ message: "OpinionId is required" });
        }
        // Fetch top-level comments with recursive replies (up to 5 levels deep)
        const comments = await __1.default.comment.findMany({
            where: {
                opinionId: opinionId,
                parentCommentId: null, // Only top-level comments
            },
            include: (0, commentHelpers_1.getCommentInclude)(0, 5), // Support up to 5 levels of nesting
            orderBy: {
                createdAt: "asc",
            },
        });
        // Format comments recursively
        const formattedComments = comments.map(commentHelpers_1.formatComment);
        res.status(200).json({
            comments: formattedComments,
            message: "Comments fetched successfully",
        });
    }
    catch (error) {
        console.log(error.message);
        res.status(500).json({ message: error.message });
    }
};
exports.fetchCommentsWithOpinionId = fetchCommentsWithOpinionId;
