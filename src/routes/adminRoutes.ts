import { Router } from "express";
import uploadFile from "../middlewares/multer";
import { extractUserDetails } from "../middlewares/extractUser";
import {
  createPost,
  fetchAllPost,
  uploadImages,
  uploadPoster,
} from "../controllers/adminController";

const router = Router();

router.route("/add-poster").post(extractUserDetails,uploadFile.single("file"), uploadPoster);
router.route("/create-post").post(extractUserDetails,createPost);
router.route("/upload-images").post(extractUserDetails,uploadFile.array("files",10), uploadImages);
router.route("/fetch-posts").post(fetchAllPost);
export default router;
