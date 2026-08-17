import mongoose from "mongoose";
import { tenantScopedSchema } from "../utils/tenantScope.js";

const PredictionSchema = new mongoose.Schema(
  {
    feeder: { type: String, required: true, index: true },
    area: { type: String, required: true, index: true },
    prediction: { type: String, required: true },
    confidence: { type: Number, default: 0 },
    riskLevel: { type: String, enum: ["low", "medium", "high", "critical"], default: "low" },
    metadata: { type: mongoose.Schema.Types.Mixed },
    generatedAt: { type: Date, default: Date.now },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
      required: true,
        index: true
    }
  },
  { timestamps: true }
);

PredictionSchema.plugin(tenantScopedSchema);

PredictionSchema.index({ feeder: 1, createdAt: -1 });

const Prediction = mongoose.model("Prediction", PredictionSchema);
export default Prediction;
