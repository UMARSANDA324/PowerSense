import mongoose from "mongoose";
import User from "../models/UserModel.js";

export const debugDatabase = async () => {
  console.log("\n🔍 ===== DATABASE DEBUGGING REPORT =====");
  
  try {
    // 1. Check connection details
    const conn = mongoose.connection;
    console.log(`📡 Connection Status: ${conn.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED'}`);
    console.log(`📍 Connection Host: ${conn.host}`);
    console.log(`🗄️  Connection Name: ${conn.name}`);
    console.log(`🔗 Connection Port: ${conn.port}`);
    
    // 2. List all databases
    try {
      const admin = conn.db.admin();
      const databases = await admin.listDatabases();
      console.log(`\n📊 Available Databases:`);
      databases.databases.forEach(db => {
        console.log(`   - ${db.name} (size: ${db.sizeOnDisk || 'N/A'})`);
      });
    } catch (err) {
      console.log(`\n❌ Error listing databases: ${err.message}`);
    }
    
    // 3. List all collections in current database
    try {
      const collections = await conn.db.listCollections().toArray();
      console.log(`\n📁 Collections in '${conn.db.databaseName}':`);
      if (collections.length === 0) {
        console.log("   No collections found");
      } else {
        collections.forEach(collection => {
          console.log(`   - ${collection.name}`);
        });
      }
    } catch (err) {
      console.log(`\n❌ Error listing collections: ${err.message}`);
    }
    
    // 4. Check users collection specifically
    try {
      const usersCollection = conn.db.collection("users");
      const userCount = await usersCollection.countDocuments();
      console.log(`\n👥 Users Collection Analysis:`);
      console.log(`   Collection name: "users"`);
      console.log(`   Document count: ${userCount}`);
      
      if (userCount > 0) {
        // Get sample user documents
        const sampleUsers = await usersCollection.find({}).limit(3).toArray();
        console.log(`   Sample users:`);
        sampleUsers.forEach((user, index) => {
          console.log(`     ${index + 1}. Email: ${user.email}, Name: ${user.fullName}, ID: ${user._id}`);
        });
      }
    } catch (err) {
      console.log(`\n❌ Error accessing users collection: ${err.message}`);
    }
    
    // 5. Check using Mongoose User model
    try {
      console.log(`\n🔍 Mongoose User Model Test:`);
      console.log(`   Model name: User`);
      console.log(`   Collection name: ${User.collection.name}`);
      
      const mongooseUserCount = await User.countDocuments();
      console.log(`   User.countDocuments(): ${mongooseUserCount}`);
      
      if (mongooseUserCount > 0) {
        const sampleMongooseUsers = await User.find({}).limit(3).select('email fullName role');
        console.log(`   Sample users via Mongoose:`);
        sampleMongooseUsers.forEach((user, index) => {
          console.log(`     ${index + 1}. Email: ${user.email}, Name: ${user.fullName}, Role: ${user.role}`);
        });
      }
      
      // Test specific user lookup
      const testEmail = "test@example.com";
      const foundUser = await User.findOne({ email: testEmail });
      console.log(`   User.findOne({ email: "${testEmail}" }): ${foundUser ? 'FOUND' : 'NOT FOUND'}`);
      if (foundUser) {
        console.log(`     Found user: ${foundUser.fullName} (${foundUser._id})`);
      }
      
    } catch (err) {
      console.log(`\n❌ Error with Mongoose User model: ${err.message}`);
    }
    
    // 6. Check for alternative collection names
    try {
      const alternativeNames = ["User", "user", "Users"];
      console.log(`\n🔍 Checking Alternative Collection Names:`);
      
      for (const name of alternativeNames) {
        try {
          const altCollection = conn.db.collection(name);
          const count = await altCollection.countDocuments();
          if (count > 0) {
            console.log(`   ⚠️  Collection "${name}" has ${count} documents!`);
            
            // Show sample
            const sample = await altCollection.find({}).limit(2).toArray();
            sample.forEach((doc, index) => {
              console.log(`     Sample ${index + 1}: ${JSON.stringify({ email: doc.email, name: doc.fullName || doc.name })}`);
            });
          }
        } catch (err) {
          // Collection doesn't exist, which is expected for most names
        }
      }
    } catch (err) {
      console.log(`\n❌ Error checking alternative collections: ${err.message}`);
    }
    
  } catch (error) {
    console.error(`\n💥 Critical debugging error: ${error.message}`);
  }
  
  console.log("\n🏁 ===== END DEBUGGING REPORT =====\n");
};

export const fixDatabaseInconsistency = async () => {
  console.log("\n🔧 ===== ATTEMPTING DATABASE FIX =====");
  
  try {
    const conn = mongoose.connection;
    
    // Check if users exist in alternative collections
    const alternativeNames = ["User", "user", "Users"];
    
    for (const altName of alternativeNames) {
      try {
        const altCollection = conn.db.collection(altName);
        const count = await altCollection.countDocuments();
        
        if (count > 0) {
          console.log(`\n🔄 Found ${count} documents in "${altName}" collection`);
          console.log(`   Attempting to migrate to "users" collection...`);
          
          // Get all documents from alternative collection
          const documents = await altCollection.find({}).toArray();
          
          // Insert into users collection
          const usersCollection = conn.db.collection("users");
          
          for (const doc of documents) {
            // Ensure document has required fields
            if (!doc.email) {
              console.log(`   ⚠️  Skipping document without email: ${doc._id}`);
              continue;
            }
            
            // Check if user already exists in users collection
            const existingUser = await usersCollection.findOne({ email: doc.email });
            if (existingUser) {
              console.log(`   ⚠️  User ${doc.email} already exists in users collection, skipping...`);
              continue;
            }
            
            // Prepare document for users collection
            const userDoc = {
              fullName: doc.fullName || doc.name || 'Unknown',
              email: doc.email,
              password: doc.password, // Should already be hashed
              phone: doc.phone || '',
              role: doc.role || 'user',
              state: doc.state || '',
              lga: doc.lga || '',
              ward: doc.ward || '',
              feeder: doc.feeder || '',
              isActive: doc.isActive !== undefined ? doc.isActive : true,
              notificationPreference: doc.notificationPreference || 'push',
              createdAt: doc.createdAt || new Date(),
              updatedAt: doc.updatedAt || new Date()
            };
            
            await usersCollection.insertOne(userDoc);
            console.log(`   ✅ Migrated user: ${doc.email}`);
          }
          
          console.log(`   ✅ Migration from "${altName}" to "users" completed!`);
        }
      } catch (err) {
        console.log(`   ❌ Error checking "${altName}": ${err.message}`);
      }
    }
    
    // Final verification
    const finalCount = await conn.db.collection("users").countDocuments();
    console.log(`\n📊 Final users collection count: ${finalCount}`);
    
  } catch (error) {
    console.error(`\n💥 Fix error: ${error.message}`);
  }
  
  console.log("\n🏁 ===== END DATABASE FIX =====\n");
};
