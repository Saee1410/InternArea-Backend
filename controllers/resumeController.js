import Resume from "../models/Resume.js";
import { translateText } from "../services/translationService.js";

// ==========================================
// CREATE RESUME
// ==========================================
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


// ==========================================
// GET LOGGED-IN USER'S RESUME (WITH TRANSLATION)
// ==========================================
export const getMyResume = async (req, res) => {
  try {
    const lang = req.query.lang || "en"; // 🟢 भाषा स्वीकारणे

    const resume = await Resume.findOne({
      userId: req.user.id,
    });

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: "Resume not found",
      });
    }

    // जर इंग्रजी भाषा असेल तर मूळ रेझ्युमे पाठवा
    if (!lang || lang === "en") {
      return res.status(200).json({
        success: true,
        resume,
      });
    }

    const resumeObj = resume.toObject();

    // 🟢 १. ज्या फील्ड्स ट्रान्सलेट करायच्या आहेत त्या गोळा करा
    // (टीप: नाव, ईमेल, फोन, लिंक्स, आयडी ट्रान्सलेट केले जात नाहीत)
    const fieldsToTranslate = [
      resumeObj.location,
      resumeObj.qualification,
      resumeObj.college,
      resumeObj.experience,
      resumeObj.skills,
      resumeObj.projects,
      resumeObj.achievements,
    ].filter(Boolean);

    // 🟢 २. ट्रान्सलेशन सर्व्हिस कॉल करणे
    const translatedValues = await translateText(fieldsToTranslate, lang);

    // 🟢 ३. ट्रान्सलेट झालेल्या व्हॅल्यूज पुन्हा ऑब्जेक्टमध्ये सेट करणे
    let pointer = 0;
    if (resumeObj.location) resumeObj.location = translatedValues[pointer++];
    if (resumeObj.qualification) resumeObj.qualification = translatedValues[pointer++];
    if (resumeObj.college) resumeObj.college = translatedValues[pointer++];
    if (resumeObj.experience) resumeObj.experience = translatedValues[pointer++];
    if (resumeObj.skills) resumeObj.skills = translatedValues[pointer++];
    if (resumeObj.projects) resumeObj.projects = translatedValues[pointer++];
    if (resumeObj.achievements) resumeObj.achievements = translatedValues[pointer++];

    return res.status(200).json({
      success: true,
      resume: resumeObj,
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


// ==========================================
// UPDATE RESUME
// ==========================================
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


// ==========================================
// DELETE RESUME
// ==========================================
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


// import Resume from "../models/Resume.js";

// // Create Resume
// export const createResume = async (req, res) => {
//   try {
//     const {
//       fullName,
//       email,
//       phone,
//       location,
//       qualification,
//       college,
//       graduationYear,
//       experience,
//       skills,
//       projects,
//       achievements,
//       linkedin,
//       github,
//     } = req.body;

//     // Basic validation
//     if (!fullName || !email) {
//       return res.status(400).json({
//         success: false,
//         message: "Full name and email are required",
//       });
//     }

//     // Check if user already has a resume
//     const existingResume = await Resume.findOne({
//       userId: req.user.id,
//     });

//     if (existingResume) {
//       return res.status(400).json({
//         success: false,
//         message: "Resume already exists. Please update your existing resume.",
//       });
//     }

//     const resume = await Resume.create({
//       userId: req.user.id,
//       fullName,
//       email,
//       phone,
//       location,
//       qualification,
//       college,
//       graduationYear,
//       experience,
//       skills,
//       projects,
//       achievements,
//       linkedin,
//       github,
//     });

//     return res.status(201).json({
//       success: true,
//       message: "Resume created successfully",
//       resume,
//     });
//   } catch (error) {
//     console.error("Create Resume Error:", error);

//     return res.status(500).json({
//       success: false,
//       message: "Failed to create resume",
//       error: error.message,
//     });
//   }
// };


// // Get logged-in user's resume
// export const getMyResume = async (req, res) => {
//   try {
//     const resume = await Resume.findOne({
//       userId: req.user.id,
//     });

//     if (!resume) {
//       return res.status(404).json({
//         success: false,
//         message: "Resume not found",
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       resume,
//     });
//   } catch (error) {
//     console.error("Get Resume Error:", error);

//     return res.status(500).json({
//       success: false,
//       message: "Failed to fetch resume",
//       error: error.message,
//     });
//   }
// };


// // Update Resume
// export const updateResume = async (req, res) => {
//   try {
//     const resume = await Resume.findOne({
//       userId: req.user.id,
//     });

//     if (!resume) {
//       return res.status(404).json({
//         success: false,
//         message: "Resume not found",
//       });
//     }

//     const updatedResume = await Resume.findByIdAndUpdate(
//       resume._id,
//       req.body,
//       {
//         new: true,
//         runValidators: true,
//       }
//     );

//     return res.status(200).json({
//       success: true,
//       message: "Resume updated successfully",
//       resume: updatedResume,
//     });
//   } catch (error) {
//     console.error("Update Resume Error:", error);

//     return res.status(500).json({
//       success: false,
//       message: "Failed to update resume",
//       error: error.message,
//     });
//   }
// };


// // Delete Resume
// export const deleteResume = async (req, res) => {
//   try {
//     const resume = await Resume.findOne({
//       userId: req.user.id,
//     });

//     if (!resume) {
//       return res.status(404).json({
//         success: false,
//         message: "Resume not found",
//       });
//     }

//     await Resume.findByIdAndDelete(resume._id);

//     return res.status(200).json({
//       success: true,
//       message: "Resume deleted successfully",
//     });
//   } catch (error) {
//     console.error("Delete Resume Error:", error);

//     return res.status(500).json({
//       success: false,
//       message: "Failed to delete resume",
//       error: error.message,
//     });
//   }
// };