import { Router } from "express";
import passport from "../config/passport";
import {
  fetchUser,
  googleAuthSuccess,
  googleAuthFailure,
  logoutUser,
  // ... other imports
} from "../controllers/authController";
import { extractUserDetails } from "../middlewares/extractUser";
import { authLimiter } from "../middlewares/rateLimiter";

const router = Router();

// TIER 2 — 20 req / 15 min per IP on all auth routes
router.use(authLimiter);

// Google OAuth routes
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  }),
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/auth/google/failure",
    session: false,
  }),
  googleAuthSuccess,
);

router.get("/google/failure", googleAuthFailure);

export default router;
