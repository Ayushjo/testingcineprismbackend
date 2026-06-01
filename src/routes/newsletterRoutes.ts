import { Router } from "express";
import {
  getPlans,
  createCheckout,
  unsubscribe,
  getSubscriberStatus,
  getSubscriptionStatusById,
} from "../controllers/newsletterController.js";
import { checkoutLimiter, plansLimiter } from "../middlewares/rateLimiter.js";

const router = Router();

// TIER 5 — 60 req / 1 min per IP (cached endpoint, protects against scraping)
router.get("/plans", plansLimiter, getPlans);
// TIER 3 — 5 req / hour per IP (each call creates a Razorpay customer + subscription)
router.post("/checkout", checkoutLimiter, createCheckout);
router.get("/unsubscribe", unsubscribe);
router.get("/status/:email", getSubscriberStatus);
router.get(
  "/subscription-status/:razorpaySubscriptionId",
  getSubscriptionStatusById,
);

export default router;
