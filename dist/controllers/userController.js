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
        // === DEBUGGING: REQUEST INFO ===
        console.log("=== LOGIN REQUEST DEBUG START ===");
        console.log("Timestamp:", new Date().toISOString());
        console.log("Request Origin:", req.headers.origin);
        console.log("Request Host:", req.headers.host);
        console.log("Request User-Agent:", req.headers["user-agent"]);
        console.log("Request Referer:", req.headers.referer);
        console.log("All Request Headers:", JSON.stringify(req.headers, null, 2));
        console.log("NODE_ENV:", process.env.NODE_ENV);
        console.log("Request body email:", email);
        console.log("=== END REQUEST INFO ===\n");
        const user = await __1.default.user.findFirst({
            where: { email },
        });
        if (!user) {
            console.log("❌ User not found for email:", email);
            return res.status(404).json({ message: "User not found" });
        }
        console.log("✅ User found:", {
            id: user.id,
            email: user.email,
            username: user.username,
        });
        const isPasswordValid = await bcrypt_1.default.compare(password, user.password);
        if (isPasswordValid) {
            console.log("✅ Password validation successful");
            const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "7d" });
            console.log("✅ JWT token generated");
            console.log("Token length:", token.length);
            console.log("Token preview:", token.substring(0, 50) + "...");
            // === DEBUGGING: COOKIE CONFIGURATION ===
            const cookieOptions = {
                httpOnly: true,
                secure: true,
                sameSite: "none",
                maxAge: 7 * 24 * 60 * 60 * 1000,
                path: "/",
            };
            console.log("\n=== COOKIE DEBUG START ===");
            console.log("Cookie options:", JSON.stringify(cookieOptions, null, 2));
            console.log("Cookie max age in days:", cookieOptions.maxAge / (24 * 60 * 60 * 1000));
            // Check current response headers before setting cookie
            console.log("Response headers BEFORE setting cookie:", res.getHeaders());
            // Set the cookie
            res.cookie("token", token, cookieOptions);
            // Check response headers after setting cookie
            console.log("Response headers AFTER setting cookie:", res.getHeaders());
            // Try to get the set-cookie header specifically
            const setCookieHeader = res.getHeader("Set-Cookie");
            console.log("Set-Cookie header value:", setCookieHeader);
            console.log("Set-Cookie header type:", typeof setCookieHeader);
            if (Array.isArray(setCookieHeader)) {
                console.log("Set-Cookie header array length:", setCookieHeader.length);
                setCookieHeader.forEach((cookie, index) => {
                    console.log(`Set-Cookie[${index}]:`, cookie);
                });
            }
            // Manual verification of cookie string
            const expectedCookieString = `token=${token}; Max-Age=${cookieOptions.maxAge}; Path=/; HttpOnly; Secure; SameSite=None`;
            console.log("Expected cookie string preview:", expectedCookieString.substring(0, 100) + "...");
            console.log("=== END COOKIE DEBUG ===\n");
            // === DEBUGGING: RESPONSE INFO ===
            console.log("=== RESPONSE DEBUG START ===");
            console.log("About to send response with status 200");
            console.log("Response message: Login successful");
            console.log("Including token in response body: YES");
            const response = res.status(200).json({
                message: "Login successful",
                token,
                debug: {
                    cookieSet: !!setCookieHeader,
                    timestamp: new Date().toISOString(),
                    userAgent: req.headers["user-agent"],
                    origin: req.headers.origin,
                },
            });
            console.log("✅ Response sent successfully");
            console.log("=== LOGIN REQUEST DEBUG END ===\n");
            return response;
        }
        else {
            console.log("❌ Password validation failed for user:", email);
            return res.status(401).json({ message: "Invalid credentials" });
        }
    }
    catch (error) {
        console.log("💥 LOGIN ERROR OCCURRED:");
        console.log("Error message:", error.message);
        console.log("Error stack:", error.stack);
        console.log("Error name:", error.name);
        console.log("Full error object:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
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
