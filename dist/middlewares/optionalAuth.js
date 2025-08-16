"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const __1 = __importDefault(require(".."));
const optionalAuth = async (req, res, next) => {
    try {
        const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
        if (!token) {
            // No token provided, continue without user
            req.user = null;
            return next();
        }
        const decodedToken = jsonwebtoken_1.default.verify(token, process.env.ACCESS_TOKEN_SECRET);
        if (!decodedToken || !decodedToken.id) {
            // Invalid token, continue without user
            req.user = null;
            return next();
        }
        const user = await __1.default.user.findFirst({
            where: { id: decodedToken.id },
            select: {
                id: true,
                username: true,
                email: true,
            },
        });
        req.user = user;
        next();
    }
    catch (error) {
        // Token verification failed, continue without user
        req.user = null;
        next();
    }
};
exports.optionalAuth = optionalAuth;
