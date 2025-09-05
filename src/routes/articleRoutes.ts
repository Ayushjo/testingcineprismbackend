import { Router } from "express";
import { createArticle, getArticles, getSingleArticle } from "../controllers/articleController";
import { extractUserDetails } from "../middlewares/extractUser";
import uploadFile from "../middlewares/multer";

const router = Router();

router.route("/create-article").post(extractUserDetails,uploadFile.any(),createArticle)
router.route("/get-articles").get(getArticles)
router.route("/get-article/:slug").get(getSingleArticle)

export default router