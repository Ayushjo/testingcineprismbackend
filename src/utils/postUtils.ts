import { AuthorizedRequest } from "../middlewares/extractUser";
import { Response } from "express";
import client from "..";
export const getPostStats = async (req: AuthorizedRequest, res: Response) => {
  try {
    const { postId } = req.params;
    const userId = req.user?.id;

    const stats = await client.post.findUnique({
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
  } catch (error: any) {
    console.error("Error getting post stats:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
