"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const cacheController_js_1 = require("../controllers/cacheController.js");
const extractUser_js_1 = require("../middlewares/extractUser.js");
const router = (0, express_1.Router)();
// Get all caches
router.get("/list", extractUser_js_1.extractUserDetails, cacheController_js_1.listAllCaches);
// Delete specific cache
router.delete("/delete/:key", extractUser_js_1.extractUserDetails, cacheController_js_1.deleteSingleCache);
// Delete by pattern
router.post("/delete-pattern", extractUser_js_1.extractUserDetails, cacheController_js_1.deleteCachesByPattern);
// Delete all article caches
router.delete("/delete-all-articles", extractUser_js_1.extractUserDetails, cacheController_js_1.deleteAllArticleCaches);
// Delete all post caches
router.delete("/delete-all-posts", extractUser_js_1.extractUserDetails, cacheController_js_1.deleteAllPostCaches);
// Delete ALL caches (nuclear option)
router.delete("/delete-all", extractUser_js_1.extractUserDetails, cacheController_js_1.deleteAllCaches);
exports.default = router;
