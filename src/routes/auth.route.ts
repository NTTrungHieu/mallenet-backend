import express from "express";
import {
  getUserInfo,
  login,
  logout,
  signup,
} from "../controllers/auth.controller.js";
import protectRoute from "../middlewares/protectRoute.js";

const router = express.Router();

router.get("/getUserInfo", protectRoute, getUserInfo);
router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);

export default router;
