import mongoose from "mongoose";

const coordinatesSchema = new mongoose.Schema({
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null }
}, { _id: false });

const feederSchema = new mongoose.Schema({
    // Core identity fields (optional for legacy docs in DB)
    uniqueId: { type: String, unique: true, sparse: true, trim: true },
    slug: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    // Name is required
    name: { type: String, required: true, trim: true },
    displayName: { type: String, trim: true },
    band: { type: String },
    voltageLevel: { type: String },
    color: { type: String, default: "" },
    injectionSubstation: { type: String, select: false },
    injectionSubstationId: { type: mongoose.Schema.Types.ObjectId, ref: "InjectionSubstation" },
    communityIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Ward" }],
    // Main ward references — both fields supported for compatibility
    wards: [{ type: mongoose.Schema.Types.ObjectId, ref: "Ward" }],
    wardIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Ward" }],
    ward: { type: mongoose.Schema.Types.ObjectId, ref: "Ward" },
    lgaId: { type: mongoose.Schema.Types.ObjectId, ref: "LGA" },
    source: { type: String, default: "KEDCO" },
    verificationStatus: { type: String, enum: ["Verified", "Unverified", "Uncertain"], default: "Unverified" },
    confidenceScore: { type: Number, min: 0, max: 100, default: 0 },
    status: { type: String, default: "active" },
    coordinates: { type: coordinatesSchema, default: null },
    isActive: { type: Boolean, default: true },
    isAssigned: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model("Feeder", feederSchema);
