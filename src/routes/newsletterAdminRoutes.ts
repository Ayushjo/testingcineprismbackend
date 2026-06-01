import { Router } from "express";
import { extractUserDetails } from "../middlewares/extractUser.js";
import { adminLimiter } from "../middlewares/rateLimiter.js";
import {
  createCampaign,
  sendCampaign,
  listCampaigns,
  getCampaign,
  listSubscribers,
  getStats,
} from "../controllers/newsletterAdminController.js";

const router = Router();

// TIER 4 — 100 req / 15 min per IP. Must be first so it covers every route below.
router.use(adminLimiter);
// All routes require authentication; admin check is inside each controller.
router.use(extractUserDetails);

router.post("/campaigns", createCampaign);
router.post("/campaigns/:id/send", sendCampaign);
router.get("/campaigns", listCampaigns);
router.get("/campaigns/:id", getCampaign);
router.get("/subscribers", listSubscribers);
router.get("/stats", getStats);

export default router;
