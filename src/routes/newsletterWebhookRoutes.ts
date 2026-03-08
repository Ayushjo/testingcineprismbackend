import { Router } from "express";
import {
  handleRazorpayWebhook,
  handleSNSNotification,
} from "../controllers/newsletterWebhookController.js";

const router = Router();

// CRITICAL: These routes use raw body parser, NOT express.json()
// Razorpay signature verification requires the raw buffer
// This is why webhook routes are in a separate file from regular routes

router.post(
  "/razorpay",
  (req, res, next) => {
    // Raw body parser for this route only
    let data = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      (req as any).body = Buffer.from(data);
      next();
    });
  },
  handleRazorpayWebhook,
);

router.post(
  "/sns",
  (req, res, next) => {
    let data = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      (req as any).body = Buffer.from(data);
      next();
    });
  },
  handleSNSNotification,
);

export default router;
