import express from "express";
import protectRoute from "../middlewares/protectRoute.js";
import {
  getUserInfo,
  login,
  logout,
  signup,
} from "../controllers/auth.controller.js";

const router = express.Router();

router.get("/getUserInfo", protectRoute, getUserInfo);
router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);

export default router;
