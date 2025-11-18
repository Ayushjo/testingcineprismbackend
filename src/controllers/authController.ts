import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import client from "..";

// Helper function to generate JWT (no cookies)
const generateToken = (user: any) => {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.ACCESS_TOKEN_SECRET as string,
    { expiresIn: "7d" }
  );
};

// Google OAuth Success Handler
export const googleAuthSuccess = async (req: Request, res: Response) => {
  try {
    const user = req.user as any;

    if (!user) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/login?error=auth_failed`
      );
    }

    const token = generateToken(user);

    // Redirect with token in URL (will be handled by frontend)
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
  } catch (error) {
    console.error("Google auth success error:", error);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=server_error`);
  }
};

// Google OAuth Failure Handler
export const googleAuthFailure = (req: Request, res: Response) => {
  res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
};

// Fetch user (token only from Authorization header)
export const fetchUser = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];

    const decodedToken = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET as any
    ) as any;

    const user = await client.user.findFirst({
      where: { id: decodedToken.id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        profilePicture: true,
        isEmailVerified: true,
        createdAt: true,
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

// Logout (just a client-side action, but endpoint for consistency)
export const logoutUser = async (req: Request, res: Response) => {
  res.status(200).json({ message: "Logged out successfully" });
};
