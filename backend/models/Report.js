import mongoose from "mongoose";

const reportSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: false // can be anonymous for now
    },
    fullName: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    area: {
        type: String,
        required: true
    },
    feeder: {
        type: String,
        required: true
    },
    issueType: {
        type: String,
        required: true,
        enum: ["Power Outage", "Low Voltage", "Transformer Fault", "Cable Issue", "Other"]
    },
    description: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ["Pending", "Assigned", "In Progress", "Resolved"],
        default: "Pending"
    }
}, { timestamps: true });

export default mongoose.model("Report", reportSchema);
