import PublicPost from "../models/Publicpost.js";
import Friend from "../models/Friend.js";
import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";

// Get today's date range
const getTodayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

// Get accepted friend count
const getFriendCount = async (userId) => {
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
  });

  return friendships.length;
};

// Calculate daily posting limit
const getDailyPostLimit = (friendCount) => {
  // 0 friends = no posts
  if (friendCount === 0) {
    return 0;
  }

  // 1 friend = 1 post/day
  if (friendCount === 1) {
    return 1;
  }

  // 2 friends = 2 posts/day
  if (friendCount === 2) {
    return 2;
  }

  // 3 to 10 friends = same number of posts
  if (friendCount >= 3 && friendCount <= 10) {
    return friendCount;
  }

  // More than 10 friends = unlimited
  return Infinity;
};

// Upload file to Cloudinary
const uploadToCloudinary = (file) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "internarea/public-space",
        resource_type: "auto",
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    streamifier.createReadStream(file.buffer).pipe(uploadStream);
  });
};

// CREATE PUBLIC POST
export const createPublicPost = async (req, res) => {
  try {
    const userId = req.user.id;

    // Check file
    if (!req.file) {
      return res.status(400).json({
        message: "Please upload an image or video",
      });
    }

    // Check friend count
    const friendCount = await getFriendCount(userId);

    // Calculate posting limit
    const dailyLimit = getDailyPostLimit(friendCount);

    // No friends = cannot post
    if (dailyLimit === 0) {
      return res.status(403).json({
        message: "You need at least 1 friend to create a public post",
        friendCount,
        dailyLimit: 0,
      });
    }

    // Check today's posts
    const { start, end } = getTodayRange();

    const todayPostCount = await PublicPost.countDocuments({
      user: userId,
      createdAt: {
        $gte: start,
        $lte: end,
      },
    });

    // Check daily limit
    if (dailyLimit !== Infinity && todayPostCount >= dailyLimit) {
      return res.status(429).json({
        message: `You can create only ${dailyLimit} post(s) per day`,
        friendCount,
        dailyLimit,
        todayPostCount,
      });
    }

    // Upload to Cloudinary
    const uploadedFile = await uploadToCloudinary(req.file);

    // Detect media type
    const mediaType = req.file.mimetype.startsWith("video/")
      ? "video"
      : "image";

    // Create post
    const post = await PublicPost.create({
      user: userId,
      mediaUrl: uploadedFile.secure_url,
      mediaType,
      caption: req.body.caption || "",
    });

    return res.status(201).json({
      message: "Public post created successfully",
      post,
      friendCount,
      dailyLimit:
        dailyLimit === Infinity ? "unlimited" : dailyLimit,
      todayPostCount: todayPostCount + 1,
    });
  } catch (error) {
    console.error("Create Public Post Error:", error);

    return res.status(500).json({
      message: "Something went wrong while creating the post",
    });
  }
};


// GET ALL PUBLIC POSTS
export const getPublicPosts = async (req, res) => {
  try {
    const posts = await PublicPost.find()
      .populate("user", "name profilePhoto")
      .populate("comments.user", "name profilePhoto")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      count: posts.length,
      posts,
    });
  } catch (error) {
    console.error("Get Public Posts Error:", error);

    return res.status(500).json({
      message: "Something went wrong while fetching public posts",
    });
  }
};


// LIKE / UNLIKE PUBLIC POST
export const toggleLike = async (req, res) => {
  try {
    const userId = req.user.id;
    const { postId } = req.params;

    const post = await PublicPost.findById(postId);

    if (!post) {
      return res.status(404).json({
        message: "Public post not found",
      });
    }

    const alreadyLiked = post.likes.some(
      (id) => id.toString() === userId.toString()
    );

    if (alreadyLiked) {
      // UNLIKE
      post.likes = post.likes.filter(
        (id) => id.toString() !== userId.toString()
      );

      await post.save();

      return res.status(200).json({
        message: "Post unliked successfully",
        liked: false,
        likeCount: post.likes.length,
      });
    }

    // LIKE
    post.likes.push(userId);

    await post.save();

    return res.status(200).json({
      message: "Post liked successfully",
      liked: true,
      likeCount: post.likes.length,
    });
  } catch (error) {
    console.error("Toggle Like Error:", error);

    return res.status(500).json({
      message: "Something went wrong while liking the post",
    });
  }
};


// ================================
// ADD COMMENT TO PUBLIC POST
// ================================
export const addComment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { postId } = req.params;
    const { text } = req.body;

    // Check comment text
    if (!text || !text.trim()) {
      return res.status(400).json({
        message: "Comment cannot be empty",
      });
    }

    // Check maximum length
    if (text.trim().length > 500) {
      return res.status(400).json({
        message: "Comment cannot exceed 500 characters",
      });
    }

    // Find post
    const post = await PublicPost.findById(postId);

    if (!post) {
      return res.status(404).json({
        message: "Public post not found",
      });
    }

    // Add comment
    post.comments.push({
      user: userId,
      text: text.trim(),
    });

    await post.save();

    // Get updated post with user details
    const updatedPost = await PublicPost.findById(postId)
      .populate("user", "name profilePhoto")
      .populate("comments.user", "name profilePhoto");

    return res.status(201).json({
      message: "Comment added successfully",
      post: updatedPost,
    });
  } catch (error) {
    console.error("Add Comment Error:", error);

    return res.status(500).json({
      message: "Something went wrong while adding comment",
    });
  }
};


// ================================
// Share Public Post
// ================================

export const sharePublicPost = async (req, res) => {
  try {
    const { postId } = req.params;
    
    const post = await PublicPost.findById(postId);

    if (!post) {
      return res.status(404).json({
        message: "Public post not found",
      });
    }

    post.shareCount += 1;
    await post.save();

    return res.status(200).json({
      message: "Post shared successfully",
      shareCount: post.shareCount,
      shareUrl: `${req.protocol}://${req.get("host")}/public-posts/${postId}`,
    });
  } catch (error){
    console.error("Share public Post Error:", error);

    return res.status(500).json({
      message: "Something went wrong while sharing the post",
    });
  }
};