import mongoose from "mongoose";

const wardSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    lga: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "LGA",
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

export default mongoose.model("Ward", wardSchema);
