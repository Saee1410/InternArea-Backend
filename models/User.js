import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },

    email: {
      type: String,
      required: true,
      unique: true
    },

    password: {
      type: String,
      required: false
    },
   

    role: {
      type: String,
      enum: ["student", "admin"],
      default: "student"
    },
     phone: {
      type: String,
      default: "",
    },
    lastPasswordResetAt: {
  type: Date,
  default: null
},

passwordResetCount: {
  type: Number,
  default: 0
},

    location: {
      type: String,
      default: "",
    },

    qualification: {
      type: String,
      default: "",
    },

    skills: {
      type: String,
      default: "",
    },

    bio: {
      type: String,
      default: "",
    },

    profilePhoto: {
      type: String,
      default: "",
    },
   
     // ==========================================
    // SUBSCRIPTION
    // ==========================================

    subscriptionPlan: {
      type: String,
      enum: ["free", "bronze", "silver", "gold"],
      default: "free",
    },

    subscriptionStartDate: {
      type: Date,
      default: null,
    },

    subscriptionEndDate: {
      type: Date,
      default: null,
    },

    monthlyApplicationLimit: {
      type: Number,
      default: 1,
    },

    monthlyApplicationsUsed: {
      type: Number,
      default: 0,
    },

    applicationMonth: {
      type: String,
      default: "",
    },

    subscriptionPaymentStatus: {
      type: String,
      enum: ["none", "paid", "failed"],
      default: "none",
    },

    subscriptionOrderId: {
      type: String,
      default: "",
    },

    subscriptionPaymentId: {
      type: String,
      default: "",
    },
    
  },
  {
    timestamps: true
  }
);


const User = mongoose.model("User", userSchema);

export default User;