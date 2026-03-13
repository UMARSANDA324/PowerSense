import mongoose from "mongoose";

const powerStatusSchema = new mongoose.Schema({
    isActive: {
        type: Boolean,
        required: true,
        default: true
    },
    location: {
        type: String,
        required: true,
        default: "Kano Metro"
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    estimatedNextOutage: {
        type: String,
        default: "TBD"
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

const PowerStatus = mongoose.model("PowerStatus", powerStatusSchema);

export default PowerStatus;
