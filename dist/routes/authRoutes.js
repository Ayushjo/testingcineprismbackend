"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const passport_1 = __importDefault(require("../config/passport"));
const authController_1 = require("../controllers/authController");
const router = (0, express_1.Router)();
// Google OAuth routes
router.get("/google", passport_1.default.authenticate("google", {
    scope: ["profile", "email"],
}));
router.get("/google/callback", passport_1.default.authenticate("google", {
    failureRedirect: "/auth/google/failure",
    session: false,
}), authController_1.googleAuthSuccess);
router.get("/google/failure", authController_1.googleAuthFailure);
exports.default = router;
