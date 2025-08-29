"use strict";
// src/routes/newsRoutes.ts
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ainewsControllers_1 = require("../controllers/ainewsControllers");
const router = (0, express_1.Router)();
router.route("/").get(ainewsControllers_1.getTrendingNews);
router.route("/search").get(ainewsControllers_1.searchNews);
router.route("/category/:category").get(ainewsControllers_1.getNewsByCategory);
router.route("/refresh").post(ainewsControllers_1.refreshTrendingNews);
router.route("/status/refresh").get(ainewsControllers_1.getRefreshStatus);
router.route("/:id").get(ainewsControllers_1.getNewsById);
exports.default = router;
