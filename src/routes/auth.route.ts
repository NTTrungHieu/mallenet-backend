import express from "express";
import protectRoute from "../middlewares/protectRoute.js";
import {
  toggleFollow,
  getUserInfo,
  login,
  loginOAuth,
  loginOAuthCallback,
  logout,
  signup,
} from "../controllers/auth.controller.js";

const router = express.Router();

router.get("/getUserInfo", protectRoute, getUserInfo);
router.post("/toggleFollow",protectRoute, toggleFollow);
router.post("/signup", signup);
router.get("/login/google/callback", loginOAuthCallback);
router.get("/login/google", loginOAuth);

router.post("/login", login);
router.post("/logout", logout);

export default router;
