import express from "express";
import { register, login, googleLogin, forgotPassword, verifyLoginOTP, getMyLoginHistory, getAllUsersLoginHistory} from "../controllers/authController.js";

import { getAllUsers } from "../controllers/authController.js";
import authMiddleware from "../middleware/authMiddleware.js";   

const router = express.Router();

router.post("/register", register);
router.post("/forgot-password", forgotPassword);
router.post("/login", login);
router.post("/verify-login-otp", verifyLoginOTP);
router.post("/google", googleLogin)
router.get("/users", authMiddleware, getAllUsers);
router.get("/login-history", authMiddleware, getMyLoginHistory);
router.get(
  "/login-history/all",
  authMiddleware,
  getAllUsersLoginHistory
);

router.get("/profile", authMiddleware, (req, res) => {

    res.json({
        message: "Welcome",
        user: req.user
    });
});

export default router;