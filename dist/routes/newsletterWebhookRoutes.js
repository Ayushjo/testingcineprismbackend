"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const newsletterWebhookController_js_1 = require("../controllers/newsletterWebhookController.js");
const router = (0, express_1.Router)();
// CRITICAL: These routes use raw body parser, NOT express.json()
// Razorpay signature verification requires the raw buffer
// This is why webhook routes are in a separate file from regular routes
router.post("/razorpay", (req, res, next) => {
    // Raw body parser for this route only
    let data = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
        data += chunk;
    });
    req.on("end", () => {
        req.body = Buffer.from(data);
        next();
    });
}, newsletterWebhookController_js_1.handleRazorpayWebhook);
router.post("/sns", (req, res, next) => {
    let data = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
        data += chunk;
    });
    req.on("end", () => {
        req.body = Buffer.from(data);
        next();
    });
}, newsletterWebhookController_js_1.handleSNSNotification);
exports.default = router;
