import { Request, Response } from "express";

const REFRESH_SECRET = process.env.REFRESH_SECRET;
export const validateRefreshToken = (
  req: Request,
  res: Response,
  next: Function
) => {
  const token = req.headers["x-refresh-token"];

  if (token !== REFRESH_SECRET) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  next();
};
