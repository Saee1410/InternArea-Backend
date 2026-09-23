import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    company: {
      type: String,
      required: true,
    },

    title: {
      type: String,
      required: true,
    },

    location: {
      type: String,
      required: true,
    },

    category: {
      type: String,
      required: true,
    },

    stipend: {
      type: String,
      required: true,
    },

    startDate: {
      type: String,
      required: true,
    },

    duration: {
      type: String,
      required: true,
    },

    aboutCompany: {
      type: String,
      required: true,
    },

    aboutInternship: {
      type: String,
      required: true,
    },

    whoCanApply: {
      type: String,
      required: true,
    },

    perks: {
      type: String,
      required: true,
    },

    additionalInfo: {
      type: String,
      required: true,
    },

    numberOfOpening: {
      type: Number,
      required: true,
    },

    applicants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

  },
  {
    timestamps: true,
  }
);

const Job = mongoose.model("Job", jobSchema);

export default Job;