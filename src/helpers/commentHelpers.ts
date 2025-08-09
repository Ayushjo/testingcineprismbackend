export const getCommentInclude = (depth = 0, maxDepth = 5): any => {
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
      include: getCommentInclude(depth + 1, maxDepth),
      orderBy: {
        createdAt: "asc",
      },
    },
  };
};

// Recursive function to format comments
export const formatComment = (comment: any): any => ({
  id: comment.id,
  username: comment.user.username,
  avatarInitial: comment.user.username[0].toUpperCase(),
  commentText: comment.content,
  userId: comment.userId,
  createdAt: comment.createdAt,
  replies: comment.replies?.map(formatComment) || [],
});
