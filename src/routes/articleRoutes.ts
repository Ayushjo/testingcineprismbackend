import { Router } from "express";
import {
  createArticle,
  createComment,
  createReply,
  deleteComment,
  fetchComments,
  fetchCommentThread,
  fetchReplies,
  getArticles,
  getLikeStatus,
  getSingleArticle,
  searchArticles,
  toggleLike,
  updateComment,
} from "../controllers/articleController";
import { extractUserDetails } from "../middlewares/extractUser";
import uploadFile from "../middlewares/multer";
import { rateLimiter } from "../middlewares/rateLimiter";
import { optionalAuth } from "../middlewares/optionalAuth";
import { articleHtml } from "../controllers/articleHtmlController";


const router = Router();
router.route("/search").get(extractUserDetails,searchArticles)
router
  .route("/create-article")
  .post(extractUserDetails, uploadFile.any(), createArticle);
router.route("/get-articles").get(getArticles);
router.route("/get-article/:slug").get(getSingleArticle);
router
  .route("/:articleId/comments")
  .post(extractUserDetails, rateLimiter.createComment, createComment);
router
  .route("/comments/:commentId/replies")
  .post(extractUserDetails, rateLimiter.createReply, createReply);
router.route("/comments/:commentId").put(extractUserDetails, updateComment);
router.route("/comments/:commentId").delete(extractUserDetails, deleteComment);
router.route("/:articleId/comments").get(fetchComments);
router.route("/comments/:commentId/replies").get(fetchReplies);
router.route("/comments/:commentId/thread").get(fetchCommentThread);
router
  .route("/:articleId/like")
  .post(extractUserDetails, rateLimiter.toggleLike, toggleLike);
router.route("/:articleId/like").get(optionalAuth, getLikeStatus);
router.route("/share/:slug").get(articleHtml);
export default router;
