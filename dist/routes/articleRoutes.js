"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const articleController_1 = require("../controllers/articleController");
const extractUser_1 = require("../middlewares/extractUser");
const multer_1 = __importDefault(require("../middlewares/multer"));
const router = (0, express_1.Router)();
router.route("/create-article").post(extractUser_1.extractUserDetails, multer_1.default.any(), articleController_1.createArticle);
router.route("/get-articles").get(articleController_1.getArticles);
router.route("/get-article/:slug").get(articleController_1.getSingleArticle);
exports.default = router;
