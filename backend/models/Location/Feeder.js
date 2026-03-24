import mongoose from "mongoose";

const feederSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    wards: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Ward",
        required: true
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    isAssigned: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });


export default mongoose.model("Feeder", feederSchema);
