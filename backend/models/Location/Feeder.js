import mongoose from "mongoose";

const feederSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    ward: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Ward",
        required: true
    }
}, { timestamps: true });

export default mongoose.model("Feeder", feederSchema);
