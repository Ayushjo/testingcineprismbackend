"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
// Ensure temp upload directory exists
const TEMP_DIR = "/tmp/cineprism-uploads";
if (!fs_1.default.existsSync(TEMP_DIR)) {
    fs_1.default.mkdirSync(TEMP_DIR, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, TEMP_DIR);
    },
    filename: (_req, file, cb) => {
        const ext = path_1.default.extname(file.originalname);
        const uniqueName = `${crypto_1.default.randomUUID()}${ext}`;
        cb(null, uniqueName);
    },
});
const uploadFile = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max per file
        files: 50, // max 50 files per request
    },
});
exports.default = uploadFile;
