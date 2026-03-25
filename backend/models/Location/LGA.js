import mongoose from "mongoose";

const lgaSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    state: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "State",
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

lgaSchema.index({ name: 1, state: 1 }, { unique: true });

export default mongoose.model("LGA", lgaSchema);

