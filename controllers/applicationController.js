import Application from "../models/Application.js";
import Internship from "../models/Internship.js";
import User from "../models/User.js";


// ==========================================
// APPLY FOR INTERNSHIP
// ==========================================

export const applyForInternship = async (req, res) => {
  try {
    const userId = req.user.id;
    const { internshipId } = req.body;

    if (!internshipId) {
      return res.status(400).json({
        success: false,
        message: "Internship ID is required",
      });
    }

    // Check internship exists
    const internship = await Internship.findById(internshipId);

    if (!internship) {
      return res.status(404).json({
        success: false,
        message: "Internship not found",
      });
    }

    // Get user
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // ==========================================
    // CHECK SUBSCRIPTION EXPIRY
    // ==========================================

    const now = new Date();

    if (
      user.subscriptionPlan !== "free" &&
      user.subscriptionEndDate &&
      user.subscriptionEndDate <= now
    ) {
      user.subscriptionPlan = "free";
      user.subscriptionStartDate = null;
      user.subscriptionEndDate = null;
      user.monthlyApplicationLimit = 1;
      user.monthlyApplicationsUsed = 0;
      user.applicationMonth = "";

      await user.save();
    }

    // ==========================================
    // CURRENT MONTH
    // ==========================================

    const currentMonth = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
    }).format(now);

    // Reset monthly count if new month
    if (user.applicationMonth !== currentMonth) {
      user.monthlyApplicationsUsed = 0;
      user.applicationMonth = currentMonth;

      await user.save();
    }

    // ==========================================
    // CHECK DUPLICATE APPLICATION
    // ==========================================

    const existingApplication = await Application.findOne({
      applicantId: userId,
      internshipId,
    });

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: "You have already applied for this internship",
      });
    }

    // ==========================================
    // CHECK MONTHLY LIMIT
    // ==========================================

    if (
      user.monthlyApplicationLimit !== -1 &&
      user.monthlyApplicationsUsed >=
        user.monthlyApplicationLimit
    ) {
      return res.status(429).json({
        success: false,
        message:
          "Monthly application limit reached. Please upgrade your plan.",
        plan: user.subscriptionPlan,
        monthlyApplicationLimit:
          user.monthlyApplicationLimit,
        monthlyApplicationsUsed:
          user.monthlyApplicationsUsed,
      });
    }

    // ==========================================
    // CREATE APPLICATION
    // ==========================================

    const application = await Application.create({
      applicantId: userId,
      internshipId,
      status: "Pending",
    });

    // Increase monthly usage
    user.monthlyApplicationsUsed += 1;

    await user.save();

    return res.status(201).json({
      success: true,
      message: "Application submitted successfully",
      application,
      plan: user.subscriptionPlan,
      monthlyApplicationLimit:
        user.monthlyApplicationLimit === -1
          ? "unlimited"
          : user.monthlyApplicationLimit,
      monthlyApplicationsUsed:
        user.monthlyApplicationsUsed,
    });

  } catch (error) {
    console.error("Apply Internship Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to apply for internship",
      error: error.message,
    });
  }
};


// ==========================================
// GET MY APPLICATIONS
// ==========================================

export const getMyApplications = async (req, res) => {
  try {
    const userId = req.user.id;

    const applications = await Application.find({
      applicantId: userId,
    })
      .populate(
        "internshipId",
        "companyName role title location"
      )
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: applications.length,
      applications,
    });

  } catch (error) {
    console.error("Get My Applications Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch applications",
    });
  }
};