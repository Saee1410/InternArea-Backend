import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";   


import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getMyFriends,
  getFriendRequests,
} from "../controllers/friendController.js";

const router = express.Router();

router.post(
    "/request",
    authMiddleware,
    sendFriendRequest
);

//Accept Friend Request
router.put(
    "/request/:requestId/accept",
    authMiddleware,
    acceptFriendRequest
);

router.put(
    "/request/:requestId/reject",
    authMiddleware,
    rejectFriendRequest
);


// Get my friends
router.get(
  "/",
  authMiddleware,
  getMyFriends
);

// Get pending friend requests
router.get(
  "/requests",
  authMiddleware,
  getFriendRequests
);


export default router;