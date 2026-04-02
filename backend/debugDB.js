import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/UserModel.js";
dotenv.config();

async function debugDatabase() {
  try {
    console.log("🔍 Starting direct database debugging...");
    
    // Connect to database
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    console.log(`📡 Connecting to: ${uri.replace(/\/\/.*@/, '//***:***@')}`);
    
    await mongoose.connect(uri);
    console.log("✅ Connected to MongoDB");
    
    // Get database info
    const db = mongoose.connection.db;
    console.log(`🗄️  Database name: ${db.databaseName}`);
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log(`📁 Collections found: ${collections.length}`);
    collections.forEach(c => console.log(`   - ${c.name}`));
    
    // Check each collection for user-like data
    const possibleUserCollections = ["users", "Users", "user", "User"];
    
    for (const collectionName of possibleUserCollections) {
      try {
        const collection = db.collection(collectionName);
        const count = await collection.countDocuments();
        console.log(`👥 Collection "${collectionName}": ${count} documents`);
        
        if (count > 0) {
          // Get first few documents to see structure
          const samples = await collection.find({}).limit(2).toArray();
          console.log(`   Sample documents:`);
          samples.forEach((doc, i) => {
            console.log(`     ${i+1}. Email: ${doc.email || 'N/A'}, Name: ${doc.fullName || doc.name || 'N/A'}`);
          });
        }
      } catch (err) {
        // Collection doesn't exist, which is fine
      }
    }
    
    // Test with User model
    try {
      const userCount = await User.countDocuments();
      console.log(`🔍 User model count: ${userCount}`);
      
      if (userCount > 0) {
        const users = await User.find({}).limit(2);
        console.log(`   Sample users from model:`);
        users.forEach((user, i) => {
          console.log(`     ${i+1}. ${user.email} - ${user.fullName}`);
        });
      }
      
      // Test specific user lookup
      const testUser = await User.findOne({ email: "test@example.com" });
      console.log(`🔍 Test user lookup: ${testUser ? 'FOUND' : 'NOT FOUND'}`);
      if (testUser) {
        console.log(`   Found: ${testUser.fullName} (${testUser._id})`);
      }
      
    } catch (err) {
      console.log(`❌ User model error: ${err.message}`);
    }
    
    await mongoose.disconnect();
    console.log("🔍 Database debugging complete");
    
  } catch (error) {
    console.error("💥 Debug error:", error.message);
  }
}

debugDatabase();
