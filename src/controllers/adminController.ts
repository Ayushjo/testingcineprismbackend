import { Request, Response } from "express";
import { AuthorizedRequest } from "../middlewares/extractUser";
import getBuffer from "../config/dataUri";
import client from "..";
import cloudinary from "cloudinary";
import { Multer } from "multer";
import { getFromCache, setCache, deleteCache } from "../config/redis";

export const uploadPoster = async (req: AuthorizedRequest, res: Response) => {
  try {
    const user = req.user;
    if (user.role === "ADMIN") {
      const file = req.file;
      const { postId } = req.body;
      const existingPoster = await client.post.findFirst({
        where: {
          id: postId,
        },
      });
      if (existingPoster?.posterImageUrl) {
        const existingPosterImage = await client.postImage.findFirst({
          where: {
            imageUrl: existingPoster?.posterImageUrl,
          },
        });
        await client.postImage.delete({
          where: {
            id: existingPosterImage?.id,
          },
        });
        existingPoster.posterImageUrl = "";
        if (!file) {
          return res.status(400).json({ message: "No file uploaded" });
        }
        const fileBuffer = getBuffer(file);
        if (!fileBuffer || !fileBuffer.content) {
          res.status(500).json({
            message: "Was not able to convert the file from buffer to base64.",
          });
        } else {
          const cloud = await cloudinary.v2.uploader.upload(
            fileBuffer.content,
            {
              folder: "posters",
            }
          );
          if (!cloud) {
            res
              .status(500)
              .json({ message: "An error occurred while uploading" });
          }
          const poster = await client.postImage.create({
            data: {
              imageUrl: cloud.url,
              postId,
            },
          });
          if (poster) {
            await client.post.update({
              where: {
                id: postId,
              },
              data: {
                posterImageUrl: poster.imageUrl,
              },
            });
            await deleteCache("all_posts");
            res
              .status(201)
              .json({ poster, message: "Poster uploaded successfully" });
          } else {
            res.status(500).json({ message: "An error occurred" });
          }
        }
      } else {
        if (!file) {
          return res.status(400).json({ message: "No file uploaded" });
        }
        const fileBuffer = getBuffer(file);
        if (!fileBuffer || !fileBuffer.content) {
          res.status(500).json({
            message: "Was not able to convert the file from buffer to base64.",
          });
        } else {
          const cloud = await cloudinary.v2.uploader.upload(
            fileBuffer.content,
            {
              folder: "posters",
            }
          );
          if (!cloud) {
            res
              .status(500)
              .json({ message: "An error occurred while uploading" });
          }
          const poster = await client.postImage.create({
            data: {
              imageUrl: cloud.url,
              postId,
            },
          });
          if (poster) {
            await client.post.update({
              where: {
                id: postId,
              },
              data: {
                posterImageUrl: poster.imageUrl,
              },
            });
            res
              .status(201)
              .json({ poster, message: "Poster uploaded successfully" });
          } else {
            res.status(500).json({ message: "An error occurred" });
          }
        }
      }
    } else {
      res.status(401).json({ message: "You are not an admin" });
    }
  } catch (error: any) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
};
export const uploadReviewPoster = async (
  req: AuthorizedRequest,
  res: Response
) => {
  try {
    const user = req.user;
    if (user.role === "ADMIN") {
      const file = req.file;
      const { postId } = req.body;
      const existingPoster = await client.post.findFirst({
        where: {
          id: postId,
        },
      });
      if (existingPoster?.reviewPosterImageUrl) {
        const existingReviewPosterImage = await client.postImage.findFirst({
          where: {
            imageUrl: existingPoster?.reviewPosterImageUrl,
          },
        });
        await client.postImage.delete({
          where: {
            id: existingReviewPosterImage?.id,
          },
        });
        existingPoster.posterImageUrl = "";
        if (!file) {
          return res.status(400).json({ message: "No file uploaded" });
        }
        const fileBuffer = getBuffer(file);
        if (!fileBuffer || !fileBuffer.content) {
          res.status(500).json({
            message: "Was not able to convert the file from buffer to base64.",
          });
        } else {
          const cloud = await cloudinary.v2.uploader.upload(
            fileBuffer.content,
            {
              folder: "posters",
            }
          );
          if (!cloud) {
            res
              .status(500)
              .json({ message: "An error occurred while uploading" });
          }
          const poster = await client.postImage.create({
            data: {
              imageUrl: cloud.url,
              postId,
            },
          });
          if (poster) {
            await client.post.update({
              where: {
                id: postId,
              },
              data: {
                reviewPosterImageUrl: poster.imageUrl,
              },
            });
            res
              .status(201)
              .json({ poster, message: "Poster uploaded successfully" });
          } else {
            res.status(500).json({ message: "An error occurred" });
          }
        }
      } else {
        if (!file) {
          return res.status(400).json({ message: "No file uploaded" });
        }
        const fileBuffer = getBuffer(file);
        if (!fileBuffer || !fileBuffer.content) {
          res.status(500).json({
            message: "Was not able to convert the file from buffer to base64.",
          });
        } else {
          const cloud = await cloudinary.v2.uploader.upload(
            fileBuffer.content,
            {
              folder: "posters",
            }
          );
          if (!cloud) {
            res
              .status(500)
              .json({ message: "An error occurred while uploading" });
          }
          const poster = await client.postImage.create({
            data: {
              imageUrl: cloud.url,
              postId,
            },
          });
          if (poster) {
            await client.post.update({
              where: {
                id: postId,
              },
              data: {
                reviewPosterImageUrl: poster.imageUrl,
              },
            });
            await deleteCache("all_posts");
            res
              .status(201)
              .json({ poster, message: "Poster uploaded successfully" });
          } else {
            res.status(500).json({ message: "An error occurred" });
          }
        }
      }
    } else {
      res.status(401).json({ message: "You are not an admin" });
    }
  } catch (error: any) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
};

export const createPost = async (req: AuthorizedRequest, res: Response) => {
  try {
    const user = req.user;
    if (user.role === "ADMIN") {
      const {
        title,
        content,
        genres,
        year,
        directedBy,
        streamingAt,
        relatedPostIds,
        ratingCategories,
        language
      } = req.body;

      const post = await client.post.create({
        data: {
          title,
          content,
          genres,
          year,
          directedBy,
          streamingAt,
          relatedPostIds,
          ratingCategories,
          language
        },
      });

      // Clear cache so next fetch gets fresh data
      await deleteCache("all_posts");
      console.log("🗑️ Cleared posts cache");

      res.status(201).json({ post, message: "Post created successfully" });
    } else {
      res.status(401).json({ message: "You are not an admin" });
    }
  } catch (error: any) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
};

export const uploadImages = async (req: AuthorizedRequest, res: Response) => {
  try {
    const user = req.user;
    if (user.role === "ADMIN") {
      const files = req.files as Express.Multer.File[];
      const { postId } = req.body;

      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }
      const uploadedImages = [];
      for (const file of files) {
        const fileBuffer = getBuffer(file);

        if (!fileBuffer || !fileBuffer.content) {
          return res.status(500).json({
            message: "Was not able to convert the file from buffer to base64.",
          });
        }
        const cloud = await cloudinary.v2.uploader.upload(fileBuffer.content, {
          folder: "images",
        });
        if (!cloud) {
          return res.status(500).json({
            message: "An error occurred while uploading to cloudinary",
          });
        }
        const image = await client.postImage.create({
          data: {
            imageUrl: cloud.url,
            postId,
          },
        });

        if (!image) {
          return res.status(500).json({
            message: "An error occurred while saving to database",
          });
        }

        uploadedImages.push(image);
      }
      await deleteCache("all_posts");
      res.status(201).json({
        images: uploadedImages,
        message: `${uploadedImages.length} images uploaded successfully`,
      });
    } else {
      res.status(401).json({ message: "You are not an admin" });
    }
  } catch (error: any) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
};

export const fetchAllPost = async (req: AuthorizedRequest, res: Response) => {
  try {
    const cacheKey = "all_posts";

    // Try cache first
    const cachedPosts = await getFromCache(cacheKey);

    if (cachedPosts) {
      console.log("📦 Cache HIT - returning cached posts");
      return res.status(200).json({
        posts: JSON.parse(cachedPosts),
        message: "Posts fetched successfully (from cache)",
      });
    }

    console.log("🔍 Cache MISS - fetching from database");

    // Get from database
    const posts = await client.post.findMany({
      include: {
        images: true,
      },
    });

    // Filter out poster images
    const filteredPosts = posts.map((post) => ({
      ...post,
      images: post.images.filter(
        (image) =>
          image.imageUrl !== post.reviewPosterImageUrl &&
          image.imageUrl !== post.posterImageUrl
      ),
    }));

    // Cache for 5 minutes
    await setCache(cacheKey, JSON.stringify(filteredPosts), 300);
    console.log("💾 Data cached for 5 minutes");

    res.status(200).json({
      posts: filteredPosts,
      message: "Posts fetched successfully",
    });
  } catch (error: any) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
};

export const addTopPicks = async (req: AuthorizedRequest, res: Response) => {
  try {
    const { year, title, genre } = req.body;
    const file = req.file;
    const yearInt = parseInt(year);

    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const fileBuffer = getBuffer(file);
    if (!fileBuffer || !fileBuffer.content) {
      return res.status(500).json({
        message: "Was not able to convert the file from buffer to base64.",
      });
    }
    const cloud = await cloudinary.v2.uploader.upload(fileBuffer.content, {
      folder: "posters",
    });
    if (!cloud) {
      return res.status(500).json({
        message: "An error occurred while uploading to cloudinary",
      });
    }
    const topPick = await client.topPicks.create({
      data: {
        title,
        genre,
        year: yearInt,
        posterImageUrl: cloud.url,
      },
    });
    await deleteCache("top_picks");
    console.log("🗑️ Cleared top picks cache");
    res.status(200).json({ topPick, message: "Top pick added successfully" });
  } catch (error: any) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
};

export const fetchTopPicks = async (req: AuthorizedRequest, res: Response) => {
  try {
    const cacheKey = "top_picks";

    const cachedTopPicks = await getFromCache(cacheKey);

    if (cachedTopPicks) {
      console.log("📦 Cache HIT - returning cached top picks");
      return res.status(200).json({
        topPicks: JSON.parse(cachedTopPicks),
        message: "Top picks fetched successfully (from cache)",
      });
    }

    console.log("🔍 Cache MISS - fetching from database");

    const topPicks = await client.topPicks.findMany({});

    // Cache for 10 minutes
    await setCache(cacheKey, JSON.stringify(topPicks), 600);
    console.log("💾 Top picks cached for 10 minutes");

    res.status(200).json({
      topPicks,
      message: "Top picks fetched successfully",
    });
  } catch (error: any) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
};

export const editPost = async (req: AuthorizedRequest, res: Response) => {
  try {
    const user = req.user;
    if (user.role === "USER") {
      res.status(400).json("You are not authorized");
    } else {
      const {
        postId,
        title,
        content,
        genres,
        year,
        directedBy,
        streamingAt,
        relatedPostIds,
        ratingCategories,
        language
      } = req.body;

      const post = await client.post.findFirst({
        where: {
          id: postId,
        },
      });
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      } else {
        await client.post.update({
          where: {
            id: postId,
          },
          data: {
            title,
            content,
            genres,
            year,
            directedBy,
            streamingAt,
            relatedPostIds,
            ratingCategories,
            language
          },
        });
        await deleteCache("all_posts");
        return res.status(200).json({ message: "Post updated successfully" });
      }
    }
  } catch (error: any) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
};

export const deletePost = async (req: AuthorizedRequest, res: Response) => {
  try {
    const user = req.user;
    if (user.role === "ADMIN") {
      const { postId } = req.body;
      const post = await client.post.findFirst({
        where: {
          id: postId,
        },
      });
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      } else {
        await client.post.delete({
          where: {
            id: postId,
          },
        });
        await deleteCache("all_posts");
        return res.status(200).json({ message: "Post deleted successfully" });
      }
    }
  } catch (error: any) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
};
export const deleteImage = async (req: AuthorizedRequest, res: Response) => {
  try {
    const user = req.user;
    if (user.role === "ADMIN") {
      const { imageId } = req.body;
      const image = await client.postImage.findFirst({
        where: {
          id: imageId,
        },
      });
      if (!image) {
        return res.status(404).json({ message: "Image not found" });
      } else {
        await client.postImage.delete({
          where: {
            id: imageId,
          },
        });
        await deleteCache("all_posts");
        return res.status(200).json({ message: "Image deleted successfully" });
      }
    }
  } catch (error: any) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
};

export const hasLiked = async (req: AuthorizedRequest, res: Response) => {
  try {
    const user = req.user;
    const { postId } = req.body;
    const hasLiked = await client.like.findFirst({
      where: {
        userId: user.id,
        postId: postId,
      },
    });
    if (hasLiked) {
      return res.status(200).json({ hasLiked: true });
    } else {
      return res.status(200).json({ hasLiked: false });
    }
  } catch (error: any) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
};

export const latestReviews = async (req: AuthorizedRequest, res: Response) => {
  try {
    const cacheKey = "latest_reviews";

    const cachedTopPicks = await getFromCache(cacheKey);

    if (cachedTopPicks) {
      console.log("📦 Cache HIT - returning cached top picks");
      return res.status(200).json({
        latestReviews: JSON.parse(cachedTopPicks),
        message: "Latest reviews fetched successfully (from cache)",
      });
    }

    console.log("🔍 Cache MISS - fetching from database");
    const latestReviews = await client.post.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 7,
    });

    if(latestReviews && latestReviews.length > 0) {
      await setCache(cacheKey, JSON.stringify(latestReviews), 600);
    }
    res.status(200).json({
     latestReviews,
      message: "Latest reviews fetched successfully",
    });
  } catch (error: any) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
};
