import mongoose from "mongoose";

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
    }
}, { timestamps: true });

reminderSchema.index({ feeder: 1, isSent: 1, isCancelled: 1 });

const Reminder = mongoose.model("Reminder", reminderSchema);

export default Reminder;
