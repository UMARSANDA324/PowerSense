
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Models
import Feeder from "../models/Location/Feeder.js";
import InjectionSubstation from "../models/Location/InjectionSubstation.js";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

async function verifyHierarchy() {
  try {
    // Connect to DB
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGO_URI or MONGODB_URI not defined in .env");
    await mongoose.connect(uri);
    console.log("Connected to MongoDB\n");

    // Get all injection substations
    const substations = await InjectionSubstation.find({ status: { $ne: "inactive" } })
      .sort({ name: 1 })
      .lean();

    console.log(`Total Injection Substations: ${substations.length}\n`);

    for (const substation of substations) {
      const feeders = await Feeder.find({
        injectionSubstationId: substation._id,
        isActive: { $ne: false }
      }).sort({ name: 1 }).lean();

      console.log(`📦 ${substation.name} (${feeders.length} feeders)`);
      for (const feeder of feeders) {
        console.log(`  • ${feeder.name}`);
      }
      console.log();
    }

    console.log("\n✅ Verification complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error verifying hierarchy:", error);
    process.exit(1);
  }
}

verifyHierarchy();
