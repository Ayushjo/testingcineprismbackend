"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatComment = exports.getCommentInclude = void 0;
const getCommentInclude = (depth = 0, maxDepth = 5) => {
    if (depth >= maxDepth) {
        return {
            user: {
                select: {
                    id: true,
                    username: true,
                    email: true,
                },
            },
        };
    }
    return {
        user: {
            select: {
                id: true,
                username: true,
                email: true,
            },
        },
        replies: {
            include: (0, exports.getCommentInclude)(depth + 1, maxDepth),
            orderBy: {
                createdAt: "asc",
            },
        },
    };
};
exports.getCommentInclude = getCommentInclude;
// Recursive function to format comments
const formatComment = (comment) => ({
    id: comment.id,
    username: comment.user.username,
    avatarInitial: comment.user.username[0].toUpperCase(),
    commentText: comment.content,
    userId: comment.userId,
    createdAt: comment.createdAt,
    replies: comment.replies?.map(exports.formatComment) || [],
});
exports.formatComment = formatComment;
