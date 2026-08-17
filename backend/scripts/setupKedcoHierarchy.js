
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Models
import Feeder from "../models/Location/Feeder.js";
import InjectionSubstation from "../models/Location/InjectionSubstation.js";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

// Function to clean feeder name to format "Name 11kV" or "Name 33kV"
function cleanFeederName(originalName) {
  let name = originalName.trim();
  let voltage = null;

  // Extract voltage (11KV or 33KV)
  if (name.toUpperCase().includes("11KV")) {
    voltage = "11kV";
    name = name.replace(/11KV/gi, "").trim();
  } else if (name.toUpperCase().includes("33KV")) {
    voltage = "33kV";
    name = name.replace(/33KV/gi, "").trim();
  }

  // Convert to proper case (capitalize first letter of each word)
  name = name.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

  // If we found voltage, append it to the end
  if (voltage) {
    return `${name} ${voltage}`;
  }

  return name;
}

// Generate a slug from name
function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function setupKedcoHierarchy() {
  try {
    // Connect to DB
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGO_URI or MONGODB_URI not defined in .env");
    await mongoose.connect(uri);
    console.log("Connected to MongoDB");

    // Read and parse kedco data
    const kedcoDataPath = path.join(__dirname, "../cache/kedco-data.json");
    const kedcoDataRaw = fs.readFileSync(kedcoDataPath, "utf8");
    const kedcoData = JSON.parse(kedcoDataRaw);

    if (!kedcoData.feeders || !Array.isArray(kedcoData.feeders)) {
      throw new Error("Invalid kedco-data.json structure: no feeders array");
    }

    console.log(`Loaded ${kedcoData.feeders.length} feeders from KEDCO data`);

    // Process KEDCO data: group feeders by injection substation
    const substationMap = new Map();

    for (const kedcoFeeder of kedcoData.feeders) {
      // Skip if no valid feeder name
      if (!kedcoFeeder.name || !kedcoFeeder.name.trim()) {
        continue;
      }

      // Get injection substation name (handle typos like "SUSTATION" vs "SUBSTATION")
      let substationName = kedcoFeeder.injectionSubstation?.trim();
      if (!substationName) {
        console.warn(`Feeder "${kedcoFeeder.name}" has no injectionSubstation, skipping`);
        continue;
      }

      // Normalize substation name
      substationName = substationName
        .toUpperCase()
        .replace(/\s+/g, " ")
        .replace(/SUSTATION/g, "SUBSTATION")
        .trim();

      // Clean feeder name
      const cleanedFeederName = cleanFeederName(kedcoFeeder.name);

      // Add to substation map
      if (!substationMap.has(substationName)) {
        substationMap.set(substationName, []);
      }
      substationMap.get(substationName).push({
        originalName: kedcoFeeder.name,
        cleanedName: cleanedFeederName,
        band: kedcoFeeder.band,
        capacity: kedcoFeeder.capacity,
        serviceAreas: kedcoFeeder.serviceAreas
      });
    }

    console.log(`Processed ${substationMap.size} injection substations from KEDCO data`);

    // Process each substation
    for (const [substationName, feeders] of substationMap) {
      // 1. Upsert Injection Substation
      const substationSlug = generateSlug(substationName);
      let substation = await InjectionSubstation.findOne({ slug: substationSlug }).lean();

      if (!substation) {
        substation = await InjectionSubstation.create({
          name: substationName,
          slug: substationSlug,
          status: "active"
        });
        console.log(`Created injection substation: ${substationName}`);
      } else {
        // Update name if needed
        if (substation.name !== substationName) {
          await InjectionSubstation.findByIdAndUpdate(substation._id, { name: substationName });
          substation.name = substationName;
        }
        console.log(`Found existing injection substation: ${substationName}`);
      }

      // 2. Process each feeder in this substation
      for (const feederData of feeders) {
        // Try to find feeder by original name first
        let feeder = await Feeder.findOne({
          $or: [
            { name: feederData.originalName },
            { name: feederData.cleanedName }
          ]
        }).lean();

        const updateData = {
          name: feederData.cleanedName,
          band: feederData.band,
          source: "KEDCO",
          verificationStatus: "Verified",
          confidenceScore: 100,
          isActive: true,
          injectionSubstationId: substation._id
        };

        if (feeder) {
          // Update existing feeder
          await Feeder.findByIdAndUpdate(feeder._id, updateData);
          console.log(`  Updated feeder: ${feederData.originalName} → ${feederData.cleanedName}`);
        } else {
          // Create new feeder
          feeder = await Feeder.create({
            ...updateData,
            wards: [],
            wardIds: []
          });
          console.log(`  Created feeder: ${feederData.cleanedName}`);
        }
      }
    }

    console.log("\n✅ Successfully set up KEDCO hierarchy!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error setting up KEDCO hierarchy:", error);
    process.exit(1);
  }
}

setupKedcoHierarchy();
