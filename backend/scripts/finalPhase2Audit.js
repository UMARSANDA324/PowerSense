import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

import Feeder from "../models/Location/Feeder.js";
import InjectionSubstation from "../models/Location/InjectionSubstation.js";
import State from "../models/Location/State.js";
import Ward from "../models/Location/Ward.js";
import LGA from "../models/Location/LGA.js";

const runAudit = async () => {
  console.log('\n🔍 Phase 2 Final Audit Report');
  console.log('================================');

  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const counts = {
      states: await State.countDocuments(),
      lgas: await LGA.countDocuments(),
      wards: await Ward.countDocuments(),
      injectionSubstations: await InjectionSubstation.countDocuments(),
      feeders: await Feeder.countDocuments(),
      feedersWithSubstation: await Feeder.countDocuments({ injectionSubstationId: { $ne: null } }),
      feedersWithoutSubstation: await Feeder.countDocuments({ injectionSubstationId: null }),
      feedersWithoutBand: await Feeder.countDocuments({ band: null }),
      feedersWithCoords: await Feeder.countDocuments({ coordinates: { $ne: null } }),
      duplicateSlugs: (await Feeder.aggregate([
        { $group: { _id: '$slug', count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } }
      ])).length
    };

    console.log('\n1️⃣ Database Inventory');
    console.log(`  • States: ${counts.states}`);
    console.log(`  • LGAs: ${counts.lgas}`);
    console.log(`  • Wards: ${counts.wards}`);
    console.log(`  • Injection Substations: ${counts.injectionSubstations}`);
    console.log(`  • Feeders: ${counts.feeders}`);

    console.log('\n2️⃣ Feeder Validation');
    console.log(`  ✔ Feeders with assigned substation: ${counts.feedersWithSubstation}`);
    console.log(`  ✔ Feeders without substation: ${counts.feedersWithoutSubstation}`);
    console.log(`  ✔ Feeders with coordinates: ${counts.feedersWithCoords}`);
    console.log(`  ✔ Duplicate feeders by slug: ${counts.duplicateSlugs}`);

    console.log('\n3️⃣ Example Feeders (with Substation)');
    const exampleFeeders = await Feeder.find({ injectionSubstationId: { $ne: null } })
      .limit(5)
      .populate('injectionSubstationId', 'name');

    exampleFeeders.forEach((f, i) => {
      const subName = f.injectionSubstationId ? f.injectionSubstationId.name : '(none)';
      console.log(`  ${i+1}. ${f.name} (${f.band}) → ${subName}`);
    });

    console.log('\n4️⃣ Example Injection Substations');
    const exampleSubs = await InjectionSubstation.find().limit(5);
    exampleSubs.forEach((s, i) => {
      console.log(`  ${i+1}. ${s.name} (${s.latitude}, ${s.longitude})`);
    });

    console.log('\n✅ Phase 2 Complete!');
    await mongoose.disconnect();

  } catch (error) {
    console.error('❌ Audit failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

runAudit();
