import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

import LGA from "../models/Location/LGA.js";
import Ward from "../models/Location/Ward.js";

const run = async () => {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    await mongoose.connect(uri);

    const dalaRural = await LGA.findOne({ name: "Dala Rural" });
    const nasKumb = await LGA.findOne({ name: "Nasarawa/kumbotso" });

    if (dalaRural) {
        const wards = await Ward.find({ lga: dalaRural._id });
        console.log(`Wards under "Dala Rural" (${wards.length}):`);
        wards.forEach(w => console.log(`  - ${w.name} (id: ${w.id})`));
    } else {
        console.log("Dala Rural LGA not found");
    }

    if (nasKumb) {
        const wards = await Ward.find({ lga: nasKumb._id });
        console.log(`Wards under "Nasarawa/kumbotso" (${wards.length}):`);
        wards.forEach(w => console.log(`  - ${w.name} (id: ${w.id})`));
    } else {
        console.log("Nasarawa/kumbotso LGA not found");
    }

    await mongoose.disconnect();
    process.exit(0);
};

run();
