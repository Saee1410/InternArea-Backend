import mongoose from "mongoose";

const resumeOtpSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        email: {
            type: String,
            required: true,
            trim: true,
        },

        otp: {
            type: String,
            required: true,
        },
        expiresAt: {
            type: Date,
            required: true,
            index: { expires: 300 }, // OTP expires after 5 minutes 
        },
          verified: {
      type: Boolean,
      default: false,
          },
    },
    { 
        timestamps: true
    }
);

const ResumeOtp = mongoose.model(
"ResumeOtp", 
resumeOtpSchema
);

export default ResumeOtp;

