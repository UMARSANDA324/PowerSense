import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

async function run() {
  const uri = process.env.MONGODB_URI;
  console.log("Connecting to cluster...");
  const client = await mongoose.connect(uri);
  console.log("Connected.");
  
  const adminDb = mongoose.connection.db.admin();
  const dbsList = await adminDb.listDatabases();
  console.log("\nDatabases found on cluster:");
  
  for (const dbInfo of dbsList.databases) {
    const dbName = dbInfo.name;
    const dbConn = mongoose.connection.useDb(dbName);
    
    // Check users collection count
    try {
      const collections = await dbConn.db.listCollections().toArray();
      const hasUsers = collections.some(c => c.name === "users");
      if (hasUsers) {
        const count = await dbConn.db.collection("users").countDocuments();
        console.log(`- 🗄️  ${dbName} (Size: ${dbInfo.sizeOnDisk} bytes) -> 'users' collection has ${count} documents`);
      } else {
        console.log(`- 🗄️  ${dbName} (Size: ${dbInfo.sizeOnDisk} bytes) -> No 'users' collection`);
      }
    } catch (e) {
      console.log(`- 🗄️  ${dbName} (Size: ${dbInfo.sizeOnDisk} bytes) -> Error: ${e.message}`);
    }
  }

  await mongoose.disconnect();
  console.log("\nDisconnected.");
}

run();
