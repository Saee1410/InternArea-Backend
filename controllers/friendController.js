import Friend from "../models/Friend.js";
import User from "../models/User.js";


// =====================================================
// SEND FRIEND REQUEST
// =====================================================

export const sendFriendRequest = async (req, res) => {
  try {
    const senderId = req.user.id ;
    const { receiverId } = req.body;

    // Receiver ID check
    if (!receiverId) {
      return res.status(400).json({
        message: "Receiver ID is required",
      });
    }

    // Cannot send request to yourself
    if (senderId === receiverId) {
      return res.status(400).json({
        message: "You cannot send a friend request to yourself",
      });
    }

    // Check receiver exists
    const receiver = await User.findById(receiverId);

    if (!receiver) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Check existing request
    const existingRequest = await Friend.findOne({
      $or: [
        {
          sender: senderId,
          receiver: receiverId,
        },
        {
          sender: receiverId,
          receiver: senderId,
        },
      ],
    });

    if (existingRequest) {
      if (existingRequest.status === "accepted") {
        return res.status(400).json({
          message: "You are already friends",
        });
      }

      if (existingRequest.status === "pending") {
        return res.status(400).json({
          message: "Friend request already exists",
        });
      }

      // If previous request was rejected,
      // allow sending a new request
      existingRequest.sender = senderId;
      existingRequest.receiver = receiverId;
      existingRequest.status = "pending";

      await existingRequest.save();

      return res.status(200).json({
        message: "Friend request sent successfully",
      });
    }

    // Create new request
    await Friend.create({
      sender: senderId,
      receiver: receiverId,
      status: "pending",
    });

    return res.status(201).json({
      message: "Friend request sent successfully",
    });
  } catch (error) {
    console.error("Send Friend Request Error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};


// =====================================================
// ACCEPT FRIEND REQUEST
// =====================================================

export const acceptFriendRequest = async (req, res) => {
  try {
    const receiverId = req.user.id;
    const { requestId } = req.params;

    const request = await Friend.findById(requestId);

    if (!request) {
      return res.status(404).json({
        message: "Friend request not found",
      });
    }

    // Only receiver can accept
    if (request.receiver.toString() !== receiverId) {
      return res.status(403).json({
        message: "You are not allowed to accept this request",
      });
    }

    if (request.status !== "pending") {
      return res.status(400).json({
        message: "This request is no longer pending",
      });
    }

    request.status = "accepted";

    await request.save();

    return res.status(200).json({
      message: "Friend request accepted successfully",
    });
  } catch (error) {
    console.error("Accept Friend Request Error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};


// =====================================================
// REJECT FRIEND REQUEST
// =====================================================

export const rejectFriendRequest = async (req, res) => {
  try {
    const receiverId = req.user.id;
    const { requestId } = req.params;

    const request = await Friend.findById(requestId);

    if (!request) {
      return res.status(404).json({
        message: "Friend request not found",
      });
    }

    // Only receiver can reject
    if (request.receiver.toString() !== receiverId) {
      return res.status(403).json({
        message: "You are not allowed to reject this request",
      });
    }

    if (request.status !== "pending") {
      return res.status(400).json({
        message: "This request is no longer pending",
      });
    }

    request.status = "rejected";

    await request.save();

    return res.status(200).json({
      message: "Friend request rejected successfully",
    });
  } catch (error) {
    console.error("Reject Friend Request Error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};


// =====================================================
// GET MY FRIENDS
// =====================================================

export const getMyFriends = async (req, res) => {
  try {
    const userId = req.user.id;

    const friendships = await Friend.find({
      $or: [
        {
          sender: userId,
          status: "accepted",
        },
        {
          receiver: userId,
          status: "accepted",
        },
      ],
    })
      .populate("sender", "name email profilePhoto")
      .populate("receiver", "name email profilePhoto");

    const friends = friendships.map((friendship) => {
      if (friendship.sender._id.toString() === userId) {
        return friendship.receiver;
      }

      return friendship.sender;
    });

    return res.status(200).json({
      count: friends.length,
      friends,
    });
  } catch (error) {
    console.error("Get Friends Error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};


// =====================================================
// GET FRIEND REQUESTS
// =====================================================

export const getFriendRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    console.log("================================="); 
    console.log("GET FRIEND REQUESTS"); 
    console.log("Logged-in User ID:", userId);

    const requests = await Friend.find({
      receiver: userId,
      status: "pending",
    })
      .populate("sender", "name email profilePhoto")
      .sort({ createdAt: -1 });

      console.log("Pending Requests Found:", requests.length); 
      console.log("Requests:", requests);
       console.log("=================================");

    return res.status(200).json({
      count: requests.length,
      requests,
    });
  } catch (error) {
    console.error("Get Friend Requests Error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
};