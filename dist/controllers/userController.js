"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleLike = exports.fetchAllOpinions = exports.postOpinion = exports.fetchUser = exports.loginUser = exports.registerUser = void 0;
const __1 = __importDefault(require(".."));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
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
        console.log("=== LOGIN REQUEST DEBUG START ===");
        console.log("Request Origin:", req.headers.origin);
        console.log("NODE_ENV:", process.env.NODE_ENV);
        const user = await __1.default.user.findFirst({
            where: { email },
        });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const isPasswordValid = await bcrypt_1.default.compare(password, user.password);
        if (isPasswordValid) {
            const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "7d" });
            // TRY MULTIPLE COOKIE APPROACHES
            console.log("\n=== TRYING MULTIPLE COOKIE APPROACHES ===");
            // Approach 1: Standard SameSite=None
            const cookieOptions1 = {
                httpOnly: true,
                secure: true,
                sameSite: "none",
                maxAge: 7 * 24 * 60 * 60 * 1000,
                path: "/",
            };
            // Approach 2: Add explicit domain
            const cookieOptions2 = {
                httpOnly: true,
                secure: true,
                sameSite: "none",
                maxAge: 7 * 24 * 60 * 60 * 1000,
                path: "/",
                domain: ".railway.app",
            };
            // Approach 3: Manual header setting
            const manualCookieString = `token=${token}; Max-Age=${7 * 24 * 60 * 60}; Path=/; HttpOnly; Secure; SameSite=None`;
            console.log("Trying approach 1 - Standard cookie");
            res.cookie("token", token, cookieOptions1);
            console.log("Trying approach 2 - With domain");
            res.cookie("token2", token, cookieOptions2);
            console.log("Trying approach 3 - Manual header");
            const existingSetCookie = res.getHeader("Set-Cookie") || [];
            const setCookieArray = Array.isArray(existingSetCookie)
                ? existingSetCookie
                : [existingSetCookie];
            setCookieArray.push(manualCookieString);
            res.setHeader("Set-Cookie", setCookieArray);
            // Check what we actually set
            console.log("Final Set-Cookie headers:", res.getHeader("Set-Cookie"));
            res.status(200).json({
                message: "Login successful",
                token,
                debug: {
                    cookiesAttempted: 3,
                    timestamp: new Date().toISOString(),
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
