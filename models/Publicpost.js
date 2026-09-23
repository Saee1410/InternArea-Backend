import mongoose from "mongoose";

const publicPostSchema = new mongoose.Schema(
    {
       user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        
       },

       mediaUrl: {
            type: String,
            required: true,
       },

       mediaType: {
            type: String,
            enum: ["image", "video"],
            required: true,
       },

       caption: {
            type: String,
            default: "",
            maxlength: 500,
       },

       likes: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        
        },
       ],

       comments: [
        {
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },

            text: {
                type: String,
                required: true,
                maxlength: 500,
            },

            createdAt: {
                type: Date,
                default: Date.now,
            },
        },
       ],

       shareCount: {
            type: Number,
            default: 0,
       },
    },
    {
        timestamps: true,
    }
);

const Publicpost = mongoose.model("PublicPost", publicPostSchema);

export default Publicpost;