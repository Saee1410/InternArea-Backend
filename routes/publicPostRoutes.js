import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";

import {
  createPublicPost,
  getPublicPosts,
  toggleLike,
  addComment,
  sharePublicPost,
} from "../controllers/publicPostController.js";

const router = express.Router();

// ================================
// GET ALL PUBLIC POSTS
// ================================
router.get(
  "/",
  getPublicPosts
);

// ================================
// CREATE PUBLIC POST
// ================================
router.post(
  "/",
  authMiddleware,
  upload.single("media"),
  createPublicPost
);

// ================================
// LIKE / UNLIKE
// ================================
router.put(
  "/:postId/like",
  authMiddleware,
  toggleLike
);

// ================================
// ADD COMMENT
// ================================
router.post(
  "/:postId/comment",
 authMiddleware,
  addComment
);

// ================================
// SHARE PUBLIC POST
// ================================
router.post(
  "/:postId/share",
  authMiddleware,
  sharePublicPost
);

export default router;
