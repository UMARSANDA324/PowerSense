import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

async function checkStateReferences() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const statesInStatesCol = await db.collection("states").find({}).toArray();
  const stateIdMap = {};
  statesInStatesCol.forEach(s => {
    stateIdMap[s._id.toString()] = s;
  });

  console.log("=== DISTINCT STATE REFERENCES IN LGAS ===");
  const lgaStates = await db.collection("lgas").distinct("state");
  for (const st of lgaStates) {
    const stStr = st ? st.toString() : "null";
    const exists = stateIdMap[stStr];
    const count = await db.collection("lgas").countDocuments({ state: st });
    console.log(`LGA state ref: ${stStr} | Exists in 'states'? ${!!exists} (${exists ? exists.name : "ORPHANED"}) | LGAs count: ${count}`);
  }

  console.log("\n=== DISTINCT STATE REFERENCES IN WARDS ===");
  const wardStates = await db.collection("wards").distinct("state");
  for (const st of wardStates) {
    const stStr = st ? st.toString() : "null";
    const exists = stateIdMap[stStr];
    const count = await db.collection("wards").countDocuments({ state: st });
    console.log(`Ward state ref: ${stStr} | Exists in 'states'? ${!!exists} (${exists ? exists.name : "ORPHANED"}) | Wards count: ${count}`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

checkStateReferences();
