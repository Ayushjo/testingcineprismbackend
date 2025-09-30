"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("../middlewares/multer"));
const extractUser_1 = require("../middlewares/extractUser");
const adminController_1 = require("../controllers/adminController");
const router = (0, express_1.Router)();
router.route("/add-byGenres").post(extractUser_1.extractUserDetails, multer_1.default.single("file"), adminController_1.addByGenre);
router.route("/fetch-byGenre/:genre").get(extractUser_1.extractUserDetails, adminController_1.fetchGenre);
router
    .route("/add-poster")
    .post(extractUser_1.extractUserDetails, multer_1.default.single("file"), adminController_1.uploadPoster);
router
    .route("/add-review-poster")
    .post(extractUser_1.extractUserDetails, multer_1.default.single("file"), adminController_1.uploadReviewPoster);
router.route("/create-post").post(extractUser_1.extractUserDetails, adminController_1.createPost);
router
    .route("/upload-images")
    .post(extractUser_1.extractUserDetails, multer_1.default.array("files", 10), adminController_1.uploadImages);
router
    .route("/create-top-picks")
    .post(extractUser_1.extractUserDetails, multer_1.default.single("file"), adminController_1.addTopPicks);
router.route("/fetch-top-picks").post(extractUser_1.extractUserDetails, adminController_1.fetchTopPicks);
router.route("/fetch-posts").post(adminController_1.fetchAllPost);
router.route("/edit-post").post(extractUser_1.extractUserDetails, adminController_1.editPost);
router.route("/delete-post").post(extractUser_1.extractUserDetails, adminController_1.deletePost);
router.route("/delete-image").post(extractUser_1.extractUserDetails, adminController_1.deleteImage);
router.route("/has-liked").post(extractUser_1.extractUserDetails, adminController_1.hasLiked);
router.route("/latest-reviews").get(adminController_1.latestReviews);
router.route("/add-quotes").post(extractUser_1.extractUserDetails, adminController_1.addQuotes);
router.route("/edit-quote").post(extractUser_1.extractUserDetails, adminController_1.editQutoe);
router.route("/fetch-quotes").get(adminController_1.fetchQuotes);
exports.default = router;
