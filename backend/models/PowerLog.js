import mongoose from "mongoose";

const powerLogSchema = new mongoose.Schema({
    feeder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Feeder',
        required: true
    },
    feederName: String,
    status: {
        type: String,
        enum: ["on", "off", "maintenance"],
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true });

powerLogSchema.index({ feeder: 1, timestamp: 1 });

const PowerLog = mongoose.model("PowerLog", powerLogSchema);

export default PowerLog;
