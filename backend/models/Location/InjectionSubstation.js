import mongoose from "mongoose";
import { tenantScopedSchema } from "../../utils/tenantScope.js";

const injectionSubstationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  code: {
    type: String,
    trim: true
  },
  voltage: {
    type: String,
    trim: true
  },
  latitude: {
    type: Number
  },
  longitude: {
    type: Number
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance'],
    default: 'active'
  },
  stateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'State'
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

injectionSubstationSchema.plugin(tenantScopedSchema);

export default mongoose.model("InjectionSubstation", injectionSubstationSchema);