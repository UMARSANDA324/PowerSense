import mongoose from "mongoose";
import { tenantScopedSchema } from "../../utils/tenantScope.js";

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
    },
    // CRITICAL: Company ownership for tenant isolation
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
        required: true,
        index: true
    }
}, { timestamps: true });

// Indexes for faster queries
feederCoverageSchema.index({ feederId: 1, communityId: 1 }, { unique: true, sparse: true });
feederCoverageSchema.index({ feederId: 1, wardId: 1 }, { unique: true, sparse: true });
feederCoverageSchema.index({ lgaId: 1 });
feederCoverageSchema.index({ substationId: 1 });
feederCoverageSchema.index({ companyId: 1 }); // CRITICAL: Tenant isolation index
feederCoverageSchema.plugin(tenantScopedSchema);

export default mongoose.model("FeederCoverage", feederCoverageSchema);
