import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import LGA from "../models/Location/LGA.js";
import Ward from "../models/Location/Ward.js";
import Feeder from "../models/Location/Feeder.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

const run = async () => {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        await mongoose.connect(uri);

        console.log("=== LGAs ===");
        const lgas = await LGA.find({}).sort({ name: 1 });
        lgas.forEach(l => console.log(`'${l.name}' (ID: ${l._id})`));

        console.log("\n=== Kumbotso Wards ===");
        const kumbotso = lgas.find(l => l.name.includes("Kumbotso"));
        if (kumbotso) {
            const wards = await Ward.find({ lga: kumbotso._id }).sort({ name: 1 });
            wards.forEach(w => console.log(`'${w.name}'`));
        }

        console.log("\n=== Garun Mallam LGAs ===");
        const gm = await LGA.find({ name: /Garun/i });
        gm.forEach(l => console.log(`'${l.name}' (ID: ${l._id})`));
        
        console.log("\n=== Garun Mallam Wards ===");
        const gm_all = await LGA.find({ name: /Garun/i });
        for (const g of gm_all) {
            const wards = await Ward.find({ lga: g._id });
            console.log(`Wards for ${g.name}: ${wards.length}`);
        }

        console.log("\n=== Shekar Barde Feeder ===");
        const shekar = await Ward.findOne({ name: /Shekar Barde/i });
        if (shekar) {
            console.log(`Shekar Barde Feeder IDs: ${shekar.feederIds}`);
        } else {
            console.log("Shekar Barde not found");
        }

        const sallari = await Feeder.findOne({ name: /Sallari/i });
        if (sallari) {
            console.log(`Sallari 11kV Feeder ID: ${sallari._id}`);
        } else {
            console.log("Sallari 11kV Feeder not found");
        }

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

run();
