import mongoose from "mongoose";
import { tenantScopedSchema } from "../utils/tenantScope.js";

const OutageSchema = new mongoose.Schema(
  {
    area: { type: String, required: true, index: true },
    feeder: { type: String, required: true, index: true },
    outageType: { type: String, required: true },
    severity: { type: String, enum: ["low", "medium", "high", "critical"], default: "medium" },
    estimatedRestoreTime: { type: Date },
    active: { type: Boolean, default: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
      required: true,
        index: true
    }
  },
  { timestamps: true }
);

OutageSchema.plugin(tenantScopedSchema);

OutageSchema.index({ active: 1, createdAt: -1 });
OutageSchema.index({ feeder: 1, createdAt: -1 });

const Outage = mongoose.model("Outage", OutageSchema);
export default Outage;
