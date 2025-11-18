import { Request, Response } from "express";
import client from "..";
import { AuthorizedRequest } from "../middlewares/extractUser";
import getBuffer from "../config/dataUri";
import cloudinary from "cloudinary";
import { deleteCache, getFromCache, setCache } from "../config/redis";
import { uploadToS3 } from "../utils/s3Upload";
import { deleteFromS3 } from "../utils/s3Delete";
const generateSlug = (title: string) => {
  return title
    .toLowerCase() // "Top 25..." → "top 25..."
    .replace(/[^\w\s-]/g, "") // Remove special chars → "top 25 movies of all time  a complete analysis"
    .replace(/\s+/g, "-") // Spaces to hyphens → "top-25-movies-of-all-time--a-complete-analysis"
    .replace(/--+/g, "-") // Multiple hyphens to single → "top-25-movies-of-all-time-a-complete-analysis"
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
};
export const createArticle = async (req: AuthorizedRequest, res: Response) => {
  try {
    const user = req.user;
    if (user.role === "USER") {
      return res.status(400).json({ message: "You are not authorized" });
    }

    const { title, shortDescription, author, published, blocks } = req.body;
    const slug = generateSlug(title);
    const parsedBlocks = JSON.parse(blocks);

    const files = (req.files as Express.Multer.File[]) || [];

    let mainImageUrl = "";
    let mainImageKey = "";

    const mainImageFile = files?.find?.(
      (file) => file.fieldname === "mainImage"
    );

    if (mainImageFile) {
      // ✅ CHANGED: Using S3 instead of Cloudinary
      const { url, key } = await uploadToS3(
        mainImageFile,
        "articles/main-images"
      );
      mainImageUrl = url;
      mainImageKey = key;
    }

    const processedBlocks: any = await Promise.all(
      parsedBlocks.map(async (block: any, index: number) => {
        if (block.type === "IMAGE") {
          const blockImageFile = files?.find?.(
            (file) => file.fieldname === `blockImage_${index}`
          );
          if (!blockImageFile) {
            return block;
          }

          // ✅ CHANGED: Using S3 instead of Cloudinary
          const { url, key } = await uploadToS3(
            blockImageFile,
            "articles/content-blocks"
          );

          return {
            type: block.type,
            content: {
              url,
              key, // S3 key instead of publicId
              alt: block.content?.alt || "",
              caption: block.content?.caption || "",
            },
            order: index,
          };
        }

        return {
          ...block,
          order: index,
        };
      })
    );

    const article = await client.article.create({
      data: {
        title,
        slug,
        shortDescription,
        author,
        published: published === "true",
        publishedAt: published === "true" ? new Date() : null,
        mainImageUrl,
        mainImagePublicId: mainImageKey, // Store S3 key in existing field
        blocks: {
          create: processedBlocks,
        },
      },
      include: {
        blocks: {
          orderBy: { order: "asc" },
        },
      },
    });

    await deleteCache("all_articles");

    res.status(200).json({ article });
  } catch (error: any) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
};
export const getArticles = async (req: Request, res: Response) => {
  try {
    const cacheKey = "all_articles";
    // Try cache first
    const cachedArticles = await getFromCache(cacheKey);

    if (cachedArticles) {
      console.log("📦 Cache HIT - returning cached posts");
      return res.status(200).json({
        articles: JSON.parse(cachedArticles),
        message: "Articles fetched successfully (from cache)",
      });
    }
    console.log("🔍 Cache MISS - fetching from database");
    const articles = await client.article.findMany({
      where: { published: true },
    });
    await setCache(cacheKey, JSON.stringify(articles), 300);
    res.status(200).json({ articles });
  } catch (error: any) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
};

export const getSingleArticle = async (
  req: AuthorizedRequest,
  res: Response
) => {
  try {
    const { slug } = req.params;
    const cacheKey = `article:${slug}`;

    const cachedArticle = await getFromCache(cacheKey);
    if (cachedArticle) {
      const parsedArticle = JSON.parse(cachedArticle);

      // Still increment view count for cached articles
      if (parsedArticle.viewCount !== undefined) {
        await client.article.update({
          where: { id: parsedArticle.id },
          data: {
            viewCount: parsedArticle.viewCount + 1,
          },
        });

        // Update the cached article's view count
        parsedArticle.viewCount += 1;
        await setCache(cacheKey, JSON.stringify(parsedArticle), 1800); // ✅ Fixed: was 1900
      }

      return res.status(200).json({ article: parsedArticle });
    }

    // If not in cache, fetch from database
    const article = await client.article.findFirst({
      where: { slug },
      include: {
        blocks: {
          orderBy: {
            order: "asc",
          },
        },
      },
    });

    if (!article) {
      return res.status(404).json({ message: "Article not found" });
    }

    // Increment view count
    let updatedArticle = article;
    if (article.viewCount !== undefined) {
      updatedArticle = await client.article.update({
        where: { id: article.id },
        data: {
          viewCount: article.viewCount + 1,
        },
        include: {
          blocks: {
            orderBy: {
              order: "asc",
            },
          },
        },
      });
    }

    // Cache the article for 30 minutes (1800 seconds)
    await setCache(cacheKey, JSON.stringify(updatedArticle), 1800);

    res.status(200).json({ article: updatedArticle });
  } catch (error: any) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
};
export const updateArticle = async (req: AuthorizedRequest, res: Response) => {
  try {
    const user = req.user;

    // 1. Authorization check
    if (user.role === "USER") {
      return res.status(403).json({ message: "You are not authorized" });
    }

    // 2. Extract data from request
    const { articleId } = req.params;
    const {
      title,
      shortDescription,
      author,
      published,
      blocks,
      keepImagePublicIds,
      keepMainImage,
    } = req.body;

    // 3. Validate article exists
    const existingArticle = await client.article.findUnique({
      where: { id: articleId },
      include: {
        blocks: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!existingArticle) {
      return res.status(404).json({ message: "Article not found" });
    }

    // 4. Parse JSON strings
    const parsedBlocks = JSON.parse(blocks);
    const keepImagePublicIdsArray = keepImagePublicIds
      ? JSON.parse(keepImagePublicIds)
      : [];

    // 5. Handle file uploads safely
    const files = (req.files as Express.Multer.File[]) || [];

    // 6. Collect current image publicIds for cleanup
    // UPDATED: Use the new field first, fallback to extracting from URL
    const currentMainImagePublicId =
      existingArticle.mainImagePublicId ||
      extractPublicIdFromUrl(existingArticle.mainImageUrl);

    // UPDATED: Use the new publicId field first, fallback to content
    const currentBlockImagePublicIds = existingArticle.blocks
      .filter((block) => block.type === "IMAGE")
      .map((block) => block.publicId || (block.content as any)?.publicId)
      .filter(Boolean); // Remove nulls

    // 7. Track images to delete
    let imagesToDelete: string[] = [];

    // 8. Process main image
    let mainImageUrl = existingArticle.mainImageUrl;
    let mainImagePublicId = existingArticle.mainImagePublicId; // NEW: Track publicId

    if (keepMainImage === "false" || !keepMainImage) {
      const mainImageFile = files?.find?.(
        (file) => file.fieldname === "mainImage"
      );

      if (mainImageFile) {
        const fileBuffer = getBuffer(mainImageFile);
        if (!fileBuffer || !fileBuffer.content) {
          return res.status(500).json({
            message: "Failed to process main image file.",
          });
        }

        const cloud = await cloudinary.v2.uploader.upload(fileBuffer.content, {
          folder: "articles",
        });

        if (!cloud) {
          return res.status(500).json({
            message: "Failed to upload main image to cloudinary",
          });
        }

        mainImageUrl = cloud.url;
        mainImagePublicId = cloud.public_id; // NEW: Save publicId

        // Mark old main image for deletion
        if (currentMainImagePublicId) {
          imagesToDelete.push(currentMainImagePublicId);
        }
      }
    }

    // 9. Process blocks and upload new block images
    const processedBlocks = await Promise.all(
      parsedBlocks.map(async (block: any, index: number) => {
        if (block.type === "IMAGE") {
          const blockImageFile = files?.find?.(
            (file) => file.fieldname === `blockImage_${index}`
          );

          if (blockImageFile) {
            // NEW IMAGE UPLOAD
            const fileBuffer = getBuffer(blockImageFile);
            if (!fileBuffer || !fileBuffer.content) {
              throw new Error(
                `Failed to process image file for block ${index}.`
              );
            }

            const cloud = await cloudinary.v2.uploader.upload(
              fileBuffer.content,
              { folder: "articles" }
            );

            if (!cloud) {
              throw new Error(
                `Failed to upload image for block ${index} to cloudinary`
              );
            }

            // If this block had an old image, mark it for deletion
            if (
              block.content?.publicId &&
              block.content.keepExisting === false
            ) {
              imagesToDelete.push(block.content.publicId);
            }

            // UPDATED: Return with publicId at top level
            return {
              type: block.type,
              content: {
                url: cloud.url,
                publicId: cloud.public_id,
                alt: block.content.alt || "",
                caption: block.content.caption || "",
              },
              publicId: cloud.public_id, // NEW: Add publicId field
              order: index,
            };
          } else {
            // KEEPING EXISTING IMAGE
            // UPDATED: Return with publicId at top level
            return {
              type: block.type,
              content: {
                url: block.content.url,
                publicId: block.content.publicId,
                alt: block.content.alt || "",
                caption: block.content.caption || "",
              },
              publicId: block.content.publicId, // NEW: Add publicId field
              order: index,
            };
          }
        }

        // Non-image blocks
        return {
          type: block.type,
          content: block.content,
          publicId: null, // NEW: Null for non-image blocks
          order: index,
        };
      })
    );

    // 10. Determine all images to delete
    const blockImagesToDelete = currentBlockImagePublicIds.filter(
      (publicId) => !keepImagePublicIdsArray.includes(publicId)
    );

    imagesToDelete = [...imagesToDelete, ...blockImagesToDelete];

    // 11. Generate new slug if title changed
    const slug =
      title !== existingArticle.title
        ? generateSlug(title)
        : existingArticle.slug;

    // 12. Update article in database with transaction
    const updatedArticle = await client.$transaction(async (prisma) => {
      await prisma.contentBlock.deleteMany({
        where: { articleId },
      });

      // UPDATED: Include mainImagePublicId in update
      const article = await prisma.article.update({
        where: { id: articleId },
        data: {
          title,
          slug,
          shortDescription,
          author,
          published: published === "true",
          publishedAt:
            published === "true"
              ? existingArticle.publishedAt || new Date()
              : null,
          mainImageUrl,
          mainImagePublicId, // NEW: Save publicId
          blocks: {
            create: processedBlocks, // Now includes publicId field
          },
        },
        include: {
          blocks: {
            orderBy: { order: "asc" },
          },
        },
      });

      return article;
    });

    // 13. Delete orphaned images from Cloudinary
    if (imagesToDelete.length > 0) {
      Promise.all(
        imagesToDelete.map(async (publicId) => {
          try {
            await cloudinary.v2.uploader.destroy(publicId);
            console.log(`Deleted image: ${publicId}`);
          } catch (error) {
            console.error(`Failed to delete image ${publicId}:`, error);
          }
        })
      ).catch((error) => {
        console.error("Error deleting images:", error);
      });
    }

    // 14. Clear cache
    await deleteCache(`article:${existingArticle.slug}`);
    await deleteCache(`article:${slug}`);
    await deleteCache("all_articles");

    // 15. Send response
    res.status(200).json({
      message: "Article updated successfully",
      article: updatedArticle,
    });
  } catch (error: any) {
    console.error("Update article error:", error);
    res.status(500).json({
      message: error.message || "Failed to update article",
    });
  }
};

function extractPublicIdFromUrl(url: string): string | null {
  try {
    const matches = url.match(/\/v\d+\/(.+)\.\w+$/);
    if (matches && matches[1]) {
      return matches[1];
    }
    return null;
  } catch (error) {
    console.error("Error extracting publicId from URL:", error);
    return null;
  }
}

export const createComment = async (req: AuthorizedRequest, res: Response) => {
  try {
    const { articleId } = req.params;
    const { content } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Comment content is required",
      });
    }

    if (content.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Comment content too long (max 1000 characters)",
      });
    }

    // Verify post exists
    const postExists = await client.article.findUnique({
      where: { id: articleId },
      select: { id: true },
    });

    if (!postExists) {
      return res.status(404).json({
        success: false,
        message: "Article not found",
      });
    }

    const newComment = await client.comment.create({
      data: {
        content: content.trim(),
        userId,
        articleId,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        _count: {
          select: { replies: true },
        },
      },
    });

    res.status(201).json({
      success: true,
      comment: {
        ...newComment,
        replyCount: 0,
        replies: [],
      },
    });
  } catch (error: any) {
    console.error("Error creating comment:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const createReply = async (req: AuthorizedRequest, res: Response) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Reply content is required",
      });
    }

    if (content.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Reply content too long (max 1000 characters)",
      });
    }

    // Verify parent comment exists and get postId
    const parentComment: any = await client.comment.findUnique({
      where: { id: commentId },
      select: {
        id: true,
        articleId: true,
        parentCommentId: true,
        // Optional: Add depth tracking
        user: {
          select: { username: true },
        },
      },
    });

    if (!parentComment) {
      return res.status(404).json({
        success: false,
        message: "Parent comment not found",
      });
    }

    // Optional: Add maximum nesting depth limit (uncomment if needed)
    /*
    const depth = await getCommentDepth(commentId);
    const MAX_NESTING_DEPTH = 10; // Adjust as needed
    
    if (depth >= MAX_NESTING_DEPTH) {
      return res.status(400).json({
        success: false,
        message: `Maximum nesting depth (${MAX_NESTING_DEPTH}) reached. Please start a new thread.`,
      });
    }
    */

    const newReply = await client.comment.create({
      data: {
        content: content.trim(),
        userId,
        articleId: parentComment.articleId,
        parentCommentId: commentId,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        _count: {
          select: { replies: true },
        },
        // Include parent comment info for context
        parentComment: {
          select: {
            id: true,
            user: {
              select: { username: true },
            },
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      reply: {
        ...newReply,
        replyCount: 0,
        replies: [],
      },
    });
  } catch (error: any) {
    console.error("Error creating reply:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const updateComment = async (req: AuthorizedRequest, res: Response) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Comment content is required",
      });
    }

    // Verify comment ownership
    const comment = await client.comment.findUnique({
      where: { id: commentId },
      select: { userId: true, createdAt: true },
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    if (comment.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this comment",
      });
    }

    // Check if comment is too old to edit (24 hours)
    const hoursSinceCreation =
      (Date.now() - comment.createdAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceCreation > 24) {
      return res.status(400).json({
        success: false,
        message: "Comments cannot be edited after 24 hours",
      });
    }

    const updatedComment = await client.comment.update({
      where: { id: commentId },
      data: {
        content: content.trim(),
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        _count: {
          select: { replies: true },
        },
      },
    });

    res.status(200).json({
      success: true,
      comment: updatedComment,
    });
  } catch (error: any) {
    console.error("Error updating comment:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const deleteComment = async (req: AuthorizedRequest, res: Response) => {
  try {
    const { commentId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Verify comment ownership
    const comment = await client.comment.findUnique({
      where: { id: commentId },
      select: {
        userId: true,
        _count: { select: { replies: true } },
      },
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    if (comment.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this comment",
      });
    }

    // If comment has replies, mark as deleted instead of hard delete
    if (comment._count.replies > 0) {
      await client.comment.update({
        where: { id: commentId },
        data: {
          content: "[This comment has been deleted]",
          updatedAt: new Date(),
        },
      });

      res.status(200).json({
        success: true,
        message: "Comment marked as deleted",
      });
    } else {
      // Hard delete if no replies
      await client.comment.delete({
        where: { id: commentId },
      });

      res.status(200).json({
        success: true,
        message: "Comment deleted successfully",
      });
    }
  } catch (error: any) {
    console.error("Error deleting comment:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const fetchComments = async (req: AuthorizedRequest, res: Response) => {
  try {
    const { articleId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const comments = await client.comment.findMany({
      where: {
        articleId,
        parentCommentId: null, // Only top-level comments
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        _count: {
          select: { replies: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    const totalComments = await client.comment.count({
      where: {
        articleId,
        parentCommentId: null,
      },
    });

    const transformedComments = comments.map((comment) => ({
      ...comment,
      replyCount: comment._count.replies,
      replies: [], // Replies loaded separately
    }));

    res.status(200).json({
      success: true,
      comments: transformedComments,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalComments / limit),
        totalComments,
        hasMore: skip + comments.length < totalComments,
      },
    });
  } catch (error: any) {
    console.error("Error fetching comments:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const fetchReplies = async (req: AuthorizedRequest, res: Response) => {
  try {
    const { commentId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const nested = req.query.nested === "true"; // Flag to fetch nested structure
    const skip = (page - 1) * limit;

    if (nested) {
      // Fetch replies with their nested replies (recursive structure)
      const replies = await fetchNestedReplies(commentId, skip, limit);
      const totalReplies = await client.comment.count({
        where: { parentCommentId: commentId },
      });

      res.status(200).json({
        success: true,
        replies,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalReplies / limit),
          totalReplies,
          hasMore: skip + replies.length < totalReplies,
        },
      });
    } else {
      // Original flat structure for backward compatibility
      const replies = await client.comment.findMany({
        where: {
          parentCommentId: commentId,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          _count: {
            select: { replies: true },
          },
        },
        orderBy: { createdAt: "asc" },
        skip,
        take: limit,
      });

      const totalReplies = await client.comment.count({
        where: { parentCommentId: commentId },
      });

      res.status(200).json({
        success: true,
        replies,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalReplies / limit),
          totalReplies,
          hasMore: skip + replies.length < totalReplies,
        },
      });
    }
  } catch (error: any) {
    console.error("Error fetching replies:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
export const fetchCommentThread = async (
  req: AuthorizedRequest,
  res: Response
) => {
  try {
    const { commentId } = req.params;

    // Get the full thread starting from root comment
    const rootComment = await findRootComment(commentId);
    if (!rootComment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    const thread = await fetchNestedReplies(rootComment.id);

    res.status(200).json({
      success: true,
      thread: {
        ...rootComment,
        replies: thread,
      },
    });
  } catch (error: any) {
    console.error("Error fetching comment thread:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const toggleLike = async (req: AuthorizedRequest, res: Response) => {
  try {
    const { articleId } = req.params;
    const userId = req.user?.id;
    console.log(userId);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Verify post exists
    const articletExists = await client.article.findUnique({
      where: { id: articleId },
      select: { id: true },
    });

    if (!articletExists) {
      return res.status(404).json({
        success: false,
        message: "Article not found",
      });
    }

    // Check if like already exists
    const existingLike = await client.like.findFirst({
      where: {
        userId: userId,
        articleId: articleId,
      },
    });

    let isLiked: boolean;
    let likeCount: number;

    if (existingLike) {
      // Unlike
      await client.like.delete({
        where: { id: existingLike.id },
      });
      isLiked = false;
    } else {
      // Like
      await client.like.create({
        data: {
          userId,
          articleId,
        },
      });
      isLiked = true;
    }

    // Get updated like count
    likeCount = await client.like.count({
      where: { articleId },
    });

    res.status(200).json({
      success: true,
      isLiked,
      likeCount,
    });
  } catch (error: any) {
    console.error("Error toggling like:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getLikeStatus = async (req: AuthorizedRequest, res: Response) => {
  try {
    const { articleId } = req.params;
    const userId = req.user?.id;

    const likeCount = await client.like.count({
      where: { articleId },
    });

    let isLiked = false;
    if (userId) {
      const userLike = await client.like.findFirst({
        where: {
          userId: userId,
          articleId: articleId,
        },
      });
      isLiked = !!userLike;
    }

    res.status(200).json({
      success: true,
      isLiked,
      likeCount,
    });
  } catch (error: any) {
    console.error("Error getting like status:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const searchArticles = async (req: AuthorizedRequest, res: Response) => {
  try {
    const filter = req.query.filter as any;

    const articles = await client.article.findMany({
      where: {
        title: {
          contains: filter,
          mode: "insensitive",
        },
        published: true,
      },
    });
    res.status(200).json({
      success: true,
      articles,
    });
  } catch (error: any) {
    console.log(error.meesage);
    return res.status(500).json({ message: "Internal server error" });
  }
};

async function fetchNestedReplies(
  commentId: string,
  skip: number = 0,
  limit: number = 10,
  depth: number = 0
): Promise<any[]> {
  // Optional: Add max depth limit to prevent infinite recursion
  const MAX_DEPTH = 50; // Adjust as needed
  if (depth > MAX_DEPTH) {
    return [];
  }

  const replies = await client.comment.findMany({
    where: {
      parentCommentId: commentId,
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
        },
      },
      _count: {
        select: { replies: true },
      },
    },
    orderBy: { createdAt: "asc" },
    skip: depth === 0 ? skip : 0, // Only apply pagination to first level
    take: depth === 0 ? limit : undefined, // Only limit first level
  });

  // Recursively fetch nested replies for each reply
  const repliesWithNested = await Promise.all(
    replies.map(async (reply) => {
      const nestedReplies =
        reply._count.replies > 0
          ? await fetchNestedReplies(reply.id, 0, undefined, depth + 1)
          : [];

      return {
        ...reply,
        replyCount: reply._count.replies,
        replies: nestedReplies,
        depth: depth + 1, // Add depth information
      };
    })
  );

  return repliesWithNested;
}
async function findRootComment(commentId: string): Promise<any> {
  let currentComment = await client.comment.findUnique({
    where: { id: commentId },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
        },
      },
      _count: {
        select: { replies: true },
      },
    },
  });

  if (!currentComment) return null;

  // Traverse up to find root comment
  while (currentComment && currentComment.parentCommentId) {
    const parentComment: any = await client.comment.findUnique({
      where: { id: currentComment.parentCommentId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        _count: {
          select: { replies: true },
        },
      },
    });

    if (!parentComment) break;
    currentComment = parentComment;
  }

  return currentComment;
}
