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


// =====================================================
// VERIFY LOGIN OTP
// =====================================================

export const verifyLoginOTP = async (req, res) => {

    try {

        const {
            userId,
            otp,
        } = req.body;


        if (!userId || !otp) {

            return res.status(400).json({

                message:
                    "User ID and OTP are required",

            });
        }


        // ---------------------------------------------
        // Find OTP
        // ---------------------------------------------

        const otpRecord =
            await LoginOtp.findOne({

                userId,

                otp,

                verified: false,

            }).sort({
                createdAt: -1,
            });


        if (!otpRecord) {

            return res.status(400).json({

                message: "Invalid OTP",

            });
        }


        // ---------------------------------------------
        // Check Expiry
        // ---------------------------------------------

        if (
            otpRecord.expiresAt <
            new Date()
        ) {

            await LoginOtp.findByIdAndDelete(
                otpRecord._id
            );


            return res.status(400).json({

                message:
                    "OTP has expired",

            });
        }


        // ---------------------------------------------
        // Mark OTP Verified
        // ---------------------------------------------

        otpRecord.verified = true;

        await otpRecord.save();


        // ---------------------------------------------
        // Get User
        // ---------------------------------------------

        const user = await User.findById(
            userId
        );


        if (!user) {

            return res.status(404).json({

                message: "User not found",

            });
        }


        // ---------------------------------------------
        // Get Login Information
        // ---------------------------------------------

        const {
            browser,
            operatingSystem,
            deviceType,
            ipAddress,
        } = getLoginInfo(req);


        // ---------------------------------------------
        // Save Successful Login
        // ---------------------------------------------

        await LoginHistory.create({

            user: user._id,

            browser,

            operatingSystem,

            deviceType,

            ipAddress,

            loginStatus: "success",

        });


        // ---------------------------------------------
        // Generate JWT
        // ---------------------------------------------

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

            message:
                "Login OTP verified successfully",

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
            "Verify Login OTP Error:",
            error
        );

        return res.status(500).json({

            message:
                "OTP verification failed",

        });
    }
};


// =====================================================
// GOOGLE LOGIN
// =====================================================

export const googleLogin = async (req, res) => {

    try {

        const {
            credential,
        } = req.body;


        if (!credential) {

            return res.status(400).json({

                message:
                    "Google credential is required",

            });
        }


        // ---------------------------------------------
        // Get Login Information
        // ---------------------------------------------

        const {
            browser,
            operatingSystem,
            deviceType,
            ipAddress,
        } = getLoginInfo(req);


        // ---------------------------------------------
        // Mobile Time Restriction
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
        // Verify Google Token
        // ---------------------------------------------

        const ticket =
            await client.verifyIdToken({

                idToken: credential,

                audience:
                    process.env.GOOGLE_CLIENT_ID,

            });


        const payload =
            ticket.getPayload();


        const {
            email,
            name,
            picture,
        } = payload;


        // ---------------------------------------------
        // Find User
        // ---------------------------------------------

        let user =
            await User.findOne({
                email,
            });


        // ---------------------------------------------
        // Create User if not exists
        // ---------------------------------------------

        if (!user) {

            user = await User.create({

                name,

                email,

                profilePhoto:
                    picture,

            });
        }


        // ---------------------------------------------
        // Chrome → OTP
        // ---------------------------------------------

        if (browser === "Google Chrome") {

            const otp = Math.floor(

                100000 +
                Math.random() * 900000

            ).toString();


            const expiresAt =
                new Date(
                    Date.now() +
                    5 * 60 * 1000
                );


            await LoginOtp.deleteMany({

                userId: user._id,

                email: user.email,

            });


            await LoginOtp.create({

                userId: user._id,

                email: user.email,

                otp,

                expiresAt,

                verified: false,

            });


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
        // Normal Google Login
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

            message:
                "Google login successful",

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
            "Google Login Error:",
            error
        );

        return res.status(500).json({

            message:
                "Google login failed",

        });
    }
};

export const forgotPassword = async (req, res) => {
    try {

        console.log("FORGOT PASSWORD BODY:", req.body);

        const { identifier } = req.body;

        // -------------------------------------------------
        // CHECK EMAIL / PHONE
        // -------------------------------------------------

        if (!identifier || !identifier.trim()) {
            return res.status(400).json({
                message: "Email or phone is required"
            });
        }

        const value = identifier.trim();

        // -------------------------------------------------
        // FIND USER
        // -------------------------------------------------

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

        console.log("User:", user.email);
        console.log(
            "Last Password Reset:",
            user.lastPasswordResetAt
        );

        // -------------------------------------------------
        // CHECK 24 HOURS LIMIT
        // -------------------------------------------------

        if (user.lastPasswordResetAt) {

            const lastReset =
                new Date(user.lastPasswordResetAt).getTime();

            const now = Date.now();

            const twentyFourHours =
                24 * 60 * 60 * 1000;

            const timePassed =
                now - lastReset;

            console.log(
                "Hours since last reset:",
                timePassed / (1000 * 60 * 60)
            );

            // Less than 24 hours
            if (timePassed < twentyFourHours) {

                return res.status(429).json({
                    message:
                        "You can reset your password only once every 24 hours."
                });
            }
        }

        // -------------------------------------------------
        // GENERATE NEW PASSWORD
        // -------------------------------------------------

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

        // -------------------------------------------------
        // HASH PASSWORD
        // -------------------------------------------------

        const hashedPassword =
            await bcrypt.hash(
                newPassword,
                10
            );

        // -------------------------------------------------
        // SEND PASSWORD EMAIL
        // -------------------------------------------------

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

        // -------------------------------------------------
        // UPDATE PASSWORD
        // -------------------------------------------------

        user.password =
            hashedPassword;

        // IMPORTANT:
        // Same field used in limit check
        user.lastPasswordResetAt =
            new Date();

        await user.save();

        console.log(
            "Password reset time saved:",
            user.lastPasswordResetAt
        );

        // -------------------------------------------------
        // SUCCESS
        // -------------------------------------------------

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

// import User from "../models/User.js";
// import LoginHistory from "../models/LoginHistory.js";
// import LoginOtp from "../models/LoginOtp.js";
// import { sendOTPEmail } from "../services/emailService.js";
// import bcrypt from "bcrypt";
// import jwt from "jsonwebtoken";
// import { OAuth2Client } from "google-auth-library";
// import { sendForgotPasswordEmail } from "../services/emailService.js";

// const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


// // =====================================================
// // GET LOGIN INFORMATION
// // =====================================================

// const getLoginInfo = (req) => {
//     const userAgent = req.headers["user-agent"] || "unknown";

//     let browser = "unknown";
//     let operatingSystem = "unknown";
//     let deviceType = "unknown";

//     // -------------------------------------------------
//     // BROWSER DETECTION
//     // -------------------------------------------------

//     if (userAgent.includes("Edg")) {
//         browser = "Microsoft Edge";
//     } else if (userAgent.includes("Chrome")) {
//         browser = "Google Chrome";
//     } else if (userAgent.includes("Firefox")) {
//         browser = "Mozilla Firefox";
//     } else if (userAgent.includes("Safari")) {
//         browser = "Safari";
//     }

//     // -------------------------------------------------
//     // OPERATING SYSTEM DETECTION
//     // -------------------------------------------------

//     if (userAgent.includes("Windows")) {
//         operatingSystem = "Windows";
//     } else if (userAgent.includes("Mac OS")) {
//         operatingSystem = "Mac OS";
//     } else if (userAgent.includes("Android")) {
//         operatingSystem = "Android";
//     } else if (
//         userAgent.includes("iPhone") ||
//         userAgent.includes("iPad")
//     ) {
//         operatingSystem = "iOS";
//     } else if (userAgent.includes("Linux")) {
//         operatingSystem = "Linux";
//     }

//     // -------------------------------------------------
//     // DEVICE TYPE DETECTION
//     // -------------------------------------------------

//     if (/Mobile|Android|iPhone|iPad/i.test(userAgent)) {
//         deviceType = "mobile";
//     } else {
//         // Browser cannot reliably distinguish
//         // desktop from laptop using User-Agent alone.
//         deviceType = "desktop";
//     }

//     // -------------------------------------------------
//     // IP ADDRESS
//     // -------------------------------------------------

//     const ipAddress =
//         req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
//         req.socket.remoteAddress ||
//         "Unknown";

//     return {
//         browser,
//         operatingSystem,
//         deviceType,
//         ipAddress,
//     };
// };


// // =====================================================
// // REGISTER
// // =====================================================

// export const register = async (req, res) => {
//     try {

//         const { name, email, password } = req.body;

//         const existingUser = await User.findOne({ email });

//         if (existingUser) {
//             return res.status(400).json({
//                 message: "User already exists",
//             });
//         }

//         const hashedPassword = await bcrypt.hash(password, 10);

//         const newUser = await User.create({
//             name,
//             email,
//             password: hashedPassword,
//             role: "student",
//         });

//         return res.status(201).json({
//             message: "User registered successfully",
//             user: newUser,
//         });

//     } catch (error) {

//         console.error("Register Error:", error);

//         return res.status(500).json({
//             message: error.message,
//         });
//     }
// };


// // =====================================================
// // LOGIN
// // =====================================================

// export const login = async (req, res) => {
//     try {

//         const { email, password } = req.body;

//         // -------------------------------------------------
//         // FIND USER
//         // -------------------------------------------------

//         const user = await User.findOne({ email });

//         if (!user) {
//             return res.status(404).json({
//                 message: "User not found",
//             });
//         }

//         // -------------------------------------------------
//         // CHECK PASSWORD
//         // -------------------------------------------------

//         const isMatch = await bcrypt.compare(
//             password,
//             user.password
//         );

//         if (!isMatch) {
//             return res.status(400).json({
//                 message: "Invalid password",
//             });
//         }

//         // -------------------------------------------------
//         // GET LOGIN INFORMATION
//         // -------------------------------------------------

//         const {
//             browser,
//             operatingSystem,
//             deviceType,
//             ipAddress,
//         } = getLoginInfo(req);

//         if (browser === "Google Chrome"){
//             const otp = Math.floor(
//                 100000 + Math.random() * 900000
//             ).toString();

//             const expiresAt = new Date(
//                 Date.now() + 5 * 60 * 1000
//             );

//             //Remove old login OTP
//             await LoginOtp.deleteMany({
//                 userId: user._id,
//                 email: user.email,
//             });

//             //save new otp
//             await LoginOtp.create({
//                 userId: user._id,
//                 email: user.email,
//                 otp,
//                 expiresAt,
//                 verified: false,
//             });

//             const emailSent = await sendOTPEmail(
//                 user.email,
//                 otp
//             );

//             if (!emailSent) {
//                 return res.status(500).json({
//                     message: "Failed to send login OTP ",
//                 });
//             }

//             return res.status(200).json({
//                 message: "Login OTP sent successfully",
//                 requiresOTP: true,
//                 email: user.email,
//             });
//         }

//         // -------------------------------------------------
//         // SAVE LOGIN HISTORY
//         // -------------------------------------------------

//         await LoginHistory.create({
//             user: user._id,
//             browser,
//             operatingSystem,
//             deviceType,
//             ipAddress,
//             loginStatus: "success",
//         });

//         // -------------------------------------------------
//         // GENERATE JWT
//         // -------------------------------------------------

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

//         // -------------------------------------------------
//         // SUCCESS RESPONSE
//         // -------------------------------------------------

//         return res.status(200).json({
//             message: "Login successful",
//             token,
//             user: {
//                 id: user._id,
//                 name: user.name,
//                 email: user.email,
//                 role: user.role,
//             },
//         });

//     } catch (error) {

//         console.error("Login Error:", error);

//         return res.status(500).json({
//             message: error.message,
//         });
//     }
// };


// // =====================================================
// // VERIFY LOGIN OTP
// // =====================================================

// export const verifyLoginOTP = async (req, res) => {
//     try {
//         const { userId, otp } = req.body;

//         if (!userId || !otp) {
//             return res.status(400).json({
//                 message: "User ID and OTP are required",
//             });
//         }

//         const otpRecord = await LoginOtp.findOne({
//             userId,
//             otp: otp.toString(),
//             verified: false,
//         }).sort({ createdAt: -1 });

//         if (!otpRecord) {
//             return res.status(400).json({
//                 message: "Invalid OTP",
//             });
//         }

//         // Check OTP expiry
//         if (otpRecord.expiresAt < new Date()) {
//             await LoginOtp.findByIdAndDelete(otpRecord._id);

//             return res.status(400).json({
//                 message: "OTP has expired",
//             });
//         }

//         // Mark OTP as verified
//         otpRecord.verified = true;
//         await otpRecord.save();

//         // Get user
//         const user = await User.findById(userId);

//         if (!user) {
//             return res.status(404).json({
//                 message: "User not found",
//             });
//         }

//         // Get login information
//         const {
//             browser,
//             operatingSystem,
//             deviceType,
//             ipAddress,
//         } = getLoginInfo(req);

//         // Save successful login
//         await LoginHistory.create({
//             user: user._id,
//             browser,
//             operatingSystem,
//             deviceType,
//             ipAddress,
//             loginStatus: "success",
//         });

//         // Generate JWT
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
//             message: "Login successful",
//             token,
//             user: {
//                 id: user._id,
//                 name: user.name,
//                 email: user.email,
//                 role: user.role,
//             },
//         });

//     } catch (error) {
//         console.error("Verify Login OTP Error:", error);

//         return res.status(500).json({
//             message: "OTP verification failed",
//         });
//     }
// };



// // =====================================================
// // GOOGLE LOGIN
// // =====================================================

// export const googleLogin = async (req, res) => {
//     try {

//         const { credential } = req.body;

//         if (!credential) {
//             return res.status(400).json({
//                 message: "Google credential is required",
//             });
//         }

//         // -------------------------------------------------
//         // VERIFY GOOGLE TOKEN
//         // -------------------------------------------------

//         const ticket = await client.verifyIdToken({
//             idToken: credential,
//             audience: process.env.GOOGLE_CLIENT_ID,
//         });

//         const payload = ticket.getPayload();

//         const { name, email } = payload;

//         // -------------------------------------------------
//         // FIND OR CREATE USER
//         // -------------------------------------------------

//         let user = await User.findOne({ email });

//         if (!user) {

//             user = await User.create({
//                 name,
//                 email,
//                 role: "student",
//             });
//         }

//         // -------------------------------------------------
//         // GENERATE JWT
//         // -------------------------------------------------

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
//             message: "Google Login Successful",
//             token,
//             user: {
//                 id: user._id,
//                 name: user.name,
//                 email: user.email,
//                 role: user.role,
//             },
//         });

//     } catch (error) {

//         console.error("Google Login Error:", error);

//         return res.status(500).json({
//             message: error.message,
//         });
//     }
// };


// // =====================================================
// // FORGOT PASSWORD
// // =====================================================

// export const forgotPassword = async (req, res) => {

//     try {

//         const { identifier } = req.body;

//         // -------------------------------------------------
//         // CHECK EMAIL / PHONE
//         // -------------------------------------------------

//         if (!identifier || !identifier.trim()) {

//             return res.status(400).json({
//                 message: "Email or phone number is required",
//             });
//         }

//         const value = identifier.trim();

//         // -------------------------------------------------
//         // FIND USER
//         // -------------------------------------------------

//         const user = await User.findOne({
//             $or: [
//                 { email: value },
//                 { phone: value },
//             ],
//         });

//         if (!user) {

//             return res.status(404).json({
//                 message: "User not found",
//             });
//         }

//         console.log("🔍 Identifier:", value);
//         console.log("🔍 User Email from DB:", user.email);
//         console.log("📤 Sending email to:", user.email);

//         // -------------------------------------------------
//         // CHECK PASSWORD RESET LIMIT
//         // -------------------------------------------------

//         if (user.lastPasswordResetAt) {

//             const lastReset =
//                 new Date(user.lastPasswordResetAt);

//             const now = new Date();

//             const sameDay =
//                 lastReset.getFullYear() === now.getFullYear() &&
//                 lastReset.getMonth() === now.getMonth() &&
//                 lastReset.getDate() === now.getDate();

//             if (sameDay) {

//                 if ((user.passwordResetCount || 0) >= 1) {

//                     return res.status(429).json({
//                         message:
//                             "You can use this option only 1 times per day.",
//                     });
//                 }

//             } else {

//                 user.passwordResetCount = 0;
//             }
//         }

//         // -------------------------------------------------
//         // GENERATE NEW PASSWORD
//         // -------------------------------------------------

//         const generatePassword = (length = 10) => {

//             const characters =
//                 "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

//             let password = "";

//             for (let i = 0; i < length; i++) {

//                 const randomIndex =
//                     Math.floor(
//                         Math.random() * characters.length
//                     );

//                 password += characters[randomIndex];
//             }

//             return password;
//         };

//         const newPassword = generatePassword(10);

//         // -------------------------------------------------
//         // HASH PASSWORD
//         // -------------------------------------------------

//         const hashedPassword =
//             await bcrypt.hash(newPassword, 10);

//         // -------------------------------------------------
//         // SEND EMAIL FIRST
//         // -------------------------------------------------

//         const emailSent =
//             await sendForgotPasswordEmail(
//                 user.email,
//                 newPassword
//             );

//         // -------------------------------------------------
//         // IF EMAIL FAILED
//         // -------------------------------------------------

//         if (!emailSent) {

//             return res.status(500).json({
//                 message:
//                     "Failed to send forgot password email. Please try again.",
//             });
//         }

//         // -------------------------------------------------
//         // SAVE NEW PASSWORD
//         // -------------------------------------------------

//         user.password = hashedPassword;

//         user.lastPasswordResetAt = new Date();

//         user.passwordResetCount =
//             (user.passwordResetCount || 0) + 1;

//         await user.save();

//         // -------------------------------------------------
//         // SUCCESS RESPONSE
//         // -------------------------------------------------

//         return res.status(200).json({
//             message:
//                 "New password generated successfully",
//         });

//     } catch (error) {

//         console.error(
//             "Forgot Password Error:",
//             error
//         );

//         return res.status(500).json({
//             message:
//                 "Something went wrong. Please try again.",
//         });
//     }
// };


// // =====================================================
// // GET ALL USERS
// // =====================================================

// export const getAllUsers = async (req, res) => {

//     try {

//         const currentUserId = req.user.id;

//         const users = await User.find({
//             _id: { $ne: currentUserId },
//         }).select("-password");

//         return res.status(200).json({
//             count: users.length,
//             users,
//         });

//     } catch (error) {

//         console.error(
//             "Get All Users Error:",
//             error
//         );

//         return res.status(500).json({
//             message:
//                 "Something went wrong. Please try again.",
//         });
//     }
// };



// // import User from "../models/User.js";
// // import LoginHistory from "../models/LoginHistory.js";
// // import bcrypt from "bcrypt";
// // import jwt from "jsonwebtoken";
// // import { OAuth2Client } from "google-auth-library";
// // import { sendForgotPasswordEmail } from "../services/emailService.js";

// // const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// // const getLoginInfo = (req) => {
// //     const userAgent = req.headers['user-agent'] || 'unknown';

// //     let browser = "unknown";
// //     let operatingSystem = "unknown";
// //     let deviceType = "unknown";

// //     if(userAgent.includes("Edg")) {
// //         browser = "Microsoft Edge";
// //     } else if (userAgent.includes("Chrome")){
// //         browser = "Google Chrome";
// //     } else if (userAgent.includes("firefox")) {
// //         browser = "Mozilla Firefox";
// //     } else if (userAgent.includes("safari")) {
// //         browser = " Safari";
// //     }

// //     //oprating System detect 
// //     if(userAgent.includes("Windows")) {
// //         operatingSystem = "Windows";
// //     } else if (userAgent.includes("Mac OS")){
// //         operatingSystem = "Mac OS";
// //     } else if (userAgent.includes("Android")){
// //         operatingSystem = "Android";
// //     } else if (userAgent.includes("Linux")){
// //         operatingSystem = "Linux";
// //     }

// //     //device type detect
// //     if (/Mobile|Android|iPhone|iPad/i.test(userAgent)){
// //         deviceType = "mobile";
// //     } else if(userAgent.includes("windows")){
// //         deviceType = "desktop";
// //     } else if(userAgent.includes("Mac")){
// //         deviceType = "desktop";
// //     }

// //     const ipAddress =
// //         req.headers["x-forwarded-for"]?.split(",")[0] ||
// //          req.socket.remoteAddress ||
// //          "Unknown";

// //     return {
// //         browser,
// //         operatingSystem,
// //         deviceType,
// //         ipAddress
// //     };
// // };


// // // =====================================================
// // // REGISTER
// // // =====================================================

// // export const register = async (req, res) => {
// //     try {

// //         const { name, email, password } = req.body;

// //         const existingUser = await User.findOne({ email });

// //         if (existingUser) {
// //             return res.status(400).json({
// //                 message: "User already exists"
// //             });
// //         }

// //         const hashedPassword = await bcrypt.hash(password, 10);

// //         const newUser = await User.create({
// //             name,
// //             email,
// //             password: hashedPassword,
// //             role: "student"
// //         });

// //         return res.status(201).json({
// //             message: "User registered successfully",
// //             user: newUser
// //         });

// //     } catch (error) {

// //         console.error("Register Error:", error);

// //         return res.status(500).json({
// //             message: error.message
// //         });
// //     }
// // };


// // // =====================================================
// // // LOGIN
// // // =====================================================

// // export const login = async (req, res) => {
// //     try {

// //         const { email, password } = req.body;

// //         const user = await User.findOne({ email });

// //         if (!user) {
// //             return res.status(404).json({
// //                 message: "User not found"
// //             });
// //         }

// //         const isMatch = await bcrypt.compare(
// //             password,
// //             user.password
// //         );

// //         if (!isMatch) {
// //             return res.status(400).json({
// //                 message: "Invalid password"
// //             });
// //         }

// //         const {
// //     browser,
// //     operatingSystem,
// //     deviceType,
// //     ipAddress,
// // } = getLoginInfo(req);

// // await LoginHistory.create({
// //     user: user._id,
// //     browser,
// //     operatingSystem,
// //     deviceType,
// //     ipAddress,
// //     loginStatus: "success",
// // });

// //         const token = jwt.sign(
// //             {
// //                 id: user._id,
// //                 role: user.role
// //             },
// //             process.env.JWT_SECRET,
// //             {
// //                 expiresIn: "7d"
// //             }
// //         );

// //         return res.status(200).json({
// //             message: "Login successful",
// //             token,
// //             user: {
// //                 id: user._id,
// //                 name: user.name,
// //                 email: user.email,
// //                 role: user.role
// //             }
// //         });

// //     } catch (error) {

// //         console.error("Login Error:", error);

// //         return res.status(500).json({
// //             message: error.message
// //         });
// //     }
// // };


// // // =====================================================
// // // GOOGLE LOGIN
// // // =====================================================

// // export const googleLogin = async (req, res) => {
// //     try {

// //         const { credential } = req.body;

// //         if (!credential) {
// //             return res.status(400).json({
// //                 message: "Google credential is required"
// //             });
// //         }

// //         const ticket = await client.verifyIdToken({
// //             idToken: credential,
// //             audience: process.env.GOOGLE_CLIENT_ID
// //         });

// //         const payload = ticket.getPayload();

// //         const { name, email } = payload;

// //         let user = await User.findOne({ email });

// //         if (!user) {

// //             user = await User.create({
// //                 name,
// //                 email,
// //                 role: "student"
// //             });
// //         }

// //         const token = jwt.sign(
// //             {
// //                 id: user._id,
// //                 role: user.role
// //             },
// //             process.env.JWT_SECRET,
// //             {
// //                 expiresIn: "7d"
// //             }
// //         );

// //         return res.status(200).json({
// //             message: "Google Login Successful",
// //             token,
// //             user: {
// //                 id: user._id,
// //                 name: user.name,
// //                 email: user.email,
// //                 role: user.role
// //             }
// //         });

// //     } catch (error) {

// //         console.error("Google Login Error:", error);

// //         return res.status(500).json({
// //             message: error.message
// //         });
// //     }
// // };


// // // =====================================================
// // // FORGOT PASSWORD
// // // =====================================================

// // export const forgotPassword = async (req, res) => {

// //     try {

// //         const { identifier } = req.body;


// //         // -------------------------------------------------
// //         // CHECK EMAIL / PHONE
// //         // -------------------------------------------------

// //         if (!identifier || !identifier.trim()) {

// //             return res.status(400).json({
// //                 message: "Email or phone number is required"
// //             });
// //         }


// //         const value = identifier.trim();


// //         // -------------------------------------------------
// //         // FIND USER
// //         // -------------------------------------------------

// //         const user = await User.findOne({
// //             $or: [
// //                 { email: value },
// //                 { phone: value }
// //             ]
// //         });


// //         if (!user) {

// //             return res.status(404).json({
// //                 message: "User not found"
// //             });
// //         }

// //         console.log("🔍 Identifier:", value);
// // console.log("🔍 User Email from DB:", user.email);
// // console.log("📤 Sending email to:", user.email);

// //    // -------------------------------------------------
// //         // CHECK PASSWORD RESET LIMIT
// //         // -------------------------------------------------

// //         if (user.lastPasswordResetAt) {

// //             const lastReset =
// //                 new Date(user.lastPasswordResetAt);

// //             const now = new Date();


// //             const sameDay =
// //                 lastReset.getFullYear() === now.getFullYear() &&
// //                 lastReset.getMonth() === now.getMonth() &&
// //                 lastReset.getDate() === now.getDate();


// //             if (sameDay) {

// //                 if ((user.passwordResetCount || 0) >= 1) {

// //                     return res.status(429).json({
// //                         message:
// //                             "You can use this option only 1 times per day."
// //                     });
// //                 }

// //             } else {

// //                 user.passwordResetCount = 0;
// //             }
// //         }


// //         // -------------------------------------------------
// //         // GENERATE NEW PASSWORD
// //         // -------------------------------------------------

// //         const generatePassword = (length = 10) => {

// //             const characters =
// //                 "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

// //             let password = "";

// //             for (let i = 0; i < length; i++) {

// //                 const randomIndex =
// //                     Math.floor(
// //                         Math.random() * characters.length
// //                     );

// //                 password += characters[randomIndex];
// //             }

// //             return password;
// //         };


// //         const newPassword = generatePassword(10);


// //         // -------------------------------------------------
// //         // HASH PASSWORD
// //         // -------------------------------------------------

// //         const hashedPassword =
// //             await bcrypt.hash(newPassword, 10);


// //         // -------------------------------------------------
// //         // SEND EMAIL FIRST
// //         // -------------------------------------------------

// //         const emailSent =
// //             await sendForgotPasswordEmail(
// //                 user.email,
// //                 newPassword
// //             );


// //         // -------------------------------------------------
// //         // IF EMAIL FAILED
// //         // -------------------------------------------------

// //         if (!emailSent) {

// //             return res.status(500).json({
// //                 message:
// //                     "Failed to send forgot password email. Please try again."
// //             });
// //         }


// //         // -------------------------------------------------
// //         // SAVE NEW PASSWORD
// //         // -------------------------------------------------

// //         user.password = hashedPassword;

// //         user.lastPasswordResetAt = new Date();

// //         user.passwordResetCount =
// //             (user.passwordResetCount || 0) + 1;


// //         await user.save();


// //         // -------------------------------------------------
// //         // SUCCESS RESPONSE
// //         // -------------------------------------------------

// //         return res.status(200).json({
// //             message:
// //                 "New password generated successfully"
// //         });


// //     } catch (error) {

// //         console.error(
// //             "Forgot Password Error:",
// //             error
// //         );

// //         return res.status(500).json({
// //             message:
// //                 "Something went wrong. Please try again."
// //         });
// //     }
// // };

// // export const getAllUsers = async (req, res) => {
// //     try  {
// //         const currentUserId = req.user.id;
// //         const users = await User.find({
// //             _id: { $ne: currentUserId }

// //         }).select("-password");
// //         return res.status(200).json({
// //             count: users.length,
// //             users
// //         });
// //     } catch (error) {
// //         console.error("Get All Users Error:", error);
// //         return res.status(500).json({
// //             message: "Something went wrong. Please try again."
// //         });
// //     }
// // };