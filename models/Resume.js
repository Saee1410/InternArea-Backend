import mongoose from 'mongoose';

const resumeSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },

    fullName: {
        type: String,
        required: true,
        trim: true,
    },

    email: {
        type: String,
        required: true,
        trim: true,
    },
    phone: {
        type: String,
        required: true,
        trim: true,
    },

     location: {
      type: String,
      trim: true,
    },

    qualification: {
      type: String,
      trim: true,
    },

    college: {
      type: String,
      trim: true,
    },

    graduationYear: {
        type: String,
    },
    experience: {
        type: String,
    },
    skills: {
        type: String,
    },
    projects: {
        type: String,
    },
    achievements: {
        type: String,
    },
    linkedin: {
        type: String,
        trim: true,
    },
     github: {
      type: String,
      trim: true,
    },

    photo: {
      type: String,
    },

    // पुढे premium/payment साठी उपयोगी
    isPremium: {
      type: Boolean,
      default: false,
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending",
    },

    razorpayOrderId: {
  type: String,
  default: null,
},

razorpayPaymentId: {
  type: String,
  default: null,
},

    resumeUrl: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Resume = mongoose.model("Resume", resumeSchema);
export default Resume;