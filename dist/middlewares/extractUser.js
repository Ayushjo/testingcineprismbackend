"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractUserDetails = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const __1 = __importDefault(require(".."));
const extractUserDetails = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const token = authHeader.split(" ")[1];
        const decodedToken = jsonwebtoken_1.default.verify(token, process.env.ACCESS_TOKEN_SECRET);
        if (!decodedToken || !decodedToken.id) {
            return res.status(401).json({
                message: "Token expired. Please login again",
            });
        }
        const user = await __1.default.user.findFirst({
            where: { id: decodedToken.id },
        });
        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }
        req.user = user;
        next();
    }
    catch (error) {
        console.log(error.message);
        res.status(500).json({ message: error.message });
    }
};
exports.extractUserDetails = extractUserDetails;
