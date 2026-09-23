import User from "../models/User.js";
import FrenchLanguageOTP from "../models/FrenchLanguageOTP.js";
import { sendFrenchLanguageOTP } from "../services/emailService.js";


// =====================================================
// SEND FRENCH LANGUAGE OTP
// =====================================================

export const sendFrenchOTP = async (req, res) => {
    try {

        const userId = req.user.id;

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        if (!user.email) {
            return res.status(400).json({
                message: "No email associated with this account",
            });
        }


        // Generate 6 digit OTP

        const otp = Math.floor(
            100000 + Math.random() * 900000
        ).toString();


        // OTP expires after 5 minutes

        const expiresAt = new Date(
            Date.now() + 5 * 60 * 1000
        );


        // Remove previous OTP

        await FrenchLanguageOTP.deleteMany({
            userId: user._id,
        });


        // Save new OTP

        await FrenchLanguageOTP.create({
            userId: user._id,
            email: user.email,
            otp,
            expiresAt,
        });


        // Send email

        const emailSent = await sendFrenchLanguageOTP(
            user.email,
            otp
        );


        if (!emailSent) {

            await FrenchLanguageOTP.deleteMany({
                userId: user._id,
            });

            return res.status(500).json({
                message: "Failed to send OTP. Please try again.",
            });
        }


        return res.status(200).json({
            message: "OTP sent successfully",
        });

    } catch (error) {

        console.error(
            "Send French OTP Error:",
            error
        );

        return res.status(500).json({
            message: "Something went wrong. Please try again.",
        });
    }
};


// =====================================================
// VERIFY FRENCH LANGUAGE OTP
// =====================================================

export const verifyFrenchOTP = async (req, res) => {
    try {

        const userId = req.user.id;

        const { otp } = req.body;


        if (!otp) {
            return res.status(400).json({
                message: "OTP is required",
            });
        }


        const otpRecord = await FrenchLanguageOTP.findOne({
            userId,
        });


        if (!otpRecord) {
            return res.status(400).json({
                message: "OTP not found. Please request a new OTP.",
            });
        }


        // Check expiry

        if (new Date() > otpRecord.expiresAt) {

            await FrenchLanguageOTP.deleteOne({
                _id: otpRecord._id,
            });

            return res.status(400).json({
                message: "OTP has expired. Please request a new OTP.",
            });
        }


        // Check OTP

        if (otpRecord.otp !== otp.toString()) {
            return res.status(400).json({
                message: "Invalid OTP",
            });
        }


        // OTP verified

        await FrenchLanguageOTP.deleteOne({
            _id: otpRecord._id,
        });


        return res.status(200).json({
            message: "French language verification successful",
            verified: true,
        });

    } catch (error) {

        console.error(
            "Verify French OTP Error:",
            error
        );

        return res.status(500).json({
            message: "Something went wrong. Please try again.",
        });
    }
};
