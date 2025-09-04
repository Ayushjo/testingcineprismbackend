"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const postHtmlController_js_1 = require("../controllers/postHtmlController.js");
const router = (0, express_1.Router)();
router.route("/post/:id").get(postHtmlController_js_1.postHtml);
exports.default = router;
