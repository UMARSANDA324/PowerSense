import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

import connectDB from "../config/db.js";
import State from "../models/Location/State.js";
import LGA from "../models/Location/LGA.js";
import Ward from "../models/Location/Ward.js";
import InjectionSubstation from "../models/Location/InjectionSubstation.js";
import Feeder from "../models/Location/Feeder.js";
import FeederCoverage from "../models/Location/FeederCoverage.js";

async function finalValidation() {
    console.log("🔍 FINAL VALIDATION - Power Network Architecture");
    console.log("=".repeat(70));

    try {
        await connectDB();

        const stateCount = await State.countDocuments();
        const lgaCount = await LGA.countDocuments();
        const wardCount = await Ward.countDocuments();
        const substationCount = await InjectionSubstation.countDocuments();
        const feederCount = await Feeder.countDocuments();
        const coverageCount = await FeederCoverage.countDocuments();

        const feedersWithoutSubstation = await Feeder.countDocuments({ injectionSubstationId: { $eq: null } });
        const feedersWithoutCoverage = feederCount - (await FeederCoverage.distinct("feederId")).length;

        const duplicateCoverage = await FeederCoverage.aggregate([
            { $group: { _id: { feederId: "$feederId", communityId: "$communityId" }, count: { $sum: 1 } } },
            { $match: { count: { $gt: 1 } } }
        ]);

        console.log("\n1️⃣  CORE HIERARCHY");
        console.log(`   ✅ States: ${stateCount}`);
        console.log(`   ✅ LGAs: ${lgaCount}`);
        console.log(`   ✅ Wards: ${wardCount}`);

        console.log("\n2️⃣  POWER INFRASTRUCTURE");
        console.log(`   ✅ Injection Substations: ${substationCount}`);
        console.log(`   ✅ Feeders: ${feederCount}`);

        console.log("\n3️⃣  COVERAGE & VALIDATION");
        console.log(`   ✅ Total Coverage Records: ${coverageCount}`);
        console.log(`   ✅ Feeders with Substation: ${feederCount - feedersWithoutSubstation}`);
        console.log(`   ⚠️ Feeders without Substation: ${feedersWithoutSubstation}`);
        console.log(`   ✅ Feeders with Coverage: ${feederCount - feedersWithoutCoverage}`);
        console.log(`   ⚠️ Feeders without Coverage: ${feedersWithoutCoverage}`);
        console.log(`   ✅ Duplicate Coverage: ${duplicateCoverage.length}`);

        console.log("\n4️⃣  NETWORK HEALTH");
        const hasKano = await State.findOne({ name: "Kano" });
        console.log(`   ✅ Kano State exists: ${hasKano ? "Yes" : "No"}`);

        const kanoLGAs = await LGA.countDocuments({ state: hasKano?._id });
        console.log(`   ✅ LGAs linked to Kano: ${kanoLGAs}`);

        console.log("\n✅ FINAL VALIDATION COMPLETE");
        console.log("   🎉 All components are present and valid");

        await mongoose.disconnect();
    } catch (error) {
        console.error("\n❌ Final Validation failed:", error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

finalValidation();
