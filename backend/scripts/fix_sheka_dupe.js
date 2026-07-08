import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

import Ward from "../models/Location/Ward.js";
import LGA from "../models/Location/LGA.js";
import State from "../models/Location/State.js";

const run = async () => {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    await mongoose.connect(uri);
    console.log("Connected");

    const kano = await State.findOne({ name: "Kano" });
    const kumbotso = await LGA.findOne({ name: "Kumbotso", state: kano._id });

    // Find all wards named "Sheka Gidan Kaji" or similar in Kumbotso
    const dupes = await Ward.find({ lga: kumbotso._id, name: /sheka gidan kaji/i });
    console.log(`Found ${dupes.length} wards matching "Sheka Gidan Kaji" in Kumbotso:`);
    for (const d of dupes) {
        console.log(JSON.stringify({
            _id: d._id,
            name: d.name,
            id: d.id,
            slug: d.slug,
            areaId: d.areaId,
            wardName: d.wardName,
            lgaName: d.lgaName
        }, null, 2));
    }

    // Also check for case-insensitive duplicates across the whole kumbotso LGA
    const allKumbotsoWards = await Ward.find({ lga: kumbotso._id }).sort({ name: 1 });
    console.log(`\nAll Kumbotso wards (${allKumbotsoWards.length}):`);
    const nameCount = {};
    for (const w of allKumbotsoWards) {
        const key = w.name.toLowerCase().trim();
        nameCount[key] = (nameCount[key] || 0) + 1;
        if (nameCount[key] > 1) {
            console.log(`  DUPLICATE: "${w.name}" (id: ${w.id}, _id: ${w._id})`);
        }
    }
    for (const w of allKumbotsoWards) {
        console.log(`  "${w.name}" slug=${w.slug} id=${w.id} areaId=${w.areaId}`);
    }

    await mongoose.disconnect();
    process.exit(0);
};

run();
