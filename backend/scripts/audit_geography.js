import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("No MONGODB_URI found in backend .env");
  process.exit(1);
}

async function runAudit() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB successfully.\n");

    const db = mongoose.connection.db;

    // 1. Audit Countries
    const countries = await db.collection("countries").find({}).toArray();
    console.log("=== COUNTRIES ===");
    console.log(`Total Countries: ${countries.length}`);
    countries.forEach(c => console.log(` - ID: ${c._id}, Name: "${c.name}", Code: "${c.code}", ISO: "${c.isoCode}"`));

    // 2. Audit States
    const states = await db.collection("states").find({}).toArray();
    console.log("\n=== STATES ===");
    console.log(`Total States: ${states.length}`);
    states.forEach(s => console.log(` - ID: ${s._id}, Name: "${s.name}", Country: ${s.country}, CompanyId: ${s.companyId}, Status: ${s.status}`));

    // Group states by name & country
    const statesByName = {};
    states.forEach(s => {
      const key = `${(s.name || "").trim().toLowerCase()}_${s.country}`;
      if (!statesByName[key]) statesByName[key] = [];
      statesByName[key].push(s);
    });

    console.log("\n=== DUPLICATE STATES AUDIT ===");
    let duplicatesFound = false;
    for (const [key, list] of Object.entries(statesByName)) {
      if (list.length > 1) {
        duplicatesFound = true;
        console.log(`DUPLICATE DETECTED: "${list[0].name}" (Country: ${list[0].country}) -> ${list.length} records`);
        list.forEach(s => console.log(`    State ID: ${s._id}, companyId: ${s.companyId}, status: ${s.status}, isActive: ${s.isActive}`));
      }
    }
    if (!duplicatesFound) {
      console.log("No duplicate states found by (name, country).");
    }

    // 3. Inspect Kano Specifically
    const kanoStates = states.filter(s => (s.name || "").trim().toLowerCase() === "kano");
    console.log(`\n=== KANO STATES SPECIFIC AUDIT (${kanoStates.length} records found) ===`);

    for (const kState of kanoStates) {
      const stateId = kState._id;
      console.log(`\n--- Inspecting Kano State ID: ${stateId} (CompanyId: ${kState.companyId}) ---`);

      // LGAs referencing this state
      const lgas = await db.collection("lgas").find({ state: stateId }).toArray();
      console.log(`  LGAs count: ${lgas.length}`);
      if (lgas.length > 0) {
        console.log(`  Sample LGAs (first 5): ${lgas.slice(0, 5).map(l => l.name).join(", ")}`);
      }

      // Wards referencing this state directly
      const wardsByState = await db.collection("wards").find({ state: stateId }).toArray();
      console.log(`  Wards count (by state field): ${wardsByState.length}`);

      // Wards referencing LGAs of this state
      const lgaIds = lgas.map(l => l._id);
      const wardsByLga = await db.collection("wards").find({ lga: { $in: lgaIds } }).toArray();
      console.log(`  Wards count (by LGA references): ${wardsByLga.length}`);

      // Companies referencing this state in coverageStates or state
      const companiesCoverage = await db.collection("companies").find({ coverageStates: stateId }).toArray();
      console.log(`  Companies with this state in coverageStates: ${companiesCoverage.map(c => `${c.name} (${c._id})`).join(", ") || "None"}`);

      const companiesState = await db.collection("companies").find({ state: stateId }).toArray();
      console.log(`  Companies with this state in state field: ${companiesState.map(c => `${c.name} (${c._id})`).join(", ") || "None"}`);

      // Users referencing this state (by ObjectId or string)
      const usersByStateId = await db.collection("users").find({ state: stateId }).toArray();
      const usersByStateName = await db.collection("users").find({ state: "Kano" }).toArray();
      console.log(`  Users referencing state ObjectId (${stateId}): ${usersByStateId.length}`);
      console.log(`  Users referencing state name string "Kano": ${usersByStateName.length}`);

      // Reports referencing this state
      const reportsByStateId = await db.collection("reports").find({ state: stateId }).toArray();
      const reportsByStateName = await db.collection("reports").find({ state: "Kano" }).toArray();
      console.log(`  Reports referencing state ObjectId (${stateId}): ${reportsByStateId.length}`);
      console.log(`  Reports referencing state name string "Kano": ${reportsByStateName.length}`);
    }

    // 4. Audit Companies Coverage Overall
    const companies = await db.collection("companies").find({}).toArray();
    console.log("\n=== COMPANIES & COVERAGE AUDIT ===");
    for (const comp of companies) {
      console.log(`Company: "${comp.name}" (${comp._id}), Code: "${comp.code}"`);
      console.log(`  coverageStates raw: ${JSON.stringify(comp.coverageStates)}`);
      if (comp.coverageStates && comp.coverageStates.length > 0) {
        const resolvedStates = states.filter(s => comp.coverageStates.some(cs => cs && cs.toString() === s._id.toString()));
        console.log(`  Resolved Coverage States: ${resolvedStates.map(s => `${s.name} (${s._id})`).join(", ")}`);
      }
    }

    // 5. Index Audit for Warning Models
    console.log("\n=== INDEX AUDIT FOR SCHEMA WARNINGS ===");
    const collectionsToCheck = ["countries", "platforms", "coordinates"];
    for (const colName of collectionsToCheck) {
      try {
        const indexes = await db.collection(colName).indexes();
        console.log(`Indexes for collection "${colName}":`);
        indexes.forEach(idx => console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)} (unique: ${idx.unique || false})`));
      } catch (err) {
        console.log(`Could not get indexes for "${colName}": ${err.message}`);
      }
    }

    await mongoose.disconnect();
    console.log("\nAudit finished successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Audit error:", error);
    process.exit(1);
  }
}

runAudit();
