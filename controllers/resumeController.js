import Resume from "../models/Resume.js";

// Create Resume
export const createResume = async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      location,
      qualification,
      college,
      graduationYear,
      experience,
      skills,
      projects,
      achievements,
      linkedin,
      github,
    } = req.body;

    // Basic validation
    if (!fullName || !email) {
      return res.status(400).json({
        success: false,
        message: "Full name and email are required",
      });
    }

    // Check if user already has a resume
    const existingResume = await Resume.findOne({
      userId: req.user.id,
    });

    if (existingResume) {
      return res.status(400).json({
        success: false,
        message: "Resume already exists. Please update your existing resume.",
      });
    }

    const resume = await Resume.create({
      userId: req.user.id,
      fullName,
      email,
      phone,
      location,
      qualification,
      college,
      graduationYear,
      experience,
      skills,
      projects,
      achievements,
      linkedin,
      github,
    });

    return res.status(201).json({
      success: true,
      message: "Resume created successfully",
      resume,
    });
  } catch (error) {
    console.error("Create Resume Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create resume",
      error: error.message,
    });
  }
};


// Get logged-in user's resume
export const getMyResume = async (req, res) => {
  try {
    const resume = await Resume.findOne({
      userId: req.user.id,
    });

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: "Resume not found",
      });
    }

    return res.status(200).json({
      success: true,
      resume,
    });
  } catch (error) {
    console.error("Get Resume Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch resume",
      error: error.message,
    });
  }
};


// Update Resume
export const updateResume = async (req, res) => {
  try {
    const resume = await Resume.findOne({
      userId: req.user.id,
    });

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: "Resume not found",
      });
    }

    const updatedResume = await Resume.findByIdAndUpdate(
      resume._id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Resume updated successfully",
      resume: updatedResume,
    });
  } catch (error) {
    console.error("Update Resume Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update resume",
      error: error.message,
    });
  }
};


// Delete Resume
export const deleteResume = async (req, res) => {
  try {
    const resume = await Resume.findOne({
      userId: req.user.id,
    });

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: "Resume not found",
      });
    }

    await Resume.findByIdAndDelete(resume._id);

    return res.status(200).json({
      success: true,
      message: "Resume deleted successfully",
    });
  } catch (error) {
    console.error("Delete Resume Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete resume",
      error: error.message,
    });
  }
};