
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

// Create a map of feeder names to their data (cleanName as key)
const feederMap = new Map();
kedcoData.feeders.forEach((feeder) => {
  const cleanName = feeder.cleanName || feeder.name;
  feederMap.set(cleanName.toLowerCase(), feeder);
});

const cleanupAndUpdate = async () => {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGO_URI (or MONGODB_URI) is not defined in .env");
    await mongoose.connect(uri);

    console.log("✅ Connected to MongoDB");

    // --- Step 1: Find existing feeders and prepare updates ---
    const existingFeeders = await Feeder.find({});
    console.log(`📊 Found ${existingFeeders.length} feeders in DB`);

    const feedersToKeep = new Map(); // cleanName -> Feeder (keep one per cleanName)
    const feedersToDelete = [];

    for (const feeder of existingFeeders) {
      let matchedFeeder = null;

      // Try to match with KEDCO data
      for (const [cleanNameLower, kedcoFeeder] of feederMap.entries()) {
        const cleanName = kedcoFeeder.cleanName || kedcoFeeder.name;
        const feederNameLower = feeder.name.toLowerCase();
        
        // Check if clean name is in the feeder name (case-insensitive)
        if (feederNameLower.includes(cleanNameLower) || 
            cleanNameLower.includes(feederNameLower) ||
            // Also check without voltage level
            cleanNameLower.replace(/\s*(11kv|33kv)\s*/gi, "") === feederNameLower.replace(/\s*(11kv|33kv)\s*/gi, "")) {
          matchedFeeder = kedcoFeeder;
          break;
        }
      }

      if (matchedFeeder) {
        const cleanName = matchedFeeder.cleanName || matchedFeeder.name;
        const cleanNameLower = cleanName.toLowerCase();

        if (feedersToKeep.has(cleanNameLower)) {
          // Already have a feeder for this clean name - mark for deletion
          feedersToDelete.push(feeder._id);
        } else {
          // Keep this feeder
          feedersToKeep.set(cleanNameLower, { feeder, matchedFeeder, cleanName });
        }
      } else {
        console.warn(`⚠️  No match for feeder: '${feeder.name}'`);
      }
    }

    // --- Step 2: Delete duplicate feeders ---
    if (feedersToDelete.length > 0) {
      console.log(`🗑️ Deleting ${feedersToDelete.length} duplicate feeders...`);
      await Feeder.deleteMany({ _id: { $in: feedersToDelete } });
    }

    // --- Step 3: Update the kept feeders with clean data ---
    console.log(`📝 Updating ${feedersToKeep.size} feeders with clean data...`);
    let updatedCount = 0;

    for (const [cleanNameLower, { feeder, matchedFeeder, cleanName }] of feedersToKeep) {
      console.log(`  Updating: '${feeder.name}' -> '${cleanName}'`);
      
      feeder.name = cleanName;
      feeder.injectionSubstation = matchedFeeder.injectionSubstation;
      feeder.band = matchedFeeder.band;
      
      const voltageMatch = cleanName.match(/(11KV|33KV)/i);
      if (voltageMatch) {
        feeder.voltageLevel = voltageMatch[1].toUpperCase();
      }

      await feeder.save();
      updatedCount++;
    }

    console.log(`\n✅ Done! Updated ${updatedCount} feeders`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
};

cleanupAndUpdate();
