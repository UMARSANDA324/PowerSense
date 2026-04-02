import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/UserModel.js";
import bcrypt from "bcryptjs";
dotenv.config();

async function fixAuthentication() {
  try {
    console.log("🔧 ===== AUTHENTICATION FIX =====");
    
    // Connect to database
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    await mongoose.connect(uri);
    console.log("✅ Connected to MongoDB");
    
    // Get database info
    const db = mongoose.connection.db;
    console.log(`🗄️  Database: ${db.databaseName}`);
    
    // Check current users
    const userCount = await User.countDocuments();
    console.log(`👥 Current user count: ${userCount}`);
    
    if (userCount === 0) {
      console.log("⚠️  No users found. Creating test users...");
      
      // Create test user
      const testUser = new User({
        fullName: "Test User",
        email: "test@example.com",
        password: "123456", // Will be hashed by pre-save hook
        phone: "+1234567890",
        role: "user"
      });
      
      await testUser.save();
      console.log("✅ Created test user: test@example.com / 123456");
      
      // Create admin user
      const adminUser = new User({
        fullName: "System Administrator", 
        email: "admin@powersense.com",
        password: "admin123", // Will be hashed by pre-save hook
        phone: "+0987654321",
        role: "admin"
      });
      
      await adminUser.save();
      console.log("✅ Created admin user: admin@powersense.com / admin123");
      
    } else {
      console.log("✅ Users already exist in database");
      
      // Test authentication
      const testUser = await User.findOne({ email: "test@example.com" });
      if (testUser) {
        const isMatch = await testUser.matchPassword("123456");
        console.log(`🔐 Test user auth: ${isMatch ? 'SUCCESS' : 'FAILED'}`);
        
        if (!isMatch) {
          console.log("🔧 Fixing password hash...");
          testUser.password = "123456";
          await testUser.save();
          console.log("✅ Password hash fixed");
        }
      }
      
      const adminUser = await User.findOne({ email: "admin@powersense.com" });
      if (adminUser) {
        const isMatch = await adminUser.matchPassword("admin123");
        console.log(`🔐 Admin user auth: ${isMatch ? 'SUCCESS' : 'FAILED'}`);
        
        if (!isMatch) {
          console.log("🔧 Fixing admin password hash...");
          adminUser.password = "admin123";
          await adminUser.save();
          console.log("✅ Admin password hash fixed");
        }
      }
    }
    
    // Final verification
    const finalCount = await User.countDocuments();
    console.log(`📊 Final user count: ${finalCount}`);
    
    // Test login simulation
    const loginTest = await User.findOne({ email: "test@example.com" }).select("+password");
    if (loginTest) {
      const loginMatch = await loginTest.matchPassword("123456");
      console.log(`🔓 Login simulation: ${loginMatch ? 'SUCCESS' : 'FAILED'}`);
    }
    
    await mongoose.disconnect();
    console.log("🏁 Authentication fix complete\n");
    
  } catch (error) {
    console.error("💥 Fix error:", error.message);
  }
}

fixAuthentication();
