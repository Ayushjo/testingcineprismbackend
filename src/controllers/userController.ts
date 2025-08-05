import { Request, Response } from "express";
import client from "..";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { AuthorizedRequest } from "../middlewares/extractUser";
import { cli } from "winston/lib/winston/config";
dotenv.config();
export const registerUser = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;
    const existingUser = await client.user.findFirst({
      where: {
        email,
      },
    });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await client.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
      },
    });
    res.status(200).json({ user, message: "User registered successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred" });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await client.user.findFirst({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (isPasswordValid) {
      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.ACCESS_TOKEN_SECRET as any,
        { expiresIn: "7d" }
      );
      res.cookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
      });
      res.status(200).json({ message: "Login successful", token });
    } else {
      res.status(401).json({ message: "Invalid credentials" });
    }
  } catch (error: any) {
    console.log("Login error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

export const fetchUser = async (req: Request, res: Response) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const decodedToken = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET as any
    ) as any;
    const user = await client.user.findFirst({
      where: {
        id: decodedToken.id,
      },
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ user, message: "User fetched successfully" });
  } catch (error: any) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
};

export const postOpinion = async (req: AuthorizedRequest, res: Response) => {
  try {
    const { content, genres } = req.body;
    if (!genres) {
      return res
        .status(400)
        .json({ message: "Please select at least one genre" });
    }
    const user = req.user;
    const opinion = await client.unpopularOpinion.create({
      data: {
        content,
        userId: user.id,
        genres,
      },
    });
    res.status(201).json({ opinion, message: "Opinion posted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred" });
  }
};

export const fetchAllOpinions = async (req: Request, res: Response) => {
  try {
    const opinions = await client.unpopularOpinion.findMany({
      include: {
        user: {
          select: {
            username: true,
            email: true,
          },
        },
        likes: true,
        comments: true,
      },
    });
    res
      .status(200)
      .json({ opinions, message: "Opinions fetched successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred" });
  }
};

export const toggleLike = async (req: AuthorizedRequest, res: Response) => {
  try {
    const opinionId  = req.body?.opinionId;
    const postId = req.body?.postId;
    console.log(opinionId, postId);
    
    if (!opinionId && !postId) {
      return res.status(400).json({ message: "Bad request" });
    } else if (opinionId) {
      const user = req.user;
      const userId = user.id;
      const existingLike = await client.like.findFirst({
        where: {
          opinionId,
          userId,
        },
      });
      if (existingLike) {
        await client.like.delete({
          where: {
            id: existingLike.id,
          },
        });
        return res.status(200).json({ message: "Like deleted successfully" });
      } else {
        await client.like.create({
          data: {
            opinionId,
            userId,
          },
        });
        res.status(200).json({ message: "Like created successfully" });
      }
    } else {
      const user = req.user;
      const userId = user.id;
      const existingLike = await client.like.findFirst({
        where: {
          postId,
          userId,
        },
      });
      if (existingLike) {
        await client.like.delete({
          where: {
            id: existingLike.id,
          },
        });
        return res.status(200).json({ message: "Like deleted successfully" });
      } else {
        await client.like.create({
          data: {
            postId,
            userId,
          },
        });
        res.status(200).json({ message: "Like created successfully" });
      }
    }
  } catch (error: any) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
};
