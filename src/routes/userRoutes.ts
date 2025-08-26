import { Router } from "express";
import {
  fetchAllOpinions,
  fetchCommentsWithOpinionId,
  fetchUser,
  handleComment,
  loadMoreReplies,
  logoutUser,
  postOpinion,
  toggleLikess,
} from "../controllers/userController";
import { extractUserDetails } from "../middlewares/extractUser";

const router = Router();


router.route("/me").get(fetchUser);
router.route("/create-opinion").post(extractUserDetails, postOpinion);
router.route("/fetch-opinions").get(fetchAllOpinions);
router.route("/like").post(extractUserDetails, toggleLikess);
router.route("/logout").post(logoutUser);
router.route("/opinion-comment").post(extractUserDetails, handleComment);
router.route("/fetch-comments").post(fetchCommentsWithOpinionId);
router.route("/load-more-replies").post(extractUserDetails, loadMoreReplies);
export default router;
