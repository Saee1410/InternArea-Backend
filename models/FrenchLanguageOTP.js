import mongoose from "mongoose";

const frenchLanguageOTPSchema = new mongoose.Schema(
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
    },
    {
        timestamps: true,
    }
);

export default mongoose.model(
    "FrenchLanguageOTP",
    frenchLanguageOTPSchema
);
