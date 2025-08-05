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
        const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
        if (!token) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        else {
            const decodedToken = jsonwebtoken_1.default.verify(token, process.env.ACCESS_TOKEN_SECRET);
            if (!decodedToken || !decodedToken.id) {
                return res
                    .status(401)
                    .json({ message: "Token expired.Please login again" });
            }
            else {
                const user = await __1.default.user.findFirst({
                    where: {
                        id: decodedToken.id,
                    },
                });
                req.user = user;
                next();
            }
        }
    }
    catch (error) {
        console.log(error.message);
        res.status(500).json({ message: error.message });
    }
};
exports.extractUserDetails = extractUserDetails;
