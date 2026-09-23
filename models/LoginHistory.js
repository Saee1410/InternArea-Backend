import mongoose from 'mongoose';

const loginHistorySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    browser: {
        type: String,
        required: true
    },

    operatingSystem: {
        type: String,
        required: true
    },

    deviceType: {
        type: String,
        enum: ["desktop", "laptop", "mobile", "tablet", "unknown"],
        default: "unknown",
    },

    ipAddress: {
        type: String,
        required: true
    },

    loginStatus: {
        type: String,
        enum: ["success", "failed"],
        required: true
    },

    loginTime: {
        type: Date,
        default: Date.now
    }
},
{
    timestamps: true,
}
);


const LoginHistory = mongoose.model('LoginHistory', loginHistorySchema);

export default LoginHistory;