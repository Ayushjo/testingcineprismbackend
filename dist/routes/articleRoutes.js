"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const articleController_1 = require("../controllers/articleController");
const extractUser_1 = require("../middlewares/extractUser");
const multer_1 = __importDefault(require("../middlewares/multer"));
const rateLimiter_1 = require("../middlewares/rateLimiter");
const optionalAuth_1 = require("../middlewares/optionalAuth");
const articleHtmlController_1 = require("../controllers/articleHtmlController");
const router = (0, express_1.Router)();
router.route("/search").get(extractUser_1.extractUserDetails, articleController_1.searchArticles);
router
    .route("/create-article")
    .post(extractUser_1.extractUserDetails, multer_1.default.any(), articleController_1.createArticle);
router
    .route("/update-article/:articleId")
    .post(extractUser_1.extractUserDetails, multer_1.default.any(), articleController_1.updateArticle);
router.route("/get-articles").get(articleController_1.getArticles);
router.route("/get-article/:slug").get(articleController_1.getSingleArticle);
router
    .route("/:articleId/comments")
    .post(extractUser_1.extractUserDetails, rateLimiter_1.rateLimiter.createComment, articleController_1.createComment);
router
    .route("/comments/:commentId/replies")
    .post(extractUser_1.extractUserDetails, rateLimiter_1.rateLimiter.createReply, articleController_1.createReply);
router.route("/comments/:commentId").put(extractUser_1.extractUserDetails, articleController_1.updateComment);
router.route("/comments/:commentId").delete(extractUser_1.extractUserDetails, articleController_1.deleteComment);
router.route("/:articleId/comments").get(articleController_1.fetchComments);
router.route("/comments/:commentId/replies").get(articleController_1.fetchReplies);
router.route("/comments/:commentId/thread").get(articleController_1.fetchCommentThread);
router
    .route("/:articleId/like")
    .post(extractUser_1.extractUserDetails, rateLimiter_1.rateLimiter.toggleLike, articleController_1.toggleLike);
router.route("/:articleId/like").get(optionalAuth_1.optionalAuth, articleController_1.getLikeStatus);
router.route("/share/:slug").get(articleHtmlController_1.articleHtml);
exports.default = router;
