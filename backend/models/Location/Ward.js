import mongoose from "mongoose";

const coordinatesSchema = new mongoose.Schema({
    latitude: {
        type: Number,
        default: null
    },
    longitude: {
        type: Number,
        default: null
    }
}, { _id: false });

const wardSchema = new mongoose.Schema({
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
    wardName: {
        type: String,
        required: true,
        trim: true
    },
    areaId: {
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
    lga: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "LGA",
        required: true
    },
    lgaId: {
        type: String,
        required: true,
        trim: true
    },
    lgaName: {
        type: String,
        required: true,
        trim: true
    },
    state: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "State",
        required: true
    },
    country: {
        type: String,
        default: "Nigeria",
        trim: true
    },
    aliases: {
        type: [String],
        default: []
    },
    latitude: {
        type: Number,
        default: null
    },
    longitude: {
        type: Number,
        default: null
    },
    coordinates: {
        type: coordinatesSchema,
        default: null
    },
    isUrban: {
        type: Boolean,
        default: true
    },
    status: {
        type: String,
        enum: ["active", "inactive", "archived"],
        default: "active"
    },
    feederIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Feeder"
    }],
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

wardSchema.index({ name: 1, lga: 1 }, { unique: true });
wardSchema.index({ lga: 1, slug: 1 }, { unique: true, sparse: true });
wardSchema.index({ areaId: 1 }, { unique: true, sparse: true });

export default mongoose.model("Ward", wardSchema);
