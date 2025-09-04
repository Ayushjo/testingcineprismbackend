import { Router } from "express";
import { postHtml } from "../controllers/postHtmlController";

const router = Router()


router.route("/post/:id").get(postHtml)

export default router