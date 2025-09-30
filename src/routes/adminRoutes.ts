import { Router } from "express";
import uploadFile from "../middlewares/multer";
import { extractUserDetails } from "../middlewares/extractUser";
import {
  addByGenre,
  addQuotes,
  addTopPicks,
  createPost,
  deleteImage,
  deletePost,
  editPost,
  editQutoe,
  fetchAllPost,
  fetchGenre,
  fetchQuotes,
  fetchTopPicks,
  hasLiked,
  latestReviews,
  uploadImages,
  uploadPoster,
  uploadReviewPoster,
} from "../controllers/adminController";

const router = Router();

router.route("/add-byGenres").post(extractUserDetails,uploadFile.single("file"),addByGenre);
router.route("/fetch-byGenre/:genre").get(extractUserDetails,fetchGenre)
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
router.route("/delete-post").post(extractUserDetails, deletePost);
router.route("/delete-image").post(extractUserDetails, deleteImage);
router.route("/has-liked").post(extractUserDetails, hasLiked);
router.route("/latest-reviews").get(latestReviews);
router.route("/add-quotes").post(extractUserDetails,addQuotes)
router.route("/edit-quote").post(extractUserDetails,editQutoe)
router.route("/fetch-quotes").get(fetchQuotes)
export default router;
