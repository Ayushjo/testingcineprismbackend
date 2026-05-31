import { Router } from "express";
import {
  getPlans,
  createCheckout,
  unsubscribe,
  getSubscriberStatus,
  getSubscriptionStatusById,
} from "../controllers/newsletterController.js";

const router = Router();

router.get("/plans", getPlans);
router.post("/checkout", createCheckout);
router.get("/unsubscribe", unsubscribe);
router.get("/status/:email", getSubscriberStatus);
router.get("/subscription-status/:razorpaySubscriptionId", getSubscriptionStatusById);

export default router;
