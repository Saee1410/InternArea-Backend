import express from "express";
import {
  checkPremium,
} from "../controllers/premiumController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/check",
  authMiddleware,
  checkPremium
);

// router.get(
//     "/check",
//     authMiddleware,
//     (req, res) => {
//         console.log("🔥 PREMIUM ROUTE HIT");

//         res.json({
//             success: true,
//             message: "Premium route working",
//         });
//     }
// );

export default router;