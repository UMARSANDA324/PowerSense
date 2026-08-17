import mongoose from "mongoose";

const analyticsEventSchema = new mongoose.Schema({
  eventName: {
    type: String,
    required: true,
    index: true
  },
  feature: {
    type: String,
    required: true,
    default: "general",
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false,
    index: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: false,
    index: true
  },
  role: {
    type: String,
    required: false
  },
  state: {
    type: String,
    required: false,
    index: true
  },
  sessionId: {
    type: String,
    required: false,
    index: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, { timestamps: true });

// Compound indexes for performant DAU/WAU/MAU & retention aggregations
analyticsEventSchema.index({ eventName: 1, timestamp: -1 });
analyticsEventSchema.index({ companyId: 1, eventName: 1, timestamp: -1 });
analyticsEventSchema.index({ user: 1, timestamp: -1 });
analyticsEventSchema.index({ companyId: 1, user: 1, timestamp: -1 });
analyticsEventSchema.index({ feature: 1, timestamp: -1 });
analyticsEventSchema.index({ state: 1, timestamp: -1 });
analyticsEventSchema.index({ companyId: 1, feature: 1, timestamp: -1 });

export default mongoose.model("AnalyticsEvent", analyticsEventSchema);
