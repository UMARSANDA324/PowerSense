
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

// Create a map of feeder names to their data
const feederMap = new Map();
kedcoData.feeders.forEach((feeder) => {
  const cleanName = feeder.cleanName || feeder.name;
  feederMap.set(cleanName.toLowerCase(), feeder);
  // Also map without voltage level in case of truncation
  feederMap.set(cleanName.replace(/\s*(11kv|33kv)\s*/gi, "").toLowerCase(), feeder);
});

const updateFeeders = async () => {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGO_URI (or MONGODB_URI) is not defined in .env");
    await mongoose.connect(uri);

    console.log("Connected to MongoDB");

    const feeders = await Feeder.find({});
    console.log(`Found ${feeders.length} feeders in DB`);

    let updatedCount = 0;

    for (const feeder of feeders) {
      // Try to find a matching feeder in KEDCO data
      let matchedFeeder = null;

      // First try exact match on feeder name (case-insensitive)
      matchedFeeder = feederMap.get(feeder.name.toLowerCase());

      // If not found, try to match parts of the name
      if (!matchedFeeder) {
        for (const [key, kedcoFeeder] of feederMap.entries()) {
          if (feeder.name.toLowerCase().includes(key) || key.includes(feeder.name.toLowerCase())) {
            matchedFeeder = kedcoFeeder;
            break;
          }
        }
      }

      if (matchedFeeder) {
        const cleanName = matchedFeeder.cleanName || matchedFeeder.name;
        console.log(`Updating feeder: '${feeder.name}' -> '${cleanName}'`);
        
        // Update the feeder
        feeder.name = cleanName;
        feeder.injectionSubstation = matchedFeeder.injectionSubstation;
        feeder.band = matchedFeeder.band;
        // Extract voltage level from name
        const voltageMatch = cleanName.match(/(11KV|33KV)/i);
        if (voltageMatch) {
          feeder.voltageLevel = voltageMatch[1].toUpperCase();
        }
        
        await feeder.save();
        updatedCount++;
      } else {
        console.warn(`Could not find match for feeder: '${feeder.name}'`);
      }
    }

    console.log(`\nSuccessfully updated ${updatedCount} feeders!`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

updateFeeders();
