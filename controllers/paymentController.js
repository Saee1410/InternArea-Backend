import "dotenv/config"; 
import Razorpay from "razorpay"; 
import crypto from "crypto"; 
 
import Resume from "../models/Resume.js"; 
import User from "../models/User.js"; 
import Subscription from "../models/Subscription.js"; 
 
import { 
  sendSubscriptionInvoiceEmail, 
} from "../services/emailService.js"; 
 
 
const razorpay = new Razorpay({ 
  key_id: process.env.RAZORPAY_KEY_ID, 
  key_secret: process.env.RAZORPAY_KEY_SECRET, 
}); 
 
 
// ========================================== 
// CREATE RESUME RAZORPAY ORDER 
// ========================================== 
 
export const createResumeOrder = async (req, res) => { 
  try { 
    const userId = req.user.id; 
 
    const resume = await Resume.findOne({ userId }); 
 
    if (!resume) { 
      return res.status(404).json({ 
        success: false, 
        message: "Resume not found", 
      }); 
    } 
 
    const options = { 
      amount: 5000, // ₹50 
      currency: "INR", 
      receipt: `receipt_${Date.now()}`, 
    }; 
 
    const order = await razorpay.orders.create(options); 
 
    return res.status(200).json({ 
      success: true, 
      order, 
      key: process.env.RAZORPAY_KEY_ID, 
    }); 
 
  } catch (error) { 
    console.error("Create Resume Order Error:", error); 
 
    return res.status(500).json({ 
      success: false, 
      message: "Unable to create payment order", 
    }); 
  } 
}; 
 
 
// ========================================== 
// VERIFY RESUME RAZORPAY PAYMENT 
// ========================================== 

export const verifyResumePayment = async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    console.log("========== RESUME PAYMENT VERIFY ==========");
    console.log("User ID:", userId);
    console.log("Order ID:", razorpay_order_id);
    console.log("Payment ID:", razorpay_payment_id);
    console.log("Signature:", razorpay_signature);

    // 1. Check required data
    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment details are missing",
      });
    }

    // 2. Generate signature
    const generatedSignature = crypto
      .createHmac(
        "sha256",
        process.env.RAZORPAY_KEY_SECRET
      )
      .update(
        `${razorpay_order_id}|${razorpay_payment_id}`
      )
      .digest("hex");

    console.log("Generated Signature:", generatedSignature);
    console.log("Received Signature:", razorpay_signature);

    // 3. Verify signature
    if (generatedSignature !== razorpay_signature) {
      console.log("❌ INVALID SIGNATURE");

      return res.status(400).json({
        success: false,
        message: "Invalid payment signature",
      });
    }

    console.log("✅ Signature verified");

    // 4. Find resume
    const resume = await Resume.findOne({ userId });

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: "Resume not found",
      });
    }

    console.log("Resume before update:", {
      id: resume._id,
      isPremium: resume.isPremium,
      paymentStatus: resume.paymentStatus,
    });

    // 5. Update payment information
    resume.isPremium = true;
    resume.paymentStatus = "paid";

    // Only add these if fields exist in Resume schema
    resume.razorpayOrderId = razorpay_order_id;
    resume.razorpayPaymentId = razorpay_payment_id;

    // 6. Save
    await resume.save();

    console.log("✅ RESUME UPDATED");
    console.log("Resume after update:", {
      id: resume._id,
      isPremium: resume.isPremium,
      paymentStatus: resume.paymentStatus,
    });

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      isPremium: true,
      paymentStatus: "paid",
      resumeId: resume._id,
    });

  } catch (error) {
    console.error(
      "❌ Verify Resume Payment Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to verify payment",
    });
  }
};
 
// export const verifyResumePayment = async (req, res) => { 
//   try { 
//     const userId = req.user.id; 
 
//     const { 
//       razorpay_order_id, 
//       razorpay_payment_id, 
//       razorpay_signature, 
//     } = req.body; 
 
 
//     // ------------------------------------------ 
//     // VERIFY SIGNATURE 
//     // ------------------------------------------ 
 
//     const generatedSignature = crypto 
//       .createHmac( 
//         "sha256", 
//         process.env.RAZORPAY_KEY_SECRET 
//       ) 
//       .update( 
//         `${razorpay_order_id}|${razorpay_payment_id}` 
//       ) 
//       .digest("hex"); 
 
 
//     if (generatedSignature !== razorpay_signature) { 
//       return res.status(400).json({ 
//         success: false, 
//         message: "Invalid payment signature", 
//       }); 
//     } 
 
 
    // ------------------------------------------ 
    // FIND RESUME 
    // ------------------------------------------ 
 
//     const resume = await Resume.findOne({ userId }); 
 
//     if (!resume) { 
//       return res.status(404).json({ 
//         success: false, 
//         message: "Resume not found", 
//       }); 
//     } 
 
 
//     // ------------------------------------------ 
//     // UPDATE RESUME PAYMENT 
//     // ------------------------------------------ 
 
//     resume.isPremium = true; 
//     resume.paymentStatus = "paid"; 
 
//     await resume.save(); 
 
 
//     return res.status(200).json({ 
//       success: true, 
//       message: "Payment verified successfully", 
//     }); 
 
//   } catch (error) { 
//     console.error("Verify Resume Payment Error:", error); 
 
//     return res.status(500).json({ 
//       success: false, 
//       message: "Unable to verify payment", 
//     }); 
//   } 
// }; 
 
 
// ========================================== 
// CREATE SUBSCRIPTION RAZORPAY ORDER 
// ========================================== 
 
export const createSubscriptionOrder = async (req, res) => { 
  try { 
    const userId = req.user.id; 
    const { plan } = req.body; 
 
 
    // ------------------------------------------ 
    // PAYMENT TIME CHECK 
    // 10:00 AM - 11:00 AM IST 
    // ------------------------------------------ 
 
    const now = new Date(); 
 
    const indiaTime = new Intl.DateTimeFormat("en-IN", { 
      timeZone: "Asia/Kolkata", 
      hour: "2-digit", 
      hour12: false, 
    }).format(now); 
 
    const hour = Number(indiaTime); 
 
 
    if (hour !== 10) { 
      return res.status(403).json({ 
        success: false, 
        message: 
          "Subscription payments are allowed only between 10:00 AM and 11:00 AM IST", 
      }); 
    } 
 
 
    // ------------------------------------------ 
    // SUBSCRIPTION PLANS 
    // ------------------------------------------ 
 
    const plans = { 
 
      bronze: { 
        amount: 100, 
        applicationLimit: 3, 
      }, 
 
      silver: { 
        amount: 300, 
        applicationLimit: 5, 
      }, 
 
      gold: { 
        amount: 1000, 
        applicationLimit: -1, 
      }, 
 
    }; 
 
 
    // ------------------------------------------ 
    // VALIDATE PLAN 
    // ------------------------------------------ 
 
    if (!plan || !plans[plan]) { 
      return res.status(400).json({ 
        success: false, 
        message: "Invalid subscription plan", 
      }); 
    } 
 
 
    const selectedPlan = plans[plan]; 
 
 
    // ------------------------------------------ 
    // CREATE RAZORPAY ORDER 
    // ------------------------------------------ 
 
    const options = { 
      amount: selectedPlan.amount * 100, 
      currency: "INR", 
      receipt: `subscription_${Date.now()}`, 
    }; 
 
 
    const order = await razorpay.orders.create(options); 
 
 
    // ------------------------------------------ 
    // SUBSCRIPTION DATES 
    // ------------------------------------------ 
 
    const startDate = new Date(); 
 
    const endDate = new Date(); 
 
    endDate.setMonth( 
      endDate.getMonth() + 1 
    ); 
 
 
    // ------------------------------------------ 
    // CREATE SUBSCRIPTION RECORD 
    // ------------------------------------------ 
 
    await Subscription.create({ 
 
      user: userId, 
 
      plan, 
 
      amount: selectedPlan.amount, 
 
      applicationLimit: 
        selectedPlan.applicationLimit, 
 
      startDate, 
 
      endDate, 
 
      razorpayOrderId: order.id, 
 
      paymentStatus: "created", 
 
    }); 
 
 
    // ------------------------------------------ 
    // RESPONSE 
    // ------------------------------------------ 
 
    return res.status(200).json({ 
 
      success: true, 
 
      message: 
        "Subscription order created successfully", 
 
      order, 
 
      key: 
        process.env.RAZORPAY_KEY_ID, 
 
      plan, 
 
      amount: 
        selectedPlan.amount, 
 
    }); 
 
  } catch (error) { 
 
    console.error( 
      "Create Subscription Order Error:", 
      error 
    ); 
 
    return res.status(500).json({ 
 
      success: false, 
 
      message: 
        "Unable to create subscription payment order", 
 
    }); 
 
  } 
}; 
 
 
// ========================================== 
// VERIFY SUBSCRIPTION PAYMENT 
// ========================================== 
 
export const verifySubscriptionPayment = async ( 
  req, 
  res 
) => { 
 
  try { 
 
    const userId = req.user.id; 
 
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature, 
    } = req.body; 
 
 
    // ------------------------------------------ 
    // VERIFY RAZORPAY SIGNATURE 
    // ------------------------------------------ 
 
    const generatedSignature = crypto 
      .createHmac( 
        "sha256", 
        process.env.RAZORPAY_KEY_SECRET 
      ) 
      .update( 
        `${razorpay_order_id}|${razorpay_payment_id}` 
      ) 
      .digest("hex"); 
 
 
    if ( 
      generatedSignature !== 
      razorpay_signature 
    ) { 
 
      return res.status(400).json({ 
 
        success: false, 
 
        message: 
          "Invalid payment signature", 
 
      }); 
 
    } 
 
 
    // ------------------------------------------ 
    // FIND SUBSCRIPTION 
    // ------------------------------------------ 
 
    const subscription = 
      await Subscription.findOne({ 
 
        user: userId, 
 
        razorpayOrderId: 
          razorpay_order_id, 
 
      }); 
 
 
    if (!subscription) { 
 
      return res.status(404).json({ 
 
        success: false, 
 
        message: 
          "Subscription order not found", 
 
      }); 
 
    } 
 
 
    // ------------------------------------------ 
    // FIND USER 
    // ------------------------------------------ 
 
    const user = 
      await User.findById(userId); 
 
 
    if (!user) { 
 
      return res.status(404).json({ 
 
        success: false, 
 
        message: 
          "User not found", 
 
      }); 
 
    } 
 
 
    // ------------------------------------------ 
    // UPDATE SUBSCRIPTION 
    // ------------------------------------------ 
 
    subscription.razorpayPaymentId = 
      razorpay_payment_id; 
 
    subscription.paymentStatus = 
      "paid"; 
 
    await subscription.save(); 
 
 
    // ------------------------------------------ 
    // UPDATE USER SUBSCRIPTION 
    // ------------------------------------------ 
 
    user.subscriptionPlan = 
      subscription.plan; 
 
    user.subscriptionStartDate = 
      subscription.startDate; 
 
    user.subscriptionEndDate = 
      subscription.endDate; 
 
    user.monthlyApplicationLimit = 
      subscription.applicationLimit; 
 
    user.monthlyApplicationsUsed = 
      0; 
 
 
    // ------------------------------------------ 
    // CURRENT MONTH 
    // IST 
    // ------------------------------------------ 
 
    const currentMonth = 
      new Intl.DateTimeFormat( 
        "en-CA", 
        { 
          timeZone: "Asia/Kolkata", 
          year: "numeric", 
          month: "2-digit", 
        } 
      ).format(new Date()); 
 
 
    user.applicationMonth = 
      currentMonth; 
 
 
    // ------------------------------------------ 
    // PAYMENT STATUS 
    // ------------------------------------------ 
 
    user.subscriptionPaymentStatus = 
      "paid"; 
 
    user.subscriptionOrderId = 
      razorpay_order_id; 
 
    user.subscriptionPaymentId = 
      razorpay_payment_id; 
 
 
    // ------------------------------------------ 
    // SAVE USER 
    // ------------------------------------------ 
 
    await user.save(); 
 
 
    // ------------------------------------------ 
    // SEND INVOICE EMAIL 
    // ------------------------------------------ 
 
    await sendSubscriptionInvoiceEmail( 
 
      user.email, 
 
      subscription.plan, 
 
      subscription.amount, 
 
      razorpay_payment_id, 
 
      razorpay_order_id, 
 
      subscription.startDate, 
 
      subscription.endDate 
 
    ); 
 
 
    // ------------------------------------------ 
    // SUCCESS RESPONSE 
    // ------------------------------------------ 
 
    return res.status(200).json({ 
 
      success: true, 
 
      message: 
        "Subscription payment verified successfully", 
 
      plan: 
        subscription.plan, 
 
      applicationLimit: 
 
        subscription.applicationLimit === -1 
 
          ? "unlimited" 
 
          : subscription.applicationLimit, 
 
    }); 
 
  } catch (error) { 
 
    console.error( 
      "Verify Subscription Payment Error:", 
      error 
    ); 
 
    return res.status(500).json({ 
 
      success: false, 
 
      message: 
        "Unable to verify subscription payment", 
 
    }); 
 
  } 
};




// import "dotenv/config";
// import Razorpay from "razorpay";
// import crypto from "crypto";

// import Resume from "../models/Resume.js";
// import User from "../models/User.js";
// import Subscription from "../models/Subscription.js";

// import {
//   sendSubscriptionInvoiceEmail,
// } from "../services/emailService.js";


// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_KEY_SECRET,
// });


// // ==========================================
// // CREATE RESUME RAZORPAY ORDER
// // ==========================================

// export const createResumeOrder = async (req, res) => {
//   try {
//     const userId = req.user.id;

//     const resume = await Resume.findOne({ userId });

//     if (!resume) {
//       return res.status(404).json({
//         success: false,
//         message: "Resume not found",
//       });
//     }

//     const options = {
//       amount: 5000, // ₹50
//       currency: "INR",
//       receipt: `receipt_${Date.now()}`,
//     };

//     const order = await razorpay.orders.create(options);

//     return res.status(200).json({
//       success: true,
//       order,
//       key: process.env.RAZORPAY_KEY_ID,
//     });

//   } catch (error) {
//     console.error("Create Resume Order Error:", error);

//     return res.status(500).json({
//       success: false,
//       message: "Unable to create payment order",
//     });
//   }
// };


// // ==========================================
// // VERIFY RESUME RAZORPAY PAYMENT
// // ==========================================

// export const verifyResumePayment = async (req, res) => {
//   try {
//     const userId = req.user.id;

//     const {
//       razorpay_order_id,
//       razorpay_payment_id,
//       razorpay_signature,
//     } = req.body;


//     // ------------------------------------------
//     // VERIFY SIGNATURE
//     // ------------------------------------------

//     const generatedSignature = crypto
//       .createHmac(
//         "sha256",
//         process.env.RAZORPAY_KEY_SECRET
//       )
//       .update(
//         `${razorpay_order_id}|${razorpay_payment_id}`
//       )
//       .digest("hex");


//     if (generatedSignature !== razorpay_signature) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid payment signature",
//       });
//     }


//     // ------------------------------------------
//     // FIND RESUME
//     // ------------------------------------------

//     const resume = await Resume.findOne({ userId });

//     if (!resume) {
//       return res.status(404).json({
//         success: false,
//         message: "Resume not found",
//       });
//     }


//     // ------------------------------------------
//     // UPDATE RESUME PAYMENT
//     // ------------------------------------------

//     resume.isPremium = true;
//     resume.paymentStatus = "paid";

//     await resume.save();


//     return res.status(200).json({
//       success: true,
//       message: "Payment verified successfully",
//     });

//   } catch (error) {
//     console.error("Verify Resume Payment Error:", error);

//     return res.status(500).json({
//       success: false,
//       message: "Unable to verify payment",
//     });
//   }
// };


// // ==========================================
// // CREATE SUBSCRIPTION RAZORPAY ORDER
// // ==========================================

// export const createSubscriptionOrder = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { plan } = req.body;


//     // ------------------------------------------
//     // PAYMENT TIME CHECK
//     // 10:00 AM - 11:00 AM IST
//     // ------------------------------------------

//     const now = new Date();

//     const indiaTime = new Intl.DateTimeFormat("en-IN", {
//       timeZone: "Asia/Kolkata",
//       hour: "2-digit",
//       hour12: false,
//     }).format(now);

//     const hour = Number(indiaTime);


//     // if (hour !== 10) {
//     //   return res.status(403).json({
//     //     success: false,
//     //     message:
//     //       "Subscription payments are allowed only between 10:00 AM and 11:00 AM IST",
//     //   });
//     // }


//     // ------------------------------------------
//     // SUBSCRIPTION PLANS
//     // ------------------------------------------

//     const plans = {

//       bronze: {
//         amount: 100,
//         applicationLimit: 3,
//       },

//       silver: {
//         amount: 300,
//         applicationLimit: 5,
//       },

//       gold: {
//         amount: 1000,
//         applicationLimit: -1,
//       },

//     };


//     // ------------------------------------------
//     // VALIDATE PLAN
//     // ------------------------------------------

//     if (!plan || !plans[plan]) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid subscription plan",
//       });
//     }


//     const selectedPlan = plans[plan];


//     // ------------------------------------------
//     // CREATE RAZORPAY ORDER
//     // ------------------------------------------

//     const options = {
//       amount: selectedPlan.amount * 100,
//       currency: "INR",
//       receipt: `subscription_${Date.now()}`,
//     };


//     const order = await razorpay.orders.create(options);


//     // ------------------------------------------
//     // SUBSCRIPTION DATES
//     // ------------------------------------------

//     const startDate = new Date();

//     const endDate = new Date();

//     endDate.setMonth(
//       endDate.getMonth() + 1
//     );


//     // ------------------------------------------
//     // CREATE SUBSCRIPTION RECORD
//     // ------------------------------------------

//     await Subscription.create({

//       user: userId,

//       plan,

//       amount: selectedPlan.amount,

//       applicationLimit:
//         selectedPlan.applicationLimit,

//       startDate,

//       endDate,

//       razorpayOrderId: order.id,

//       paymentStatus: "created",

//     });


//     // ------------------------------------------
//     // RESPONSE
//     // ------------------------------------------

//     return res.status(200).json({

//       success: true,

//       message:
//         "Subscription order created successfully",

//       order,

//       key:
//         process.env.RAZORPAY_KEY_ID,

//       plan,

//       amount:
//         selectedPlan.amount,

//     });

//   } catch (error) {

//     console.error(
//       "Create Subscription Order Error:",
//       error
//     );

//     return res.status(500).json({

//       success: false,

//       message:
//         "Unable to create subscription payment order",

//     });

//   }
// };


// // ==========================================
// // VERIFY SUBSCRIPTION PAYMENT
// // ==========================================

// export const verifySubscriptionPayment = async (
//   req,
//   res
// ) => {

//   try {

//     const userId = req.user.id;

//     const {
//       razorpay_order_id,
//       razorpay_payment_id,
//       razorpay_signature,
//     } = req.body;


//     // ------------------------------------------
//     // VERIFY RAZORPAY SIGNATURE
//     // ------------------------------------------

//     const generatedSignature = crypto
//       .createHmac(
//         "sha256",
//         process.env.RAZORPAY_KEY_SECRET
//       )
//       .update(
//         `${razorpay_order_id}|${razorpay_payment_id}`
//       )
//       .digest("hex");


//     if (
//       generatedSignature !==
//       razorpay_signature
//     ) {

//       return res.status(400).json({

//         success: false,

//         message:
//           "Invalid payment signature",

//       });

//     }


//     // ------------------------------------------
//     // FIND SUBSCRIPTION
//     // ------------------------------------------

//     const subscription =
//       await Subscription.findOne({

//         user: userId,

//         razorpayOrderId:
//           razorpay_order_id,

//       });


//     if (!subscription) {

//       return res.status(404).json({

//         success: false,

//         message:
//           "Subscription order not found",

//       });

//     }


//     // ------------------------------------------
//     // FIND USER
//     // ------------------------------------------

//     const user =
//       await User.findById(userId);


//     if (!user) {

//       return res.status(404).json({

//         success: false,

//         message:
//           "User not found",

//       });

//     }


//     // ------------------------------------------
//     // UPDATE SUBSCRIPTION
//     // ------------------------------------------

//     subscription.razorpayPaymentId =
//       razorpay_payment_id;

//     subscription.paymentStatus =
//       "paid";

//     await subscription.save();


//     // ------------------------------------------
//     // UPDATE USER SUBSCRIPTION
//     // ------------------------------------------

//     user.subscriptionPlan =
//       subscription.plan;

//     user.subscriptionStartDate =
//       subscription.startDate;

//     user.subscriptionEndDate =
//       subscription.endDate;

//     user.monthlyApplicationLimit =
//       subscription.applicationLimit;

//     user.monthlyApplicationsUsed =
//       0;


//     // ------------------------------------------
//     // CURRENT MONTH
//     // IST
//     // ------------------------------------------

//     const currentMonth =
//       new Intl.DateTimeFormat(
//         "en-CA",
//         {
//           timeZone: "Asia/Kolkata",
//           year: "numeric",
//           month: "2-digit",
//         }
//       ).format(new Date());


//     user.applicationMonth =
//       currentMonth;


//     // ------------------------------------------
//     // PAYMENT STATUS
//     // ------------------------------------------

//     user.subscriptionPaymentStatus =
//       "paid";

//     user.subscriptionOrderId =
//       razorpay_order_id;

//     user.subscriptionPaymentId =
//       razorpay_payment_id;


//     // ------------------------------------------
//     // SAVE USER
//     // ------------------------------------------

//     await user.save();


//     // ------------------------------------------
//     // SEND INVOICE EMAIL
//     // ------------------------------------------

//     await sendSubscriptionInvoiceEmail(

//       user.email,

//       subscription.plan,

//       subscription.amount,

//       razorpay_payment_id,

//       razorpay_order_id,

//       subscription.startDate,

//       subscription.endDate

//     );


//     // ------------------------------------------
//     // SUCCESS RESPONSE
//     // ------------------------------------------

//     return res.status(200).json({

//       success: true,

//       message:
//         "Subscription payment verified successfully",

//       plan:
//         subscription.plan,

//       applicationLimit:

//         subscription.applicationLimit === -1

//           ? "unlimited"

//           : subscription.applicationLimit,

//     });

//   } catch (error) {

//     console.error(
//       "Verify Subscription Payment Error:",
//       error
//     );

//     return res.status(500).json({

//       success: false,

//       message:
//         "Unable to verify subscription payment",

//     });

//   }
// };



// import "dotenv/config";
// import Razorpay from "razorpay";
// import crypto from "crypto";
// import Resume from "../models/Resume.js";
// import User from "../models/User.js"
// import Subscription from "../models/Subscription.js";

// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_KEY_SECRET,
// });


// // ==========================================
// // CREATE RAZORPAY ORDER
// // ==========================================

// export const createResumeOrder = async (req, res) => {
//   try {
//     const userId = req.user.id;

//     const resume = await Resume.findOne({ userId });

//     if (!resume) {
//       return res.status(404).json({
//         success: false,
//         message: "Resume not found",
//       });
//     }

//     const options = {
//       amount: 5000, // ₹50
//       currency: "INR",
//       receipt: `receipt_${Date.now()}`,
//     };

//     // IMPORTANT: orders, not oders
//     const order = await razorpay.orders.create(options);

//     return res.status(200).json({
//       success: true,
//       order,
//       key: process.env.RAZORPAY_KEY_ID,
//     });

//   } catch (error) {
//     console.error("Create order error:", error);

//     return res.status(500).json({
//       success: false,
//       message: "Unable to create payment order",
//     });
//   }
// };


// // ==========================================
// // VERIFY RAZORPAY PAYMENT
// // ==========================================

// export const verifyResumePayment = async (req, res) => {
//   try {
//     const userId = req.user.id;

//     const {
//       razorpay_order_id,
//       razorpay_payment_id,
//       razorpay_signature,
//     } = req.body;


//     const generatedSignature = crypto
//       .createHmac(
//         "sha256",
//         process.env.RAZORPAY_KEY_SECRET
//       )
//       .update(
//         `${razorpay_order_id}|${razorpay_payment_id}`
//       )
//       .digest("hex");


//     // IMPORTANT: generatedSignature
//     if (generatedSignature !== razorpay_signature) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid payment signature",
//       });
//     }


//     const resume = await Resume.findOne({ userId });

//     if (!resume) {
//       return res.status(404).json({
//         success: false,
//         message: "Resume not found",
//       });
//     }


//     resume.isPremium = true;
//     resume.paymentStatus = "paid";

//     await resume.save();


//     return res.status(200).json({
//       success: true,
//       message: "Payment verified successfully",
//     });

//   } catch (error) {
//     console.error("Verify payment error:", error);

//     return res.status(500).json({
//       success: false,
//       message: "Unable to verify payment",
//     });
//   }
// };


// // ==========================================
// // CREATE SUBSCRIPTION RAZORPAY ORDER
// // ==========================================

// export const createSubscriptionOrder = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { plan } = req.body;

//     // ------------------------------------------
//     // PAYMENT TIME CHECK (10 AM - 11 AM IST)
//     // ------------------------------------------

//     const now = new Date();

//     const indiaTime = new Intl.DateTimeFormat("en-IN", {
//       timeZone: "Asia/Kolkata",
//       hour: "2-digit",
//       hour12: false,
//     }).format(now);

//     const hour = Number(indiaTime);

//     if (hour !== 10) {
//       return res.status(403).json({
//         success: false,
//         message:
//           "Subscription payments are allowed only between 10:00 AM and 11:00 AM IST",
//       });
//     }

//     // ------------------------------------------
//     // PLAN VALIDATION
//     // ------------------------------------------

//     const plans = {
//       bronze: {
//         amount: 100,
//         applicationLimit: 3,
//       },

//       silver: {
//         amount: 300,
//         applicationLimit: 5,
//       },

//       gold: {
//         amount: 1000,
//         applicationLimit: -1,
//       },
//     };

//     if (!plan || !plans[plan]) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid subscription plan",
//       });
//     }

//     const selectedPlan = plans[plan];

//     // ------------------------------------------
//     // CREATE RAZORPAY ORDER
//     // Razorpay amount is in paise
//     // ------------------------------------------

//     const options = {
//       amount: selectedPlan.amount * 100,
//       currency: "INR",
//       receipt: `subscription_${Date.now()}`,
//     };

//     const order = await razorpay.orders.create(options);

//     // ------------------------------------------
//     // CREATE PAYMENT HISTORY
//     // ------------------------------------------

//     const startDate = new Date();

//     const endDate = new Date();

//     endDate.setMonth(endDate.getMonth() + 1);

//     await Subscription.create({
//       user: userId,
//       plan,
//       amount: selectedPlan.amount,
//       applicationLimit: selectedPlan.applicationLimit,
//       startDate,
//       endDate,
//       razorpayOrderId: order.id,
//       paymentStatus: "created",
//     });

//     return res.status(200).json({
//       success: true,
//       message: "Subscription order created successfully",
//       order,
//       key: process.env.RAZORPAY_KEY_ID,
//       plan,
//       amount: selectedPlan.amount,
//     });

//   } catch (error) {
//     console.error("Create Subscription Order Error:", error);

//     return res.status(500).json({
//       success: false,
//       message: "Unable to create subscription payment order",
//     });
//   }
// };

// // ==========================================
// // CREATE SUBSCRIPTION RAZORPAY ORDER
// // ==========================================

// // ==========================================
// // VERIFY SUBSCRIPTION PAYMENT
// // ==========================================

// export const verifySubscriptionPayment = async (req, res) => {
//   try {
//     const userId = req.user.id;

//     const {
//       razorpay_order_id,
//       razorpay_payment_id,
//       razorpay_signature,
//     } = req.body;

//     // ------------------------------------------
//     // VERIFY SIGNATURE
//     // ------------------------------------------

//     const generatedSignature = crypto
//       .createHmac(
//         "sha256",
//         process.env.RAZORPAY_KEY_SECRET
//       )
//       .update(
//         `${razorpay_order_id}|${razorpay_payment_id}`
//       )
//       .digest("hex");

//     if (generatedSignature !== razorpay_signature) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid payment signature",
//       });
//     }

//     // ------------------------------------------
//     // FIND SUBSCRIPTION
//     // ------------------------------------------

//     const subscription = await Subscription.findOne({
//       user: userId,
//       razorpayOrderId: razorpay_order_id,
//     });

//     if (!subscription) {
//       return res.status(404).json({
//         success: false,
//         message: "Subscription order not found",
//       });
//     }

//     // ------------------------------------------
//     // UPDATE SUBSCRIPTION
//     // ------------------------------------------

//     subscription.razorpayPaymentId = razorpay_payment_id;
//     subscription.paymentStatus = "paid";

//     await subscription.save();

//     // ------------------------------------------
//     // UPDATE USER PLAN
//     // ------------------------------------------

//     const user = await User.findById(userId);

//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found",
//       });
//     }

//     user.subscriptionPlan = subscription.plan;

//     user.subscriptionStartDate = subscription.startDate;

//     user.subscriptionEndDate = subscription.endDate;

//     user.monthlyApplicationLimit =
//       subscription.applicationLimit;

//     user.monthlyApplicationsUsed = 0;

//     user.applicationMonth =
//       new Date().toISOString().slice(0, 7);

//     user.subscriptionPaymentStatus = "paid";

//     user.subscriptionOrderId = razorpay_order_id;

//     user.subscriptionPaymentId = razorpay_payment_id;

//     await user.save();

//     return res.status(200).json({
//       success: true,
//       message: "Subscription payment verified successfully",
//       plan: subscription.plan,
//       applicationLimit:
//         subscription.applicationLimit === -1
//           ? "unlimited"
//           : subscription.applicationLimit,
//     });

//   } catch (error) {
//     console.error(
//       "Verify Subscription Payment Error:",
//       error
//     );

//     return res.status(500).json({
//       success: false,
//       message: "Unable to verify subscription payment",
//     });
//   }
// };






// import Razorpay from "razorpay";
// import crypto from "crypto";
// import Resume from "../models/Resume.js";

// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_KEY_SECRET,
// });

// export const createResumeOrder = async (req, res) => {
//     try {
//         const userId = req.user.id; // Assuming you have user authentication and the user ID is available in req.user
//         const resume = await Resume.findOne({ userId });

//         if (!resume) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Resume not found",
//             });
//         }

//         const options = {
//             amount: 5000,
//             currency: "INR",
//             receipt: `receipt_${Date.now()}`,
//         };

//         const order = await razorpay.oders.create(options);

//         return res.status(200).json({
//             success: true,
//             order,
//             key: process.env.RAZORPAY_KEY_ID,
//         });
//     } catch (error){
//         console.error("Create order error:", error);

//         return res.status(500).json({
//             success: false,
//             message: "Unable to create payment order",
//         });
//     }
// };

// export const verifyResumePayment = async (req, res) => {
//     try {
//         const userId = req.user.id; // Assuming you have user authentication and the user ID is available in req.user

//         const {
//             razorpay_order_id,
//             razorpay_payment_id,
//             razorpay_signature,
//         } = req.body;

//     const generatedSignature = crypto
//         .createHmac(
//             "sha256",
//             process.env.RAZORPAY_KEY_SECRET
//         )
//         .update(
//             `${razorpay_order_id}|${razorpay_payment_id}`
//         )
//         .digest("hex");

//         if(generatetedSignature !== razorpay_signature) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Invalid payment signature",
//             });
//         }

//         const resume = await Resume.findOne({ userId });

//         if(!resume) {
//             return res.status(404).json({
//                 success: false,
//                 message: "Resume not found",
//             });
//         }

//         resume.isPremium = true;
//         resume.paymentStatus = "Paid";

//         esume.razorpayOrderId = razorpay_order_id;
//         resume.razorpayPaymentId = razorpay_payment_id;

//         await resume.save();

//         return res.status(200).json({
//             success: true,
//             message: "Payment verifed successfully",
//         });
//     } catch (error) {
//         console.error("Verify payment error:", error);

//         return res.status(500).json({
//             success: false,
//             message: "Unable to verify payment",
//         });
//     }
// };
