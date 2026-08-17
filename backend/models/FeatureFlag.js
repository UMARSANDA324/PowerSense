import mongoose from "mongoose";

const featureFlagSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  displayName: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ""
  },
  isEnabled: {
    type: Boolean,
    default: false,
    index: true
  },
  environment: {
    type: String,
    enum: ["development", "staging", "production"],
    default: "production",
    index: true
  },
  defaultValue: {
    type: Boolean,
    default: false
  },
  rolloutPercentage: {
    type: Number,
    enum: [0, 1, 5, 10, 25, 50, 75, 100],
    default: 0
  },
  targetRoles: [{
    type: String,
    enum: ["platform-owner", "company-super-admin", "super-admin", "regional-admin", "admin", "user"]
  }],
  targetCompanies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company"
  }],
  targetStates: [{
    type: String,
    trim: true
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  lastAuditReason: {
    type: String,
    default: ""
  }
}, { timestamps: true });

// Compound indexes for performant evaluation
featureFlagSchema.index({ environment: 1, isEnabled: 1 });
featureFlagSchema.index({ key: 1, environment: 1 });

export default mongoose.model("FeatureFlag", featureFlagSchema);
