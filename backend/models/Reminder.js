import mongoose from "mongoose";
import { tenantScopedSchema } from "../utils/tenantScope.js";

const reminderSchema = new mongoose.Schema({
    feeder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Feeder',
        required: true
    },
    feederName: String,
    reminderType: {
        type: String,
        enum: ["power_off", "power_on", "maintenance_start", "maintenance_end"],
        required: true
    },
    scheduledTime: {
        type: Date,
        required: true
    },
    reason: String,
    sentAt: Date,
    isSent: {
        type: Boolean,
        default: false
    },
    isCancelled: {
        type: Boolean,
        default: false
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
        required: true,
        index: true
    }
}, { timestamps: true });

reminderSchema.plugin(tenantScopedSchema);

reminderSchema.index({ feeder: 1, isSent: 1, isCancelled: 1 });

const Reminder = mongoose.model("Reminder", reminderSchema);

export default Reminder;
