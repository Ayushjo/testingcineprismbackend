"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const newsletterController_js_1 = require("../controllers/newsletterController.js");
const rateLimiter_js_1 = require("../middlewares/rateLimiter.js");
const router = (0, express_1.Router)();
// TIER 5 — 60 req / 1 min per IP (cached endpoint, protects against scraping)
router.get("/plans", rateLimiter_js_1.plansLimiter, newsletterController_js_1.getPlans);
// TIER 3 — 5 req / hour per IP (each call creates a Razorpay customer + subscription)
router.post("/checkout", rateLimiter_js_1.checkoutLimiter, newsletterController_js_1.createCheckout);
router.get("/unsubscribe", newsletterController_js_1.unsubscribe);
router.get("/status/:email", newsletterController_js_1.getSubscriberStatus);
router.get("/subscription-status/:razorpaySubscriptionId", newsletterController_js_1.getSubscriptionStatusById);
exports.default = router;
