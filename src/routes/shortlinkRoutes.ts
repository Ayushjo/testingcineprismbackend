import { Router } from "express";
import { resolveShortlink } from "../controllers/shortlinkController";

const router = Router();

// Public short-link resolver. Mounted at /api/v1/s in index.ts.
router.route("/:code").get(resolveShortlink);

export default router;
