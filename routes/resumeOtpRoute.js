import express from "express";

import {
  sendResumeOTP,
  verifyResumeOTP,
} from "../controllers/resumeOtpController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();


// Send OTP
router.post(
  "/send",
  authMiddleware,
  sendResumeOTP
);


// Verify OTP
router.post(
  "/verify",
  authMiddleware,
  verifyResumeOTP
);


export default router;