import { Request, Response } from "express";
import client from "..";
import { AuthorizedRequest } from "../middlewares/extractUser";
import getBuffer from "../config/dataUri";
import cloudinary from "cloudinary";
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
    } else {
      const { title, shortDescription, author, published, blocks } = req.body;
      const slug = generateSlug(title);
      const parsedBlocks = await JSON.parse(blocks);

      const files = req.files as Express.Multer.File[];

      let mainImageUrl = "";
      const mainImageFile = files.find(
        (file) => file.fieldname === "mainImage"
      );
      if (mainImageFile) {
        const fileBuffer = getBuffer(mainImageFile);
        if (!fileBuffer || !fileBuffer.content) {
          return res
            .status(500)
            .json({
              message:
                "Was not able to convert the file from buffer to base64.",
            });
        }
        const cloud = await cloudinary.v2.uploader.upload(fileBuffer.content, {
          folder: "articles",
        });
        if (!cloud) {
          return res
            .status(500)
            .json({
              message: "An error occurred while uploading to cloudinary",
            });
        }
        mainImageUrl = cloud.url;
      }
      const processedBlocks: any = await Promise.all(
        parsedBlocks.map(async (block: any, index: number) => {
          if (block.type === "IMAGE") {
            const blockImageFile = files.find(
              (file) => file.fieldname === `blockImage_${index}`
            );
            if (!blockImageFile) {
              return block;
            }
            const fileBuffer = getBuffer(blockImageFile);
            if (!fileBuffer || !fileBuffer.content) {
              return res
                .status(500)
                .json({
                  message:
                    "Was not able to convert the file from buffer to base64.",
                });
            }
            const cloud = await cloudinary.v2.uploader.upload(
              fileBuffer.content,
              { folder: "articles" }
            );
            if (!cloud) {
              return res
                .status(500)
                .json({
                  message: "An error occurred while uploading to cloudinary",
                });
            }

            return {
              ...block,
              content: {
                ...block.content,
                url: cloud.url,
                publicId: cloud.public_id,
              },
            };
          }
          return block;
        })
      );
      const article = await client.article.create({
        data: {
          title,
          slug,
          shortDescription,
          author,
          published,
          mainImageUrl,
          blocks: {
            create: processedBlocks.map((block: any, index: any) => ({
              type: block.type,
              content: JSON.stringify(block.content),
              order: index,
            })),
          },
        },
        include: {
          blocks: {
            orderBy: {
              order: "asc",
            },
          },
        },
      });
      res.status(200).json({ article });
    }
  } catch (error: any) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
};

export const getArticles = async (req: Request, res: Response) => {
  try {
    const articles = await client.article.findMany();
    res.status(200).json({ articles });
  } catch (error: any) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
};

export const getSingleArticle = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const article = await client.article.findFirst({
      where: { slug },
      include:{
        blocks: {
          orderBy: {
            order: "asc",
          },
        },
      }
    });
    res.status(200).json({ article });
  } catch (error: any) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
};
