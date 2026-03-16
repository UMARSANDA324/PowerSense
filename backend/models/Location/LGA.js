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
    }
}, { timestamps: true });

export default mongoose.model("LGA", lgaSchema);
