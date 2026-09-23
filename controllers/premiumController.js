import Resume from "../models/Resume.js";

export const checkPremium = async (req, res) => {
    try {
        const userId = req.user.id; 
        const resume = await Resume.findOne({
            userId: userId,
        });

        if (!resume) {
            return res.status(404).json({
                success: false,
                message: "Resume not found",
                isPremium: false,
            });
        }
          return res.status(200).json({
      success: true,
      isPremium: resume.isPremium,
      paymentStatus: resume.paymentStatus,
      resumeId: resume._id,
    });
    } catch (error) {
    console.error("Premium check Error: ", error);

    return res.status(500).json({
        success: false,
        message: "Failed to check premium status",
    });
    }
};
