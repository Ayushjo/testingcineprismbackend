import multer from "multer";

const storage = multer.memoryStorage();

const uploadFile = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max per file
    files: 50,                   // max 50 files per request (1 main + up to 49 blocks)
  },
});

export default uploadFile;