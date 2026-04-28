import mongoose from "mongoose";

const powerStatusSchema = new mongoose.Schema({
    status: {
        type: String,
        enum: ["on", "off", "maintenance"],
        default: "off"
    },
    isActive: {
        type: Boolean,
        required: true,
        default: false
    },
    feeder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Feeder',
        required: true,
        unique: true
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
