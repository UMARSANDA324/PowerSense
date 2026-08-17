
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

import State from "../models/Location/State.js";
import LGA from "../models/Location/LGA.js";
import Ward from "../models/Location/Ward.js";

async function checkIds() {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGO_URI not defined");
    await mongoose.connect(uri);
    console.log("Connected to MongoDB");

    const lga = await LGA.findOne();
    if (lga) {
      console.log("Sample LGA:");
      console.log("lga._id:", lga._id);
      console.log("lga.id:", lga.id);
      console.log("lga.lgaId:", lga.lgaId);
    }

    const ward = await Ward.findOne();
    if (ward) {
      console.log("\nSample Ward:");
      console.log("ward._id:", ward._id);
      console.log("ward.id:", ward.id);
      console.log("ward.areaId:", ward.areaId);
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

checkIds();
