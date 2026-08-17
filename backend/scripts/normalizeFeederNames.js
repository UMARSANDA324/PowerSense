
import mongoose from "mongoose";
import dotenv from "dotenv";
import Feeder from "../models/Location/Feeder.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

// Function to convert "11KV NAME" to "Name 11kV"
function normalizeFeederName(inputName) {
  let name = inputName.trim();
  let voltage = null;
  
  // Extract voltage (11KV or 33KV)
  if (name.toUpperCase().includes("11KV")) {
    voltage = "11kV";
    name = name.replace(/11KV/i, "").trim();
  } else if (name.toUpperCase().includes("33KV")) {
    voltage = "33kV";
    name = name.replace(/33KV/i, "").trim();
  }
  
  // Convert to proper case (capitalize first letter, lowercase rest of each word)
  name = name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  
  // If we found voltage, append it to the end
  if (voltage) {
    return `${name} ${voltage}`;
  }
  
  // Return the properly cased name if no voltage found
  return name;
}

async function normalizeFeeders() {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGO_URI (or MONGODB_URI) is not defined in .env");
    await mongoose.connect(uri);
    console.log("Connected to MongoDB");

    // Get all feeders from DB
    const feeders = await Feeder.find({});
    console.log(`Found ${feeders.length} feeders in DB`);

    let updatedCount = 0;
    
    for (const feeder of feeders) {
      const normalizedName = normalizeFeederName(feeder.name);
      
      // Only update if name actually changed
      if (normalizedName !== feeder.name) {
        console.log(`Updating: "${feeder.name}" → "${normalizedName}"`);
        feeder.name = normalizedName;
        await feeder.save();
        updatedCount++;
      }
    }

    console.log(`\n✅ Successfully normalized ${updatedCount} feeder names!`);
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

normalizeFeeders();
