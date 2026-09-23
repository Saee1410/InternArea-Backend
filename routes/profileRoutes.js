import express from "express";
console.log("Profile Routes Loaded");

import authMiddleware from "../middleware/authMiddleware.js";

import {
    getProfile, updateProfile , getUserProfile
} from "../controllers/profileController.js";

const router = express.Router();

router.get("/", (req, res, next ) => {
   console.log("profile Route hit");
   next();
}, authMiddleware, getProfile);
router.put("/", authMiddleware, updateProfile);


router.get("/:userId", authMiddleware, getUserProfile);

export default router;