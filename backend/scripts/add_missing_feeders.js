
import mongoose from "mongoose";
import dotenv from "dotenv";
import Feeder from "../models/Location/Feeder.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

// Load KEDCO data from cache
const kedcoDataPath = path.join(__dirname, "../cache/kedco-data.json");
const kedcoData = JSON.parse(fs.readFileSync(kedcoDataPath, "utf8"));

const addMissing = async () => {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGO_URI (or MONGODB_URI) is not defined in .env");
    await mongoose.connect(uri);

    console.log("✅ Connected to MongoDB");

    const dbFeeders = await Feeder.find({});
    const dbNames = new Set(dbFeeders.map(f => f.name.toLowerCase()));
    console.log(`📊 Found ${dbFeeders.length} feeders in DB`);

    let added = 0;

    for (const kedcoFeeder of kedcoData.feeders) {
      const cleanName = kedcoFeeder.cleanName || kedcoFeeder.name;
      const cleanNameLower = cleanName.toLowerCase();

      if (!dbNames.has(cleanNameLower)) {
        console.log(`➕ Adding feeder: '${cleanName}'`);

        const feeder = new Feeder({
          name: cleanName,
          injectionSubstation: kedcoFeeder.injectionSubstation,
          band: kedcoFeeder.band,
          voltageLevel: cleanName.includes("11KV") ? "11KV" : cleanName.includes("33KV") ? "33KV" : undefined,
          source: "KEDCO",
        });

        await feeder.save();
        added++;
      }
    }

    console.log(`\n✅ Finished! Added ${added} new feeders!`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
};

addMissing();
