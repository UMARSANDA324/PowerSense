import mongoose from "mongoose";

const coordinatesSchema = new mongoose.Schema({
  country: {
    type: String,
    default: "Nigeria",
    trim: true
  },
  state: {
    type: String,
    required: true,
    trim: true
  },
  lgaId: {
    type: String,
    required: true,
    trim: true
  },
  wardId: {
    type: String,
    required: true,
    trim: true
  },
  communityId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  communityName: {
    type: String,
    required: true,
    trim: true
  },
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  },
  source: {
    type: String,
    required: true,
    trim: true
  },
  accuracy: {
    type: String,
    trim: true,
    default: null
  },
  verified: {
    type: Boolean,
    default: false
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, { 
  timestamps: true 
});

// Indexes
coordinatesSchema.index({ communityName: 1 });
coordinatesSchema.index({ wardId: 1 });
coordinatesSchema.index({ lgaId: 1 });
coordinatesSchema.index({ latitude: 1 });
coordinatesSchema.index({ longitude: 1 });

export default mongoose.model("Coordinates", coordinatesSchema);
