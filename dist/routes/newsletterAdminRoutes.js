"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const extractUser_js_1 = require("../middlewares/extractUser.js");
const newsletterAdminController_js_1 = require("../controllers/newsletterAdminController.js");
const router = (0, express_1.Router)();
// All routes require authentication; admin check is inside each controller.
router.use(extractUser_js_1.extractUserDetails);
router.post("/campaigns", newsletterAdminController_js_1.createCampaign);
router.post("/campaigns/:id/send", newsletterAdminController_js_1.sendCampaign);
router.get("/campaigns", newsletterAdminController_js_1.listCampaigns);
router.get("/campaigns/:id", newsletterAdminController_js_1.getCampaign);
router.get("/subscribers", newsletterAdminController_js_1.listSubscribers);
router.get("/stats", newsletterAdminController_js_1.getStats);
exports.default = router;
