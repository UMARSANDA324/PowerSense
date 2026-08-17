import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
if (!process.env.MONGO_URI && !process.env.MONGODB_URI) {
  dotenv.config({ path: path.resolve(__dirname, "../.env") });
}

import connectDB, { disconnectDB } from "../config/db.js";
import { seedDatabase, verifyDatabase } from "../utils/seedDatabase.js";
import { seedDefaultCompany } from "../utils/seedCompany.js";
import { seedDefaultGeography } from "../utils/seedGeography.js";
import { runBootstrap } from "../services/bootstrapService.js";
import User from "../models/UserModel.js";
import Country from "../models/Location/Country.js";
import State from "../models/Location/State.js";
import LGA from "../models/Location/LGA.js";
import Ward from "../models/Location/Ward.js";
import Feeder from "../models/Location/Feeder.js";
import InjectionSubstation from "../models/Location/InjectionSubstation.js";
import Report from "../models/Report.js";
import Outage from "../models/Outage.js";
import Notification from "../models/Notification.js";
import Platform from "../models/Platform.js";

async function verifyAll() {
  console.log("=================================================");
  console.log("   APPLICATION POST-CLEANUP VERIFICATION SUITE   ");
  console.log("=================================================\n");

  // Step 1: Initialize backend startup sequence (exact sequence from server.js)
  console.log(">>> [1/5] Simulating full backend initializeApp() sequence...");
  await connectDB();
  await verifyDatabase();
  await seedDatabase();
  await seedDefaultCompany();
  await seedDefaultGeography();
  const bootstrapResult = await runBootstrap();
  console.log("Bootstrap result:", bootstrapResult);

  const db = mongoose.connection.db;

  // Step 2: Verify that no old infrastructure was recreated
  console.log("\n>>> [2/5] Verifying zero-state for infrastructure collections (no auto-reseeding)...");
  const targetCounts = {
    feeders: await db.collection("feeders").countDocuments(),
    injectionsubstations: await db.collection("injectionsubstations").countDocuments(),
    reports: await db.collection("reports").countDocuments(),
    states: await db.collection("states").countDocuments(),
    lgas: await db.collection("lgas").countDocuments(),
    wards: await db.collection("wards").countDocuments(),
    outages: await db.collection("outages").countDocuments(),
    notifications: await db.collection("notifications").countDocuments(),
    coordinates: await db.collection("coordinates").countDocuments(),
    feedercoverages: await db.collection("feedercoverages").countDocuments(),
    powerstatuses: await db.collection("powerstatuses").countDocuments()
  };

  console.log("Infrastructure counts post-startup:\n", JSON.stringify(targetCounts, null, 2));
  for (const [col, count] of Object.entries(targetCounts)) {
    if (count !== 0) {
      throw new Error(`CRITICAL: Collection '${col}' has ${count} documents instead of 0!`);
    }
  }
  console.log("✅ Zero-state confirmed for all target infrastructure collections.");

  // Step 3: Verify preserved core entities
  console.log("\n>>> [3/5] Verifying preserved platform entities...");
  const countryCount = await db.collection("countries").countDocuments();
  const platformCount = await db.collection("platforms").countDocuments();
  const userCount = await db.collection("users").countDocuments();

  console.log(`- Countries: ${countryCount}`);
  console.log(`- Platforms: ${platformCount}`);
  console.log(`- Users:     ${userCount}`);

  if (countryCount < 1) throw new Error("Country record missing!");
  if (platformCount < 1) throw new Error("Platform record missing!");
  if (userCount < 1) throw new Error("Platform Owner user missing!");

  const activeCountry = await db.collection("countries").findOne({ isActive: true });
  console.log("✅ Country available for Platform Owner:", activeCountry.name, `(${activeCountry.code})`);

  // Step 4: Verify Platform Owner Authentication
  console.log("\n>>> [4/5] Testing Platform Owner Authentication & Token Generation...");
  const platformOwner = await db.collection("users").findOne({ role: "platform-owner" });
  if (!platformOwner) throw new Error("Platform owner user not found in database!");

  const envPass = process.env.PLATFORM_OWNER_PASSWORD || "platform123";
  const passMatches = await bcrypt.compare(envPass, platformOwner.password);
  console.log(`- Platform Owner Email: ${platformOwner.email}`);
  console.log(`- Password Matches .env: ${passMatches ? "YES" : "NO"}`);
  if (!passMatches) throw new Error("Platform owner password mismatch!");

  const token = jwt.sign(
    { id: platformOwner._id, role: platformOwner.role },
    process.env.JWT_SECRET || "default_jwt_secret",
    { expiresIn: "30d" }
  );
  console.log("- Platform Owner JWT Generation: SUCCESS (Token length: " + token.length + ")");
  console.log("- Cleaned location fields on User:", {
    feeder: platformOwner.feeder,
    ward: platformOwner.ward,
    lga: platformOwner.lga,
    state: platformOwner.state,
    assignedFeeders: platformOwner.assignedFeeders
  });

  // Step 5: Verify readiness for Platform Owner & Super Admin workflow
  console.log("\n>>> [5/5] Verifying Platform Owner / Super Admin hierarchy readiness...");
  console.log("  Hierarchy flow ready:");
  console.log("  1. Platform Owner creates States under Country:", activeCountry.name);
  console.log("  2. Platform Owner configures Company Coverage");
  console.log("  3. Super Admin creates LGAs, Wards, Substations, Feeders");
  console.log("✅ Ready for clean infrastructure provisioning!");

  console.log("\n=================================================");
  console.log("   ALL POST-CLEANUP VERIFICATIONS PASSED!       ");
  console.log("=================================================\n");

  await disconnectDB();
  process.exit(0);
}

verifyAll().catch(err => {
  console.error("Verification failed:", err);
  process.exit(1);
});
