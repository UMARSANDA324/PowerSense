import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

import Ward from "../models/Location/Ward.js";

const run = async () => {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        await mongoose.connect(uri);

        console.log("=== Checking IDs in Ward collection ===");
        const allWards = await Ward.find({});
        
        let countWithId = 0;
        let countWithoutId = 0;
        let idPrefixes = new Set();
        let samples = [];

        allWards.forEach(w => {
            if (w.id) {
                countWithId++;
                const prefix = w.id.split("_")[0];
                idPrefixes.add(prefix);
                if (samples.length < 10) {
                    samples.push({ name: w.name, id: w.id, wardName: w.wardName, lgaName: w.lgaName });
                }
            } else {
                countWithoutId++;
            }
        });

        console.log(`Wards with 'id' field: ${countWithId}`);
        console.log(`Wards without 'id' field: ${countWithoutId}`);
        console.log("ID Prefixes seen:", Array.from(idPrefixes));
        console.log("Samples with ID:", JSON.stringify(samples, null, 2));

        // Let's see some samples of wards without ID
        const noIdSamples = await Ward.find({ id: { $exists: false } }).limit(5);
        console.log("Samples without ID:", JSON.stringify(noIdSamples, null, 2));

        await mongoose.disconnect();
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

run();
