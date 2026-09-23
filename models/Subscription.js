import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        
        plan: {
            type: String,
            enum: ['bronze', 'silver', 'gold'],
            required: true,
        },

         amount: {
            type: Number,
            required: true,
         },

         applicationLimit: {
            type: Number,
            required: true,
         },

          startDate: {
            type: Date,
            required: true,
          },

          endDate: {
            type: Date,
            required: true,
          },

          razorpayOrderId: {
            type: String,
            default: "",
          },

          paymentStatus: {
            type: String,
            enum: ["created", "paid", "failed"],
            default: "created",
          },

    },
    {
        timestamps: true,
    }
);

const Subscription = mongoose.model('Subscription', subscriptionSchema);
export default Subscription;