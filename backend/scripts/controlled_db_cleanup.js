import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from project root (.env) or backend (.env)
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
if (!process.env.MONGO_URI && !process.env.MONGODB_URI) {
  dotenv.config({ path: path.resolve(__dirname, "../.env") });
}

const uri = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!uri) {
  console.error("FATAL: No MONGO_URI or MONGODB_URI found in environment.");
  process.exit(1);
}

async function runCleanup() {
  console.log("=================================================");
  console.log("       LITHA / POWERSENSE CONTROLLED DB CLEANUP  ");
  console.log("=================================================\n");
  console.log("Connecting to MongoDB...");
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  console.log("Connected successfully.\n");

  // Step 1: Record Before Counts
  console.log(">>> STEP 1: Recording pre-cleanup document counts...");
  const targetCollections = [
    "feeders",
    "injectionsubstations",
    "reports",
    "coordinates",
    "states",
    "lgas",
    "notifications",
    "outages",
    "wards",
    "feedercoverages",
    "powerstatuses"
  ];

  const preservedCollections = [
    "users",
    "companies",
    "platforms",
    "featureflags",
    "analyticsevents",
    "companymessages",
    "powerlogs",
    "predictions",
    "reminders",
    "activitytimelines",
    "countries",
    "audits"
  ];

  const beforeCounts = {};
  for (const colName of [...targetCollections, ...preservedCollections]) {
    try {
      beforeCounts[colName] = await db.collection(colName).countDocuments();
    } catch {
      beforeCounts[colName] = 0;
    }
  }

  console.log("\nTarget Collections (to clean):");
  for (const col of targetCollections) {
    console.log(`  - ${col.padEnd(25)}: ${beforeCounts[col]}`);
  }

  console.log("\nPreserved Collections (to keep):");
  for (const col of preservedCollections) {
    console.log(`  - ${col.padEnd(25)}: ${beforeCounts[col]}`);
  }

  // Step 2: Perform controlled document deletion (DO NOT DROP COLLECTIONS)
  console.log("\n>>> STEP 2: Executing controlled document removal (deleteMany)...");
  for (const col of targetCollections) {
    const result = await db.collection(col).deleteMany({});
    console.log(`  ✅ Cleaned collection '${col}': deleted ${result.deletedCount} documents.`);
  }

  // Step 3: Clean obsolete references in preserved collections
  console.log("\n>>> STEP 3: Cleaning obsolete references in preserved collections...");
  
  // Clean users location fields and empty assignedFeeders
  const userUpdateResult = await db.collection("users").updateMany(
    {},
    {
      $set: {
        assignedFeeders: [],
        feeder: null,
        ward: null,
        lga: null,
        state: null
      }
    }
  );
  console.log(`  ✅ Cleared obsolete location references in ${userUpdateResult.modifiedCount} user document(s).`);

  // Step 4: Verify post-cleanup document counts
  console.log("\n>>> STEP 4: Verifying post-cleanup counts...");
  const afterCounts = {};
  for (const colName of [...targetCollections, ...preservedCollections]) {
    try {
      afterCounts[colName] = await db.collection(colName).countDocuments();
    } catch {
      afterCounts[colName] = 0;
    }
  }

  console.log("\nPost-Cleanup Target Collections (MUST BE 0):");
  let allTargetZero = true;
  for (const col of targetCollections) {
    console.log(`  - ${col.padEnd(25)}: ${afterCounts[col]}`);
    if (afterCounts[col] !== 0) {
      allTargetZero = false;
    }
  }

  console.log("\nPost-Cleanup Preserved Collections:");
  for (const col of preservedCollections) {
    console.log(`  - ${col.padEnd(25)}: ${afterCounts[col]}`);
  }

  // Step 5: Verify collections and indexes still exist
  console.log("\n>>> STEP 5: Verifying collections and indexes still exist...");
  const allDbCols = await db.listCollections().toArray();
  const allColNames = allDbCols.map(c => c.name);

  for (const col of targetCollections) {
    const exists = allColNames.includes(col);
    if (exists) {
      const indexes = await db.collection(col).indexes();
      console.log(`  ✅ Collection '${col}' exists with ${indexes.length} index(es) intact.`);
    } else {
      console.warn(`  ⚠️ Collection '${col}' does not exist in db list.`);
    }
  }

  await mongoose.disconnect();

  if (allTargetZero) {
    console.log("\n=================================================");
    console.log("       CLEANUP COMPLETED SUCCESSFULLY!           ");
    console.log("=================================================\n");
  } else {
    console.error("\n❌ WARNING: Some target collections still have documents.");
    process.exit(1);
  }
}

runCleanup().catch(err => {
  console.error("Cleanup failed with error:", err);
  process.exit(1);
});
