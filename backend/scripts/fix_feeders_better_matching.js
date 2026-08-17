
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

const fixFeeders = async () => {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGO_URI (or MONGODB_URI) is not defined in .env");
    await mongoose.connect(uri);

    console.log("✅ Connected to MongoDB");

    const dbFeeders = await Feeder.find({});
    console.log(`📊 Found ${dbFeeders.length} feeders in DB`);

    for (const dbFeeder of dbFeeders) {
      console.log(`\nChecking: '${dbFeeder.name}'`);

      let matched = null;

      // Try to find matching KEDCO feeder
      for (const kedcoFeeder of kedcoData.feeders) {
        const cleanName = kedcoFeeder.cleanName || kedcoFeeder.name;
        const dbNameLower = dbFeeder.name.toLowerCase();
        const cleanNameLower = cleanName.toLowerCase();

        // Check if DB name contains cleanName OR cleanName is in DB name
        if (dbNameLower.includes(cleanNameLower) || cleanNameLower.includes(dbNameLower)) {
          matched = { ...kedcoFeeder, cleanName };
          console.log(`✅ Found match: '${cleanName}'`);
          break;
        }

        // Try extracting parts of clean name (without voltage)
        const cleanNameNoVolt = cleanNameLower.replace(/(11kv|33kv)/g, "").trim();
        if (cleanNameNoVolt && dbNameLower.includes(cleanNameNoVolt)) {
          matched = { ...kedcoFeeder, cleanName };
          console.log(`✅ Found match (no volt): '${cleanName}'`);
          break;
        }
      }

      if (matched) {
        // Check if another feeder already has this clean name
        const existingWithName = await Feeder.findOne({ 
          name: matched.cleanName, 
          _id: { $ne: dbFeeder._id } 
        });

        if (existingWithName) {
          console.log(`⚠️  Another feeder already has name '${matched.cleanName}'. Deleting this one.`);
          await Feeder.deleteOne({ _id: dbFeeder._id });
        } else {
          console.log(`Updating feeder...`);
          dbFeeder.name = matched.cleanName;
          dbFeeder.injectionSubstation = matched.injectionSubstation;
          dbFeeder.band = matched.band;
          
          const voltageMatch = matched.cleanName.match(/(11KV|33KV)/i);
          if (voltageMatch) {
            dbFeeder.voltageLevel = voltageMatch[1].toUpperCase();
          }

          await dbFeeder.save();
          console.log(`✅ Updated! Now: '${dbFeeder.name}'`);
        }
      } else {
        console.warn(`⚠️  No match found!`);
      }
    }

    console.log("\n✅ Finished processing all feeders!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
};

fixFeeders();
