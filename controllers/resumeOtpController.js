import ResumeOtp from "../models/ResumeOtp.js";
import { sendOTPEmail } from "../services/emailService.js";


// ==========================
// SEND OTP
// ==========================

export const sendResumeOTP = async (req, res) => {
  try {
    const userId = req.user.id;
    const email = req.body.email;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Generate 6 digit OTP
    const otp = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    // OTP expires after 10 minutes
    const expiresAt = new Date(
      Date.now() + 10 * 60 * 1000
    );

    // Delete old OTP
    await ResumeOtp.deleteMany({
      userId,
      email,
    });

    // Save OTP
    await ResumeOtp.create({
      userId,
      email,
      otp,
      expiresAt,
    });

    // Send email using Brevo
    const emailSent = await sendOTPEmail(
      email,
      otp
    );

    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: "Failed to send OTP email",
      });
    }

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
    });

  } catch (error) {
    console.error(
      "Send OTP Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to send OTP",
    });
  }
};


// ==========================
// VERIFY OTP
// ==========================

export const verifyResumeOTP = async (req, res) => {
  try {
    const userId = req.user.id;
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const otpRecord = await ResumeOtp.findOne({
      userId,
      email,
      otp,
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // Check expiration
    if (otpRecord.expiresAt < new Date()) {
      await ResumeOtp.findByIdAndDelete(
        otpRecord._id
      );

      return res.status(400).json({
        success: false,
        message: "OTP has expired",
      });
    }

    // Mark verified
    otpRecord.verified = true;

    await otpRecord.save();

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
    });

  } catch (error) {
    console.error(
      "Verify OTP Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "OTP verification failed",
    });
  }
};





// import Resume from "../models/Resume.js";
// import ResumeOtp from "../models/ResumeOtp.js";
// import sendOTPEmail from "../services/brevoService.js";

// export const sendResumeOTP = async (req, res) => {
//     try {
//         const userId = req.user.id;
//         const email = req.user.email;

//         if(!email){
//             return res.status(400).json({
//                 success: false,
//                 message: "User email not found",
//             });
//         }

//         const otp = Math.floor(
//             100000 + Math.random() * 900000
//     ).toString();

//     const expiresAt = new Date(
//         Date.now() + 5 * 60 * 1000
//     );

//     await ResumeOtp.deleteMany({
//         userId,
//         email,
//     });

//     //save otp to database
//     const emailSent = await sendOTPEmail(
//         email,
//         otp
//     );

//     if (!emailSent) {
//         return res.status(500).json({
//             success: false,
//             message: "Failed to send OTP email",
//         });
//     }

//      return res.status(200).json({
//       success: true,
//       message: "OTP sent successfully",
//     });
//  } catch (error) {
//     console.error(
//       "Send OTP Error:",
//       error
//     );

//     return res.status(500).json({
//       success: false,
//       message: "Failed to send OTP",
//     });
//   }
// };


//         if (!resume) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Resume not found",
//             });
//         }

//         const otp = Math.floor(
//             100000 + Math.random() * 900000
//         ).toString();

//         const expiresAt = new Date(
//             Date.now() + 5 * 60 * 1000
//         );

//         // remove otp
//         await ResumeOtp.create({
//             userId,
//             email: resume.email,
//             otp,
//             expiresAt,
//             verified: false,
//         });

//         // Send OTP email
//         const emailSent = await sendOTPEmail(
//             resume.email,
//             otp
//         );

//         if (!emailSent) {
//             return res.status(500).json({
//                 success: false,
//                 message: "Failed to send OTP email",
//             });
//         }

//         return res.status(200).json({
//             success: true,
//             message: "OTP sent successfully",
//         });

//     } catch (error){
//         console.error("send Resume OTP Error:", error);

//         return res.status(500).json({
//             success: false,
//             message: "Failed to send OTP",
//         });
//     }
// };

// //verify OTP
// export const verifyResumeOTP = async (req, res) => {
//     try {
//         const userId = req.user.id;
//         const { otp } = req.body;

//         if (!otp) {
//             return res.status(400).json({
//                 success: false,
//                 message: "OTP is required",
//             });
//         }

//         const otpRecord = await ResumeOtp.findOne({
//             userId,
//             verified: false,

//         }).sort({ createdAt: -1 });

//         if (!otpRecord) {
//             return res.status(400).json({
//                 success: false,
//                 message: "No OTP found or already verified",
//             });
//         }
//         if (otpRecord.otp !== otp.toString()) {
//               return res.status(400).json({
//                 success: false,
//                 message: "Invalid OTP",
//               });
//             }
        
//             otpRecord.verified = true;
        
//             await otpRecord.save();
        
//             return res.status(200).json({
//               success: true,
//               message: "OTP verified successfully",
//             });
//     } catch (error) {
//     console.error("Verify Resume OTP Error:", error);

//     return res.status(500).json({
//       success: false,
//       message: "Failed to verify OTP",
//     });
//   }
// };