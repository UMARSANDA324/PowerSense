import mongoose from "mongoose";
import { tenantScopedSchema } from "../utils/tenantScope.js";

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
    eventType: {
        type: String,
        enum: ["power_restored", "power_outage", "scheduled_maintenance", "emergency_maintenance", "manual_override"],
        default: null
    },
    reason: {
        type: String,
        default: null
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
        required: true,
        index: true
    }
}, { timestamps: true });

powerLogSchema.plugin(tenantScopedSchema);

powerLogSchema.index({ feeder: 1, timestamp: 1 });

const PowerLog = mongoose.model("PowerLog", powerLogSchema);

export default PowerLog;
