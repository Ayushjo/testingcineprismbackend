import { Router } from "express";
import { extractUserDetails } from "../middlewares/extractUser";
import { optionalAuth } from "../middlewares/optionalAuth";
import { rateLimiter } from "../middlewares/rateLimiter";
import {
  createComment,
  createReply,
  deleteComment,
  fetchComments,
  fetchRelatedPosts,
  fetchReplies,
  fetchSinglePost,
  getLikeStatus,
  toggleLike,
  updateComment,
  fetchCommentThread,
  searchPosts,
  getPostByGenre, // New function
} from "../controllers/userController";
import { getPostStats } from "../utils/postUtils";

const router = Router();

// Post routes
router.route("/search").get(searchPosts);
router.route("/search/:genre").get(extractUserDetails,getPostByGenre);
router.route("/:id").get(optionalAuth, fetchSinglePost);
router.route("/:id/related").get(fetchRelatedPosts);
router.route("/:id/stats").get(optionalAuth, getPostStats);

// Comment routes
router.route("/:postId/comments").get(fetchComments);
router
  .route("/:postId/comments")
  .post(extractUserDetails, rateLimiter.createComment, createComment);

// Reply routes - now supports unlimited nesting
router.route("/comments/:commentId/replies").get(fetchReplies);
router
  .route("/comments/:commentId/replies")
  .post(extractUserDetails, rateLimiter.createReply, createReply);

// Comment management routes
router.route("/comments/:commentId").put(extractUserDetails, updateComment);
router.route("/comments/:commentId").delete(extractUserDetails, deleteComment);

// New route for fetching complete comment threads (optional)
router.route("/comments/:commentId/thread").get(fetchCommentThread);

// Like routes
router
  .route("/:postId/like")
  .post(extractUserDetails, rateLimiter.toggleLike, toggleLike);
router.route("/:postId/like").get(optionalAuth, getLikeStatus);

//Search routes


export default router;
