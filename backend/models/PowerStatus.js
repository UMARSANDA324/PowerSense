import mongoose from "mongoose";
import { tenantScopedSchema } from "../utils/tenantScope.js";

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
    expectedOutageTime: {
        type: Date,
        default: null
    },
    expectedRestoreTime: {
        type: Date,
        default: null
    },
    maintenanceStart: {
        type: Date,
        default: null
    },
    maintenanceEnd: {
        type: Date,
        default: null
    },
    reason: {
        type: String,
        default: "Scheduled maintenance"
    },
    estimatedNextOutage: {
        type: Date,
        default: null
    },
    maintenanceReason: {
        type: String,
        default: "Scheduled maintenance"
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

powerStatusSchema.plugin(tenantScopedSchema);

const PowerStatus = mongoose.model("PowerStatus", powerStatusSchema);

export default PowerStatus;
