import mongoose from "mongoose";

const countrySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  code: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    unique: true,
    sparse: true
  },
  isoCode: {
    type: String,
    trim: true,
    uppercase: true,
    sparse: true
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
  isDefault: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  }
}, { timestamps: true });

export default mongoose.model("Country", countrySchema);
