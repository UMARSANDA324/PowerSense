import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, "..", ".env");
dotenv.config({ path: envPath });

import Feeder from "../models/Location/Feeder.js";
import User from "../models/UserModel.js";
import PowerStatus from "../models/PowerStatus.js";
import PowerLog from "../models/PowerLog.js";
import Report from "../models/Report.js";

const removeDuplicateSallari = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Find all feeders with name containing "Sallari 11kV"
    const sallariFeeders = await Feeder.find({
      name: { $regex: /Sallari.*11kV/i }
    }).sort({ createdAt: 1 }); // Sort by creation time, keep the oldest

    console.log(`Found ${sallariFeeders.length} Sallari 11kV feeders`);
    if (sallariFeeders.length <= 1) {
      console.log("No duplicates to remove.");
      await mongoose.disconnect();
      return;
    }

    const keeper = sallariFeeders[0]; // Keep the first one
    const toDelete = sallariFeeders.slice(1); // Delete the rest
    const toDeleteIds = toDelete.map(f => f._id);

    console.log(`Keeping feeder: ${keeper.name} (${keeper._id})`);
    console.log(`Deleting feeders: ${toDelete.map(f => `${f.name} (${f._id})`).join(", ")}`);

    // --- Reassign relationships ---
    console.log("\nReassigning relationships...");

    // 1. Update Users (assignedFeeders)
    const userUpdateResult = await User.updateMany(
      { assignedFeeders: { $in: toDeleteIds } },
      { $pull: { assignedFeeders: { $in: toDeleteIds } } }
    );
    // Also add the keeper if not already present
    await User.updateMany(
      { assignedFeeders: { $in: toDeleteIds } },
      { $addToSet: { assignedFeeders: keeper._id } }
    );
    console.log(`Updated ${userUpdateResult.modifiedCount} users`);

    // 2. Update Users with feeder field
    const userFeederUpdateResult = await User.updateMany(
      { feeder: { $in: toDeleteIds } },
      { feeder: keeper._id }
    );
    console.log(`Updated ${userFeederUpdateResult.modifiedCount} users' feeder field`);

    // 3. Update PowerStatus
    const powerStatusUpdateResult = await PowerStatus.updateMany(
      { feeder: { $in: toDeleteIds } },
      { feeder: keeper._id }
    );
    console.log(`Updated ${powerStatusUpdateResult.modifiedCount} PowerStatus records`);

    // 4. Update PowerLog
    const powerLogUpdateResult = await PowerLog.updateMany(
      { feeder: { $in: toDeleteIds } },
      { feeder: keeper._id }
    );
    console.log(`Updated ${powerLogUpdateResult.modifiedCount} PowerLog records`);

    // 5. Update Reports
    const reportUpdateResult = await Report.updateMany(
      { feeder: { $in: toDeleteIds } },
      { feeder: keeper._id }
    );
    console.log(`Updated ${reportUpdateResult.modifiedCount} Report records`);

    // --- Delete duplicates ---
    console.log("\nDeleting duplicate feeders...");
    const deleteResult = await Feeder.deleteMany({ _id: { $in: toDeleteIds } });
    console.log(`Deleted ${deleteResult.deletedCount} duplicate feeders`);

    // Verify remaining feeders
    const remainingSallari = await Feeder.find({ name: { $regex: /Sallari.*11kV/i } });
    console.log(`\n✅ Done! Remaining Sallari 11kV feeders: ${remainingSallari.length}`);
    remainingSallari.forEach(f => console.log(`  - ${f.name} (${f._id})`));

    await mongoose.disconnect();
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

removeDuplicateSallari();
