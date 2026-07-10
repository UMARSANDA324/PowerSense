import mongoose from "mongoose";

const feederCoverageSchema = new mongoose.Schema({
    feederId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Feeder",
        required: true
    },
    communityId: {
        type: String,
        trim: true,
        default: null
    },
    wardId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Ward",
        default: null
    },
    lgaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "LGA",
        default: null
    },
    substationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "InjectionSubstation",
        default: null
    },
    priority: {
        type: Number,
        min: 1,
        max: 5,
        default: 3
    },
    source: {
        type: String,
        default: "KEDCO Master Schedule",
        trim: true
    },
    status: {
        type: String,
        enum: ["active", "inactive", "archived"],
        default: "active"
    }
}, { timestamps: true });

// Indexes for faster queries
feederCoverageSchema.index({ feederId: 1, communityId: 1 }, { unique: true, sparse: true });
feederCoverageSchema.index({ feederId: 1, wardId: 1 }, { unique: true, sparse: true });
feederCoverageSchema.index({ lgaId: 1 });
feederCoverageSchema.index({ substationId: 1 });

export default mongoose.model("FeederCoverage", feederCoverageSchema);
