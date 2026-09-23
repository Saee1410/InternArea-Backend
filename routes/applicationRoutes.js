import express from "express";

import {
  applyForInternship,
  getMyApplications,
} from "../controllers/applicationController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// APPLY FOR INTERNSHIP
router.post(
  "/apply",
  authMiddleware,
  applyForInternship
);

// GET MY APPLICATIONS
router.get(
  "/my",
  authMiddleware,
  getMyApplications
);

export default router;