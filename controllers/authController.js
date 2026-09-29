
import User from "../models/User.js";
import LoginHistory from "../models/LoginHistory.js";
import LoginOtp from "../models/LoginOtp.js";

import {
    sendOTPEmail,
    sendForgotPasswordEmail,
} from "../services/emailService.js";

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";


// =====================================================
// GOOGLE CLIENT
// =====================================================

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


// =====================================================
// GET LOGIN INFORMATION
// =====================================================

const getLoginInfo = (req) => {

    const userAgent = req.headers["user-agent"] || "";

    // -------------------------
    // Browser
    // -------------------------

    let browser = "Unknown Browser";

    if (/Edg/i.test(userAgent)) {
        browser = "Microsoft Edge";
    } else if (/Chrome/i.test(userAgent)) {
        browser = "Google Chrome";
    } else if (/Firefox/i.test(userAgent)) {
        browser = "Mozilla Firefox";
    } else if (/Safari/i.test(userAgent)) {
        browser = "Safari";
    }


    // -------------------------
    // Operating System
    // -------------------------

    let operatingSystem = "Unknown OS";

    if (/Windows/i.test(userAgent)) {
        operatingSystem = "Windows";
    } else if (/Mac OS/i.test(userAgent)) {
        operatingSystem = "Mac OS";
    } else if (/Android/i.test(userAgent)) {
        operatingSystem = "Android";
    } else if (/iPhone|iPad/i.test(userAgent)) {
        operatingSystem = "iOS";
    } else if (/Linux/i.test(userAgent)) {
        operatingSystem = "Linux";
    }


    // -------------------------
    // Device Type
    // -------------------------

    let deviceType = "desktop";

    if (/Mobile|Android|iPhone/i.test(userAgent)) {
        deviceType = "mobile";
    } else if (/iPad|Tablet/i.test(userAgent)) {
        deviceType = "tablet";
    }


    // -------------------------
    // IP Address
    // -------------------------

    const ipAddress =
        req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
        req.socket.remoteAddress ||
        "Unknown";


    return {
        browser,
        operatingSystem,
        deviceType,
        ipAddress,
    };
};


// =====================================================
// CHECK MOBILE LOGIN TIME
// 10:00 AM - 1:00 PM IST
// =====================================================

const checkMobileLoginTime = () => {

    const indiaTime = new Date().toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });

    const [hour, minute] = indiaTime
        .split(":")
        .map(Number);

    const currentMinutes = hour * 60 + minute;

    const startTime = 10 * 60; // 10:00 AM
    const endTime = 13 * 60;   // 1:00 PM

    return (
        currentMinutes >= startTime &&
        currentMinutes < endTime
    );
};


// =====================================================
// REGISTER
// =====================================================

export const register = async (req, res) => {

    try {

        const {
            name,
            email,
            password,
            phone,
        } = req.body;


        if (!name || !email || !password) {

            return res.status(400).json({
                message: "Name, email and password are required",
            });
        }


        const existingUser = await User.findOne({
            email,
        });


        if (existingUser) {

            return res.status(400).json({
                message: "User already exists",
            });
        }


        const hashedPassword = await bcrypt.hash(
            password,
            10
        );


        const user = await User.create({

            name,
            email,
            password: hashedPassword,
            phone,

        });


        return res.status(201).json({

            message: "Registration successful",

            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },

        });

    } catch (error) {

        console.error(
            "Register Error:",
            error
        );

        return res.status(500).json({
            message: "Something went wrong",
        });
    }
};


// =====================================================
// LOGIN
// =====================================================

export const login = async (req, res) => {

    try {

        const {
            email,
            password,
        } = req.body;


        // ---------------------------------------------
        // Get login information
        // ---------------------------------------------

        const {
            browser,
            operatingSystem,
            deviceType,
            ipAddress,
        } = getLoginInfo(req);


        // ---------------------------------------------
        // MOBILE LOGIN TIME RESTRICTION
        // ---------------------------------------------

        if (deviceType === "mobile") {

            const allowedTime =
                checkMobileLoginTime();


            if (!allowedTime) {

                return res.status(403).json({

                    message:
                        "Mobile login is allowed only between 10:00 AM and 1:00 PM IST",

                });
            }
        }


        // ---------------------------------------------
        // Find User
        // ---------------------------------------------

        const user = await User.findOne({
            email,
        });


        if (!user) {

            return res.status(404).json({
                message: "User not found",
            });
        }


        // ---------------------------------------------
        // Check Password
        // ---------------------------------------------

        const isMatch = await bcrypt.compare(
            password,
            user.password
        );


        if (!isMatch) {

            // Save failed login
            await LoginHistory.create({

                user: user._id,

                browser,

                operatingSystem,

                deviceType,

                ipAddress,

                loginStatus: "failed",

            });


            return res.status(400).json({
                message: "Invalid password",
            });
        }


        // ---------------------------------------------
        // CHROME LOGIN → OTP REQUIRED
        // ---------------------------------------------

        if (browser === "Google Chrome") {

            const otp = Math.floor(
                100000 +
                Math.random() * 900000
            ).toString();


            const expiresAt = new Date(
                Date.now() +
                5 * 60 * 1000
            );


            // Delete previous OTP
            await LoginOtp.deleteMany({

                userId: user._id,

                email: user.email,

            });


            // Create new OTP
            await LoginOtp.create({

                userId: user._id,

                email: user.email,

                otp,

                expiresAt,

                verified: false,

            });


            // Send OTP
            const emailSent =
                await sendOTPEmail(
                    user.email,
                    otp
                );


            if (!emailSent) {

                return res.status(500).json({

                    message:
                        "Failed to send login OTP",

                });
            }


            return res.status(200).json({

                message:
                    "Login OTP sent successfully",

                requiresOTP: true,

                email: user.email,

                userId: user._id,

            });
        }


        // ---------------------------------------------
        // NORMAL LOGIN
        // ---------------------------------------------

        await LoginHistory.create({

            user: user._id,

            browser,

            operatingSystem,

            deviceType,

            ipAddress,

            loginStatus: "success",

        });


        const token = jwt.sign(

            {
                id: user._id,
                role: user.role,
            },

            process.env.JWT_SECRET,

            {
                expiresIn: "7d",
            }

        );


        return res.status(200).json({

            message: "Login successful",

            token,

            user: {

                id: user._id,

                name: user.name,

                email: user.email,

                role: user.role,

            },

        });

    } catch (error) {

        console.error(
            "Login Error:",
            error
        );

        return res.status(500).json({
            message: error.message,
        });
    }
};


//verify login otp

export const verifyLoginOTP = async (req, res) => {
    try {
        const { userId, email, otp } = req.body;

        console.log("========== VERIFY LOGIN OTP ==========");
        console.log("userId:", userId);
        console.log("email:", email);
        console.log("otp:", otp);

        if ((!userId && !email) || !otp) {
            return res.status(400).json({
                message: "User ID/Email and OTP are required",
            });
        }

        // Find latest unverified OTP
        let otpRecord;

        if (userId) {
            otpRecord = await LoginOtp.findOne({
                userId: userId,
                otp: String(otp).trim(),
                verified: false,
            }).sort({ createdAt: -1 });
        } else {
            otpRecord = await LoginOtp.findOne({
                email: email.trim(),
                otp: String(otp).trim(),
                verified: false,
            }).sort({ createdAt: -1 });
        }

        console.log("OTP RECORD:", otpRecord);

        if (!otpRecord) {
            return res.status(400).json({
                message: "Invalid OTP",
            });
        }

        // Check expiry
        if (new Date() > new Date(otpRecord.expiresAt)) {
            await LoginOtp.findByIdAndDelete(otpRecord._id);

            return res.status(400).json({
                message: "OTP has expired",
            });
        }

        // Find user
        const user = await User.findById(otpRecord.userId);

        console.log("USER:", user);

        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        // Mark OTP verified
        otpRecord.verified = true;
        await otpRecord.save();

        // Get login information
        const {
            browser,
            operatingSystem,
            deviceType,
            ipAddress,
        } = getLoginInfo(req);

        // Save login history
        await LoginHistory.create({
            user: user._id,
            browser,
            operatingSystem,
            deviceType,
            ipAddress,
            loginStatus: "success",
        });

        // Generate JWT
        const token = jwt.sign(
            {
                id: user._id,
                role: user.role,
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d",
            }
        );

        console.log("OTP VERIFIED");
        console.log("USER ROLE:", user.role);

        return res.status(200).json({
            message: "Login OTP verified successfully",

            token,

            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });

    } catch (error) {
        console.error("Verify Login OTP Error:", error);

        return res.status(500).json({
            message: "OTP verification failed",
            error: error.message,
        });
    }
};


// =====================================================
// GOOGLE LOGIN
// =====================================================


export const googleLogin = async (req, res) => {
    try {
        console.log("========== GOOGLE LOGIN START ==========");

        const { credential } = req.body;

        console.log("1. Credential received:", !!credential);

        if (!credential) {
            return res.status(400).json({
                message: "Google credential is required",
            });
        }

        // =================================================
        // GET LOGIN INFORMATION
        // =================================================

        const {
            browser,
            operatingSystem,
            deviceType,
            ipAddress,
        } = getLoginInfo(req);

        console.log("2. Login Info:", {
            browser,
            operatingSystem,
            deviceType,
            ipAddress,
        });

        // =================================================
        // MOBILE TIME RESTRICTION
        // =================================================

        if (deviceType === "mobile") {
            const allowedTime = checkMobileLoginTime();

            console.log(
                "3. Mobile login allowed:",
                allowedTime
            );

            if (!allowedTime) {
                return res.status(403).json({
                    message:
                        "Mobile login is allowed only between 10:00 AM and 1:00 PM IST",
                });
            }
        }

        // =================================================
        // VERIFY GOOGLE TOKEN
        // =================================================

        console.log(
            "4. Starting Google token verification..."
        );

        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        console.log(
            "5. Google token verification completed"
        );

        const payload = ticket.getPayload();

        if (!payload) {
            return res.status(400).json({
                message: "Invalid Google token payload",
            });
        }

        const {
            email,
            name,
            picture,
        } = payload;

        console.log("6. Google user:", {
            email,
            name,
        });

        if (!email) {
            return res.status(400).json({
                message:
                    "Google account email could not be obtained",
            });
        }

        // =================================================
        // FIND USER
        // =================================================

        console.log(
            "7. Searching user in MongoDB..."
        );

        let user = await User.findOne({
            email,
        });

        console.log(
            "8. User search completed:",
            !!user
        );

        // =================================================
        // CREATE USER
        // =================================================

        if (!user) {
            console.log(
                "9. User does not exist. Creating user..."
            );

            user = await User.create({
                name,
                email,
                profilePhoto: picture,
            });

            console.log(
                "10. User created:",
                user._id.toString()
            );
        } else {
            console.log(
                "9. Existing user:",
                user._id.toString()
            );
        }

        // =================================================
        // CHROME → OTP
        // =================================================

        if (browser === "Google Chrome") {
            console.log(
                "11. Chrome detected → OTP required"
            );

            const otp = Math.floor(
                100000 +
                Math.random() * 900000
            ).toString();

            const expiresAt = new Date(
                Date.now() + 5 * 60 * 1000
            );

            // ---------------------------------------------
            // DELETE PREVIOUS OTP
            // ---------------------------------------------

            console.log(
                "12. Deleting previous OTP..."
            );

            await LoginOtp.deleteMany({
                userId: user._id,
                email: user.email,
            });

            console.log(
                "13. Previous OTP deleted"
            );

            // ---------------------------------------------
            // CREATE OTP
            // ---------------------------------------------

            console.log(
                "14. Creating new OTP..."
            );

            await LoginOtp.create({
                userId: user._id,
                email: user.email,
                otp,
                expiresAt,
                verified: false,
            });

            console.log(
                "15. OTP created successfully"
            );

            // ---------------------------------------------
            // SEND EMAIL
            // ---------------------------------------------

            console.log(
                "16. Sending OTP email..."
            );

            const emailSent = await sendOTPEmail(
                user.email,
                otp
            );

            console.log(
                "17. OTP email result:",
                emailSent
            );

            if (!emailSent) {
                return res.status(500).json({
                    message:
                        "Failed to send login OTP",
                });
            }

            console.log(
                "18. Sending OTP response to frontend"
            );

            return res.status(200).json({
                message:
                    "Login OTP sent successfully",

                requiresOTP: true,

                email: user.email,

                userId: user._id,
            });
        }

        // =================================================
        // NORMAL GOOGLE LOGIN
        // =================================================

        console.log(
            "11. Non-Chrome browser → normal login"
        );

        await LoginHistory.create({
            user: user._id,
            browser,
            operatingSystem,
            deviceType,
            ipAddress,
            loginStatus: "success",
        });

        console.log(
            "12. Login history saved"
        );

        // =================================================
        // JWT
        // =================================================

        const token = jwt.sign(
            {
                id: user._id,
                role: user.role,
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d",
            }
        );

        console.log(
            "13. JWT generated"
        );

        console.log(
            "========== GOOGLE LOGIN SUCCESS =========="
        );

        return res.status(200).json({
            message: "Google login successful",

            token,

            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });

    } catch (error) {
        console.error(
            "========== GOOGLE LOGIN ERROR =========="
        );

        console.error(
            "Google Login Error:",
            error
        );

        return res.status(500).json({
            message: "Google login failed",
            error: error.message,
        });
    }
};


// export const googleLogin = async (req, res) => {

//     try {

//         const {
//             credential,
//         } = req.body;


//         if (!credential) {

//             return res.status(400).json({

//                 message:
//                     "Google credential is required",

//             });
//         }


//         // ---------------------------------------------
//         // Get Login Information
//         // ---------------------------------------------

//         const {
//             browser,
//             operatingSystem,
//             deviceType,
//             ipAddress,
//         } = getLoginInfo(req);


//         // ---------------------------------------------
//         // Mobile Time Restriction
//         // ---------------------------------------------

//         if (deviceType === "mobile") {

//             const allowedTime =
//                 checkMobileLoginTime();


//             if (!allowedTime) {

//                 return res.status(403).json({

//                     message:
//                         "Mobile login is allowed only between 10:00 AM and 1:00 PM IST",

//                 });
//             }
//         }


//         // ---------------------------------------------
//         // Verify Google Token
//         // ---------------------------------------------

//         const ticket =
//             await client.verifyIdToken({

//                 idToken: credential,

//                 audience:
//                     process.env.GOOGLE_CLIENT_ID,

//             });


//         const payload =
//             ticket.getPayload();


//         const {
//             email,
//             name,
//             picture,
//         } = payload;


//         // ---------------------------------------------
//         // Find User
//         // ---------------------------------------------

//         let user =
//             await User.findOne({
//                 email,
//             });


//         // ---------------------------------------------
//         // Create User if not exists
//         // ---------------------------------------------

//         if (!user) {

//             user = await User.create({

//                 name,

//                 email,

//                 profilePhoto:
//                     picture,

//             });
//         }


//         // ---------------------------------------------
//         // Chrome → OTP
//         // ---------------------------------------------

//         if (browser === "Google Chrome") {

//             const otp = Math.floor(

//                 100000 +
//                 Math.random() * 900000

//             ).toString();


//             const expiresAt =
//                 new Date(
//                     Date.now() +
//                     5 * 60 * 1000
//                 );


//             await LoginOtp.deleteMany({

//                 userId: user._id,

//                 email: user.email,

//             });


//             await LoginOtp.create({

//                 userId: user._id,

//                 email: user.email,

//                 otp,

//                 expiresAt,

//                 verified: false,

//             });


//             const emailSent =
//                 await sendOTPEmail(
//                     user.email,
//                     otp
//                 );


//             if (!emailSent) {

//                 return res.status(500).json({

//                     message:
//                         "Failed to send login OTP",

//                 });
//             }


//             return res.status(200).json({

//                 message:
//                     "Login OTP sent successfully",

//                 requiresOTP: true,

//                 email: user.email,

//                 userId: user._id,

//             });
//         }


//         // ---------------------------------------------
//         // Normal Google Login
//         // ---------------------------------------------

//         await LoginHistory.create({

//             user: user._id,

//             browser,

//             operatingSystem,

//             deviceType,

//             ipAddress,

//             loginStatus: "success",

//         });


//         const token = jwt.sign(

//             {
//                 id: user._id,
//                 role: user.role,
//             },

//             process.env.JWT_SECRET,

//             {
//                 expiresIn: "7d",
//             }

//         );


//         return res.status(200).json({

//             message:
//                 "Google login successful",

//             token,

//             user: {

//                 id: user._id,

//                 name: user.name,

//                 email: user.email,

//                 role: user.role,

//             },

//         });

//     } catch (error) {

//         console.error(
//             "Google Login Error:",
//             error
//         );

//         return res.status(500).json({

//             message:
//                 "Google login failed",

//         });
//     }
// };

// =====================================================
// GET ALL USERS LOGIN HISTORY (ADMIN ONLY)
// =====================================================

export const getAllUsersLoginHistory = async (req, res) => {
    try {
        const loginHistory = await LoginHistory.find({})
            .populate("user", "name email role") // युजरचे नाव आणि ईमेल मिळवण्यासाठी
            .sort({ loginTime: -1 })
            .select("user browser operatingSystem deviceType ipAddress loginStatus loginTime");

        return res.status(200).json({
            count: loginHistory.length,
            loginHistory,
        });

    } catch (error) {
        console.error("Get All Users Login History Error:", error);
        return res.status(500).json({
            message: "Something went wrong",
        });
    }
};


// =====================================================
// FORGOT PASSWORD
// =====================================================

export const forgotPassword = async (req, res) => {
    try {

        console.log("FORGOT PASSWORD BODY:", req.body);

        const { identifier } = req.body;

        if (!identifier || !identifier.trim()) {
            return res.status(400).json({
                message: "Email or phone is required"
            });
        }

        const value = identifier.trim();

        const user = await User.findOne({
            $or: [
                { email: value },
                { phone: value }
            ]
        });

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        if (user.lastPasswordResetAt) {

            const lastReset =
                new Date(user.lastPasswordResetAt).getTime();

            const now = Date.now();

            const twentyFourHours =
                24 * 60 * 60 * 1000;

            const timePassed =
                now - lastReset;

            if (timePassed < twentyFourHours) {

                return res.status(429).json({
                    message:
                        "You can reset your password only once every 24 hours."
                });
            }
        }

        const characters =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        let newPassword = "";

        for (let i = 0; i < 6; i++) {

            newPassword +=
                characters[
                    Math.floor(
                        Math.random() * characters.length
                    )
                ];
        }

        const hashedPassword =
            await bcrypt.hash(
                newPassword,
                10
            );

        const emailSent =
            await sendForgotPasswordEmail(
                user.email,
                newPassword
            );

        if (!emailSent) {

            return res.status(500).json({
                message:
                    "Failed to send password email"
            });
        }

        user.password = hashedPassword;
        user.lastPasswordResetAt = new Date();

        await user.save();

        return res.status(200).json({
            message:
                "New password sent successfully"
        });

    } catch (error) {

        console.error(
            "Forgot Password Error:",
            error
        );

        return res.status(500).json({
            message:
                "Something went wrong"
        });
    }
};


// =====================================================
// GET ALL USERS
// =====================================================

export const getAllUsers = async (req, res) => {

    try {

        const users =
            await User.find()
                .select("-password");


        return res.status(200).json({

            count: users.length,

            users,

        });

    } catch (error) {

        console.error(
            "Get All Users Error:",
            error
        );

        return res.status(500).json({

            message:
                "Something went wrong",

        });
    }
};


// =====================================================
// GET MY LOGIN HISTORY
// =====================================================

export const getMyLoginHistory = async (req, res) => {
    try {
        const userId = req.user.id;

        const loginHistory = await LoginHistory.find({
            user: userId,
        })
            .sort({ loginTime: -1 })
            .select(
                "browser operatingSystem deviceType ipAddress loginStatus loginTime"
            );

        return res.status(200).json({
            count: loginHistory.length,
            loginHistory,
        });

    } catch (error) {
        console.error(
            "Get My Login History Error:",
            error
        );

        return res.status(500).json({
            message: "Something went wrong",
        });
    }
};

