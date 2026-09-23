import User from "../models/User.js";

export const getProfile = async (req, res) => {
  try {
    console.log(req.user);

    const user = await User.findById(req.user.id).select("-password");

    console.log(user);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.status(200).json(user);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: error.message,
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    console.log(req.body);

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    ).select("-password");

    console.log(updatedUser);

    res.status(200).json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: error.message,
    });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",

      });
    }

    res.status(200).json(user);
  } catch (error){
    console.log(error);

    res.status(500).json({
      message: error.message,
        });
  }
};