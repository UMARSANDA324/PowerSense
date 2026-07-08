import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/UserModel.js";
import { seedDatabase } from "../utils/seedDatabase.js";

dotenv.config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB.");
    const deleted = await User.deleteMany({});
    console.log(`Deleted ${deleted.deletedCount} users.`);
    await seedDatabase();
  } catch (err) {
    console.error("Error cleaning and seeding:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

run();
