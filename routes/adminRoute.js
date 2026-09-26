import express from "express";
import { 
    getAllUsersLoginHistory, 
    getMyLoginHistory 
} from "../controllers/authController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";

const router = express.Router();

router.get(
    "/dashboard",
    authMiddleware,
    adminMiddleware,
    (req, res) => {
        res.json({
            message: "Welcome Admin"
        });
    }
);

router.get("/admin/login-history", authMiddleware, adminMiddleware, getAllUsersLoginHistory);

router.get("/my-login-history", authMiddleware, getMyLoginHistory);

export default router;