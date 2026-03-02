import { Router } from "express";
import {
  getPlans,
  createCheckout,
  unsubscribe,
  getSubscriberStatus,
} from "../controllers/newsletterController.js";

const router = Router();

router.get("/plans", getPlans);
router.post("/checkout", createCheckout);
router.get("/unsubscribe", unsubscribe);
router.get("/status/:email", getSubscriberStatus);

export default router;
