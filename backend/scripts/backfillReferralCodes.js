import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/UserModel.js";
import { generateRandomCode } from "../utils/referralCodeGenerator.js";

dotenv.config();

/**
 * Idempotent script to assign referral codes to all existing users who lack one.
 */
async function backfillReferralCodes() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://localhost:27017/powersense";
  console.log(`[Backfill] Connecting to MongoDB: ${mongoUri}`);

  try {
    await mongoose.connect(mongoUri);
    console.log("[Backfill] Connected to MongoDB.");

    // Find users missing a referral code
    const usersNeedingCode = await User.find({
      $or: [
        { referralCode: { $exists: false } },
        { referralCode: null },
        { referralCode: "" }
      ]
    }).select("_id email fullName referralCode");

    console.log(`[Backfill] Found ${usersNeedingCode.length} users needing a referral code.`);

    if (usersNeedingCode.length === 0) {
      console.log("[Backfill] All users already have referral codes. Nothing to do.");
      await mongoose.disconnect();
      return;
    }

    // Fetch existing codes to prevent collisions in memory
    const existingUsers = await User.find({ referralCode: { $ne: null } }).select("referralCode").lean();
    const usedCodes = new Set(existingUsers.map(u => u.referralCode).filter(Boolean));

    let updatedCount = 0;
    const bulkOps = [];

    for (const user of usersNeedingCode) {
      let code;
      let retries = 0;
      do {
        code = generateRandomCode();
        retries++;
      } while (usedCodes.has(code) && retries < 50);

      usedCodes.add(code);
      bulkOps.push({
        updateOne: {
          filter: { _id: user._id },
          update: { $set: { referralCode: code } }
        }
      });

      updatedCount++;
    }

    if (bulkOps.length > 0) {
      const result = await User.bulkWrite(bulkOps);
      console.log(`[Backfill] Successfully backfilled referral codes for ${result.modifiedCount || updatedCount} users.`);
    }

    console.log("[Backfill] Backfill complete.");
  } catch (error) {
    console.error("[Backfill] Error during backfill:", error);
  } finally {
    await mongoose.disconnect();
    console.log("[Backfill] Disconnected from MongoDB.");
  }
}

backfillReferralCodes();
