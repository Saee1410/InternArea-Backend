import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";

import {
    sendFrenchOTP,
    verifyFrenchOTP,
} from "../controllers/frenchLanguageController.js";

const router = express.Router();

// Send French Language OTP
router.post(
    "/send",
    authMiddleware,
    sendFrenchOTP
);

// Verify French Language OTP
router.post(
    "/verify",
    authMiddleware,
    verifyFrenchOTP
);

export default router;
