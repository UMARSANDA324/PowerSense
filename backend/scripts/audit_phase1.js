import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import State from "../models/Location/State.js";
import LGA from "../models/Location/LGA.js";
import Ward from "../models/Location/Ward.js";
import InjectionSubstation from "../models/Location/InjectionSubstation.js";
// Import Community model if exists, otherwise check what we have
const __dirname = new URL('.', import.meta.url).pathname;
dotenv.config({ path: "../.env" });

const run = async () => {
  try {
    console.log("📊 Phase 1 Audit Report");
    console.log("=========================");
    console.log("\n🔌 Connecting to database...");
    await connectDB();

    const totalStates = await State.countDocuments();
    const totalLGAs = await LGA.countDocuments();
    const totalWards = await Ward.countDocuments();
    const totalSubstations = await InjectionSubstation.countDocuments();

    console.log("\n✅ Counts:");
    console.log(`  • States: ${totalStates}`);
    console.log(`  • LGAs: ${totalLGAs}`);
    console.log(`  • Wards: ${totalWards}`);
    console.log(`  • Injection Substations: ${totalSubstations}`);

    // Check if there are any missing or invalid records
    const statesWithoutLGAs = await State.aggregate([
      {
        $lookup: {
          from: "lgas",
          localField: "_id",
          foreignField: "state",
          as: "lgas"
        }
      },
      {
        $match: {
          lgas: { $size: 0 }
        }
      }
    ]);

    const lgasWithoutWards = await LGA.aggregate([
      {
        $lookup: {
          from: "wards",
          localField: "_id",
          foreignField: "lga",
          as: "wards"
        }
      },
      {
        $match: {
          wards: { $size: 0 }
        }
      }
    ]);

    console.log("\n⚠️ Missing Relationships:");
    console.log(`  • States without LGAs: ${statesWithoutLGAs.length}`);
    console.log(`  • LGAs without Wards: ${lgasWithoutWards.length}`);

    const substationsWithoutCoordinates = await InjectionSubstation.countDocuments({
      $or: [{ latitude: null }, { longitude: null }]
    });

    console.log("\n📍 Geocoding Status:");
    console.log(`  • Substations with coordinates: ${totalSubstations - substationsWithoutCoordinates}`);
    console.log(`  • Substations without coordinates: ${substationsWithoutCoordinates}`);

    // Verify Kano is present
    const kano = await State.findOne({ name: "Kano" });
    console.log("\n🌍 Kano State Status:");
    console.log(`  • Exists: ${kano ? "✅ Yes" : "❌ No"}`);

    if (kano) {
      const kanoLGAs = await LGA.countDocuments({ state: kano._id });
      const kanoWards = await Ward.countDocuments({ state: kano._id });
      console.log(`  • LGAs in Kano: ${kanoLGAs}`);
      console.log(`  • Wards in Kano: ${kanoWards}`);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Audit failed:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

run();
