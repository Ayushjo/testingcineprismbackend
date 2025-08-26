"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logoutUser = exports.fetchUser = exports.googleAuthFailure = exports.googleAuthSuccess = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const __1 = __importDefault(require(".."));
// Helper function to generate JWT (no cookies)
const generateToken = (user) => {
    return jsonwebtoken_1.default.sign({ id: user.id, email: user.email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "7d" });
};
// Google OAuth Success Handler
const googleAuthSuccess = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            return res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
        }
        const token = generateToken(user);
        // Redirect with token in URL (will be handled by frontend)
        res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
    }
    catch (error) {
        console.error("Google auth success error:", error);
        res.redirect(`${process.env.FRONTEND_URL}/login?error=server_error`);
    }
};
exports.googleAuthSuccess = googleAuthSuccess;
// Google OAuth Failure Handler
const googleAuthFailure = (req, res) => {
    res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
};
exports.googleAuthFailure = googleAuthFailure;
// Fetch user (token only from Authorization header)
const fetchUser = async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const token = authHeader.split(" ")[1];
        const decodedToken = jsonwebtoken_1.default.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const user = await __1.default.user.findFirst({
            where: { id: decodedToken.id },
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                profilePicture: true,
                isEmailVerified: true,
                createdAt: true,
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
// Logout (just a client-side action, but endpoint for consistency)
const logoutUser = async (req, res) => {
    res.status(200).json({ message: "Logged out successfully" });
};
exports.logoutUser = logoutUser;
