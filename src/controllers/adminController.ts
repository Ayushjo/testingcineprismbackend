import { Request, Response } from "express";
import { AuthorizedRequest } from "../middlewares/extractUser";
import getBuffer from "../config/dataUri";
import client from "..";
import cloudinary from "cloudinary";

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
        origin,
        duration,
        genres,
        year,
        ratingCategory,
        relatedPostIds,
      } = req.body;

      const post = await client.post.create({
        data: {
          title,
          content,
          origin,
          duration,
          genres,
          year,
          ratingCategory,
          relatedPostIds,
        },
      });

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
    const posts = await client.post.findMany({
      include: {
        images: true,
      },
    });

    res.status(200).json({ posts, message: "Posts fetched successfully" });
  } catch (error: any) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
};

export const addTopPicks = async (req: AuthorizedRequest, res: Response) => {
  try {
    const user = req.user;
    if (user.role !== "ADMIN") {
      return res.status(401).json({ message: "You are not an admin" });
    }
    const { postId, genre } = req.body;
    if (!postId || !genre) {
      return res.status(400).json({ message: "Bad request" });
    } else {
      const existingTopPick = await client.topPicks.findFirst({
        where: {
          postId,
        },
      });
      if (existingTopPick) {
        res.status(400).json({ message: "Movie is already ind top picks" });
      }
      const topPick = await client.topPicks.create({
        data: {
          postId,
          genre,
        },
      });
      res.status(201).json({ topPick, message: "Top pick added successfully" });
    }
  } catch (error: any) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
};

export const fetchTopPicks = async (req: AuthorizedRequest, res: Response) => {
  try {
    const user = req.user;
    if (user.role !== "ADMIN") {
      return res.status(401).json({ message: "You are not an admin" });
    }
    const { genre } = req.body;
    if (genre === "All") {
      const topPicks = await client.topPicks.findMany({
        include: {
          post: true,
        },
      });
      res
        .status(200)
        .json({ topPicks, message: "Top picks fetched successfully" });
    } else {
      const topPicks = await client.topPicks.findMany({
        where: {
          genre,
        },
        include: {
          post: true,
        },
      });
      if (topPicks.length === 0) {
        return res
          .status(400)
          .json({ message: "No top picks found in this genre" });
      }
      res
        .status(200)
        .json({ topPicks, message: "Top picks fetched successfully" });
    }
  } catch (error: any) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
};
