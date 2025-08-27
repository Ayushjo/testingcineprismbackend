import { Router } from "express";
import uploadFile from "../middlewares/multer";
import { extractUserDetails } from "../middlewares/extractUser";
import {
  addTopPicks,
  createPost,
  editPost,
  fetchAllPost,
  fetchTopPicks,
  uploadImages,
  uploadPoster,
  uploadReviewPoster,
} from "../controllers/adminController";

const router = Router();

router
  .route("/add-poster")
  .post(extractUserDetails, uploadFile.single("file"), uploadPoster);
router
  .route("/add-review-poster")
  .post(extractUserDetails, uploadFile.single("file"), uploadReviewPoster);
router.route("/create-post").post(extractUserDetails, createPost);
router
  .route("/upload-images")
  .post(extractUserDetails, uploadFile.array("files", 10), uploadImages);
router
  .route("/create-top-picks")
  .post(extractUserDetails, uploadFile.single("file"), addTopPicks);
router.route("/fetch-top-picks").post(extractUserDetails, fetchTopPicks);
router.route("/fetch-posts").post(fetchAllPost);
router.route("/edit-post").post(extractUserDetails, editPost);
export default router;
