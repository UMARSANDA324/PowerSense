
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, "..", ".env");
dotenv.config({ path: envPath });

import InjectionSubstation from "../models/Location/InjectionSubstation.js";
import Feeder from "../models/Location/Feeder.js";
import fs from "fs";

const importData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Read cached data
    const cachedDataPath = path.join(__dirname, "..", "cache", "kedco-data.json");
    const rawData = fs.readFileSync(cachedDataPath, "utf-8");
    const data = JSON.parse(rawData);

    const feedersData = data.feeders || [];

    // Collect unique injection substation names
    const uniqueSubstations = new Map();

    for (const feeder of feedersData) {
      if (!feeder.injectionSubstation) continue;
      const substationName = feeder.injectionSubstation.trim();

      if (!uniqueSubstations.has(substationName)) {
        uniqueSubstations.set(substationName, {
          name: substationName,
          slug: substationName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
          voltage: feeder.cleanName?.startsWith("33KV") ? "33kV" : (feeder.cleanName?.startsWith("11KV") ? "11kV" : undefined),
          feeders: []
        });
      }

      // Add feeder to substation's list
      uniqueSubstations.get(substationName).feeders.push(feeder);
    }

    console.log(`Found ${uniqueSubstations.size} unique injection substations`);

    // Create/Update injection substations
    for (const [substationName, substationData] of uniqueSubstations) {
      // Check if substation already exists
      let substation = await InjectionSubstation.findOne({ slug: substationData.slug });

      if (!substation) {
        // Create new
        substation = await InjectionSubstation.create({
          name: substationName,
          slug: substationData.slug,
          voltage: substationData.voltage
        });
        console.log(`Created new substation: ${substationName}`);
      } else {
        // Update existing
        if (substationData.voltage && !substation.voltage) {
          substation.voltage = substationData.voltage;
          await substation.save();
          console.log(`Updated voltage for substation: ${substationName}`);
        }
      }

      // Now link feeders to this substation
      for (const feederData of substationData.feeders) {
        // Find feeder by name (clean or original)
        const feeder = await Feeder.findOne({
          $or: [
            { name: { $regex: new RegExp(`^${feederData.cleanName}$`, "i") } },
            { name: { $regex: new RegExp(`^${feederData.name}$`, "i") } }
          ]
        });

        if (feeder) {
          if (!feeder.injectionSubstationId || feeder.injectionSubstationId.toString() !== substation._id.toString()) {
            feeder.injectionSubstationId = substation._id;
            feeder.injectionSubstation = substationName;
            await feeder.save();
            console.log(`Linked feeder ${feeder.name} to ${substationName}`);
          }
        } else {
          console.warn(`Could not find feeder: ${feederData.cleanName} (${feederData.name})`);
        }
      }
    }

    // Verify relationships
    console.log("\nVerifying relationships...");
    const orphanFeeders = await Feeder.find({
      $or: [
        { injectionSubstationId: { $exists: false } },
        { injectionSubstationId: null }
      ]
    });
    if (orphanFeeders.length > 0) {
      console.warn(`Found ${orphanFeeders.length} orphan feeders (not linked to any substation):`);
      for (const f of orphanFeeders) {
        console.warn(`- ${f.name}`);
      }
    } else {
      console.log("✅ All feeders are linked to injection substations!");
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

importData();
