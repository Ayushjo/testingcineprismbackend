import Router from "express";
import { extractUserDetails } from "../middlewares/extractUser";
import { optionalAuth } from "../middlewares/optionalAuth";
import { rateLimiter } from "../middlewares/rateLimiter";
import { createComment, createReply, deleteComment, fetchComments, fetchRelatedPosts, fetchReplies, fetchSinglePost, getLikeStatus, toggleLike, updateComment } from "../controllers/userController";
import { getPostStats } from "../utils/postUtils";


const router = Router();

router.route("/:id").get(optionalAuth,fetchSinglePost)
router.route("/:id/related").get(fetchRelatedPosts)
router.route("/:id/stats").get(optionalAuth,getPostStats)

router.route("/:postId/comments").get(fetchComments)
router.route("/comments/:commentId/replies").get(fetchReplies)

router.route("/:postId/comments").post(extractUserDetails,rateLimiter.createComment,createComment)
router.route("/comments/:commentId/replies").post(extractUserDetails,rateLimiter.createReply,createReply)
router.route("/comments/:commentId").put(extractUserDetails,updateComment)
router.route("/comments/:commentId").delete(extractUserDetails,deleteComment)

router.route("/:postId/like").post(extractUserDetails,rateLimiter.toggleLike,toggleLike)
router.route("/:postId/like").get(optionalAuth,getLikeStatus)

export default router
