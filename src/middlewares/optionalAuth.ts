// middlewares/optionalAuth.ts
import { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";
import client from "..";
import { AuthorizedRequest } from "./extractUser";

export const optionalAuth = async (
  req: AuthorizedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

    if (!token) {
      // No token provided, continue without user
      req.user = null;
      return next();
    }

    const decodedToken = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET as string
    ) as any;

    if (!decodedToken || !decodedToken.id) {
      // Invalid token, continue without user
      req.user = null;
      return next();
    }

    const user = await client.user.findFirst({
      where: { id: decodedToken.id },
      select: {
        id: true,
        username: true,
        email: true,
      },
    });

    req.user = user;
    next();
  } catch (error: any) {
    // Token verification failed, continue without user
    req.user = null;
    next();
  }
};
