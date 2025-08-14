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
router.route("/add-poster").post(extractUser_1.extractUserDetails, multer_1.default.single("file"), adminController_1.uploadPoster);
router.route("/create-post").post(extractUser_1.extractUserDetails, adminController_1.createPost);
router.route("/upload-images").post(extractUser_1.extractUserDetails, multer_1.default.array("files", 10), adminController_1.uploadImages);
router.route("/fetch-posts").post(adminController_1.fetchAllPost);
exports.default = router;
