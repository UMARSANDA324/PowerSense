import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("No MONGODB_URI found");
  process.exit(1);
}

async function reconcileGeography() {
  try {
    console.log("=== STARTING GEOGRAPHY DATA RECONCILIATION ===");
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;

    // 1. Get Canonical States
    const states = await db.collection("states").find({}).toArray();
    const kanoState = states.find(s => (s.name || "").trim().toLowerCase() === "kano");
    const jigawaState = states.find(s => (s.name || "").trim().toLowerCase() === "jigawa");
    const katsinaState = states.find(s => (s.name || "").trim().toLowerCase() === "katsina");

    if (!kanoState) {
      throw new Error("Canonical Kano State not found in DB!");
    }

    console.log(`Canonical Kano State ID: ${kanoState._id}`);
    if (jigawaState) console.log(`Canonical Jigawa State ID: ${jigawaState._id}`);
    if (katsinaState) console.log(`Canonical Katsina State ID: ${katsinaState._id}`);

    const canonicalKanoId = kanoState._id;
    const oldKanoId = new mongoose.Types.ObjectId("69ba929e100465650f3be700");

    // 2. Reconcile LGAs
    console.log("\n--- Reconciling LGAs ---");
    const lgaResult = await db.collection("lgas").updateMany(
      { state: { $in: [oldKanoId, "69ba929e100465650f3be700"] } },
      { $set: { state: canonicalKanoId } }
    );
    console.log(`Updated ${lgaResult.modifiedCount} LGAs to canonical Kano State ID (${canonicalKanoId})`);

    // 3. Reconcile Wards
    console.log("\n--- Reconciling Wards ---");
    const wardResult = await db.collection("wards").updateMany(
      { state: { $in: [oldKanoId, "69ba929e100465650f3be700"] } },
      { $set: { state: canonicalKanoId } }
    );
    console.log(`Updated ${wardResult.modifiedCount} Wards to canonical Kano State ID (${canonicalKanoId})`);

    // 4. Reconcile KEDCO Company Coverage
    console.log("\n--- Reconciling Company Coverage ---");
    const kedcoCompany = await db.collection("companies").findOne({ code: "KEDCO" });
    if (kedcoCompany) {
      const coverageObjectIds = [
        kanoState ? kanoState._id : null,
        jigawaState ? jigawaState._id : null,
        katsinaState ? katsinaState._id : null
      ].filter(Boolean);

      await db.collection("companies").updateOne(
        { _id: kedcoCompany._id },
        { $set: { coverageStates: coverageObjectIds, state: kanoState ? kanoState._id : kedcoCompany.state } }
      );
      console.log(`Updated KEDCO coverageStates to ObjectIds: ${JSON.stringify(coverageObjectIds)}`);
    } else {
      console.log("KEDCO company record not found, skipping company coverage update.");
    }

    // 5. Reconcile Users with string 'Kano' or old ID to canonical State ID if stored
    console.log("\n--- Reconciling Users ---");
    const usersResult = await db.collection("users").updateMany(
      { state: { $in: [oldKanoId, "69ba929e100465650f3be700"] } },
      { $set: { state: "Kano" } }
    );
    console.log(`Reconciled ${usersResult.modifiedCount} Users`);

    // 6. Verification
    const orphanLgas = await db.collection("lgas").countDocuments({ state: oldKanoId });
    const orphanWards = await db.collection("wards").countDocuments({ state: oldKanoId });
    const canonicalLgas = await db.collection("lgas").countDocuments({ state: canonicalKanoId });
    const canonicalWards = await db.collection("wards").countDocuments({ state: canonicalKanoId });

    console.log("\n=== RECONCILIATION SUMMARY ===");
    console.log(`Orphaned LGAs remaining: ${orphanLgas}`);
    console.log(`Orphaned Wards remaining: ${orphanWards}`);
    console.log(`Canonical Kano LGAs count: ${canonicalLgas}`);
    console.log(`Canonical Kano Wards count: ${canonicalWards}`);

    await mongoose.disconnect();
    console.log("\nReconciliation completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Reconciliation error:", error);
    process.exit(1);
  }
}

reconcileGeography();
