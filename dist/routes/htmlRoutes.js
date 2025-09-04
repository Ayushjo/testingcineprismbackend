"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const postHtmlController_1 = require("../controllers/postHtmlController");
const router = (0, express_1.Router)();
router.route("/post/:id").get(postHtmlController_1.postHtml);
exports.default = router;
