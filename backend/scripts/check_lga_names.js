import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

import LGA from "../models/Location/LGA.js";
import State from "../models/Location/State.js";

const run = async () => {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    await mongoose.connect(uri);

    const kano = await State.findOne({ name: "Kano" });
    const dbLgas = await LGA.find({ state: kano._id, isActive: { $ne: false } }).sort({ name: 1 });
    const dbLgaNames = dbLgas.map(l => l.name);

    const sourcePath = path.join(__dirname, "../data/kanoCommunities.json");
    const sourceData = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
    const jsonLgaNames = sourceData.lgas.map(l => l.lga_name);

    console.log("=== DB LGA Names (Active) ===");
    console.log(JSON.stringify(dbLgaNames, null, 2));

    console.log("=== JSON LGA Names ===");
    console.log(JSON.stringify(jsonLgaNames, null, 2));

    console.log("=== Missing in DB ===");
    const missing = jsonLgaNames.filter(n => !dbLgaNames.includes(n));
    console.log(JSON.stringify(missing, null, 2));

    await mongoose.disconnect();
    process.exit(0);
};

run();
