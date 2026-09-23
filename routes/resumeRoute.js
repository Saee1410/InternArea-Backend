import express from "express";

import {
  createResume,
  getMyResume,
  updateResume,
  deleteResume,
} from "../controllers/resumeController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();


// Create Resume
router.post(
  "/create",
  authMiddleware,
  createResume
);


// Get logged-in user's resume
router.get(
  "/my",
  authMiddleware,
  getMyResume
);


// Update Resume
router.put(
  "/update",
  authMiddleware,
  updateResume
);


// Delete Resume
router.delete(
  "/delete",
  authMiddleware,
  deleteResume
);


export default router;