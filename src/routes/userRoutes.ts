import { Router } from "express";
import {
  fetchAllOpinions,
  fetchCommentsWithOpinionId,
  fetchUser,
  handleComment,
  loginUser,
  logoutUser,
  postOpinion,
  registerUser,
  toggleLike,
} from "../controllers/userController";
import { extractUserDetails } from "../middlewares/extractUser";

const router = Router();

router.route("/register").post(registerUser);
router.route("/login").post(loginUser);
router.route("/me").get(fetchUser);
router.route("/create-opinion").post(extractUserDetails, postOpinion);
router.route("/fetch-opinions").get(fetchAllOpinions);
router.route("/like").post(extractUserDetails, toggleLike);
router.route("/logout").post(logoutUser);
router.route("/opinion-comment").post(extractUserDetails, handleComment);
router.route("/fetch-comments").post(fetchCommentsWithOpinionId);
export default router;
