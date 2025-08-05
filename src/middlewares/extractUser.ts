import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import client from "..";

export interface AuthorizedRequest extends Request {
  user?: any;
}
export const extractUserDetails = async (
  req: AuthorizedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    } else {
      const decodedToken = jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET as any
      ) as any;
      if (!decodedToken || !decodedToken.id) {
        return res
          .status(401)
          .json({ message: "Token expired.Please login again" });
      } else {
        const user = await client.user.findFirst({
          where: {
            id: decodedToken.id,
          },
        });
        req.user = user;
        next();
      }
    }
  } catch (error: any) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
};
