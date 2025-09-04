import { Router } from "express";
import { postHtml } from "../controllers/postHtmlController.js";

const router = Router();

router.route("/post/:id").get(postHtml);

export default router;
