"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPostStats = void 0;
const __1 = __importDefault(require(".."));
const getPostStats = async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.user?.id;
        const stats = await __1.default.post.findUnique({
            where: { id: postId },
            select: {
                _count: {
                    select: {
                        likes: true,
                        comments: true,
                    },
                },
                likes: userId
                    ? {
                        where: { userId },
                        select: { id: true },
                    }
                    : false,
            },
        });
        if (!stats) {
            return res.status(404).json({
                success: false,
                message: "Post not found",
            });
        }
        res.status(200).json({
            success: true,
            stats: {
                likeCount: stats._count.likes,
                commentCount: stats._count.comments,
                isLiked: userId ? stats.likes.length > 0 : false,
            },
        });
    }
    catch (error) {
        console.error("Error getting post stats:", error.message);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
exports.getPostStats = getPostStats;
