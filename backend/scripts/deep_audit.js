import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

async function deepAudit() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  console.log("=== LGAS COLLECTION DEEP AUDIT ===");
  const totalLgas = await db.collection("lgas").countDocuments();
  console.log(`Total LGAs in DB: ${totalLgas}`);
  const sampleLgas = await db.collection("lgas").find({}).limit(5).toArray();
  sampleLgas.forEach(l => console.log("LGA:", JSON.stringify(l)));

  console.log("\n=== WARDS COLLECTION DEEP AUDIT ===");
  const totalWards = await db.collection("wards").countDocuments();
  console.log(`Total Wards in DB: ${totalWards}`);
  const sampleWards = await db.collection("wards").find({}).limit(5).toArray();
  sampleWards.forEach(w => console.log("Ward:", JSON.stringify(w)));

  console.log("\n=== FEEDERS COLLECTION DEEP AUDIT ===");
  const totalFeeders = await db.collection("feeders").countDocuments();
  console.log(`Total Feeders in DB: ${totalFeeders}`);
  const sampleFeeders = await db.collection("feeders").find({}).limit(5).toArray();
  sampleFeeders.forEach(f => console.log("Feeder:", JSON.stringify(f)));

  console.log("\n=== USERS COLLECTION DEEP AUDIT ===");
  const users = await db.collection("users").find({}).toArray();
  console.log(`Total Users in DB: ${users.length}`);
  users.forEach(u => console.log(`User: ${u.email}, role: ${u.role}, companyId: ${u.companyId}, state: ${u.state}`));

  await mongoose.disconnect();
  process.exit(0);
}

deepAudit();
