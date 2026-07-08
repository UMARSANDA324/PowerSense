import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/db.js";

dotenv.config({ path: "../.env" });

const run = async () => {
  try {
    console.log("Connecting to DB...");
    await connectDB();

    console.log("Dropping InjectionSubstations collection to remove old indexes...");
    const db = mongoose.connection.db;
    await db.dropCollection("injectionsubstations").catch((e) => {
      console.log("Collection didn't exist, skipping drop");
    });

    console.log("Done!");
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

run();
