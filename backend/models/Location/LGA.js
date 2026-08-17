import mongoose from "mongoose";
import { tenantScopedSchema } from "../../utils/tenantScope.js";

const lgaSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    id: {
        type: String,
        required: true,
        trim: true,
        unique: true,
        sparse: true
    },
    lgaId: {
        type: String,
        required: true,
        trim: true
    },
    slug: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    state: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "State",
        required: true
    },
    status: {
        type: String,
        enum: ["active", "inactive", "archived"],
        default: "active"
    },
    isActive: {
        type: Boolean,
        default: true
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
        required: true,
        index: true
    }
}, { timestamps: true });

lgaSchema.plugin(tenantScopedSchema);

lgaSchema.index({ name: 1, state: 1 }, { unique: true });
lgaSchema.index({ lgaId: 1 }, { unique: true, sparse: true });
lgaSchema.index({ slug: 1 }, { unique: true, sparse: true });

export default mongoose.model("LGA", lgaSchema);

