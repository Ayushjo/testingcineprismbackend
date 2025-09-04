"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const extractUser_1 = require("../middlewares/extractUser");
const optionalAuth_1 = require("../middlewares/optionalAuth");
const rateLimiter_1 = require("../middlewares/rateLimiter");
const userController_1 = require("../controllers/userController");
const postUtils_1 = require("../utils/postUtils");
const router = (0, express_1.Router)();
// Post routes
router.route("/:id").get(optionalAuth_1.optionalAuth, userController_1.fetchSinglePost);
router.route("/:id/related").get(userController_1.fetchRelatedPosts);
router.route("/:id/stats").get(optionalAuth_1.optionalAuth, postUtils_1.getPostStats);
// Comment routes
router.route("/:postId/comments").get(userController_1.fetchComments);
router
    .route("/:postId/comments")
    .post(extractUser_1.extractUserDetails, rateLimiter_1.rateLimiter.createComment, userController_1.createComment);
// Reply routes - now supports unlimited nesting
router.route("/comments/:commentId/replies").get(userController_1.fetchReplies);
router
    .route("/comments/:commentId/replies")
    .post(extractUser_1.extractUserDetails, rateLimiter_1.rateLimiter.createReply, userController_1.createReply);
// Comment management routes
router.route("/comments/:commentId").put(extractUser_1.extractUserDetails, userController_1.updateComment);
router.route("/comments/:commentId").delete(extractUser_1.extractUserDetails, userController_1.deleteComment);
// New route for fetching complete comment threads (optional)
router.route("/comments/:commentId/thread").get(userController_1.fetchCommentThread);
// Like routes
router
    .route("/:postId/like")
    .post(extractUser_1.extractUserDetails, rateLimiter_1.rateLimiter.toggleLike, userController_1.toggleLike);
router.route("/:postId/like").get(optionalAuth_1.optionalAuth, userController_1.getLikeStatus);
exports.default = router;
