import mongoose from "mongoose";

const loginOtpSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        email: {
            type: String,
            required: true,
        },

        otp: {
            type: String,
            required: true,
        },


        expiresAt: {
            type: Date,
            required: true,
        },
 
        verified: {
            type: Boolean,
            default: false,
        },
        
    },

    {
        timestamps: true,
    }
);

const LoginOtp = mongoose.model("LoginOtp", loginOtpSchema);

export default LoginOtp;