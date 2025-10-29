"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRefreshToken = void 0;
const REFRESH_SECRET = process.env.REFRESH_SECRET;
const validateRefreshToken = (req, res, next) => {
    const token = req.headers["x-refresh-token"];
    if (token !== REFRESH_SECRET) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    next();
};
exports.validateRefreshToken = validateRefreshToken;
