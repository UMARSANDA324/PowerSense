import User from "../models/UserModel.js";
import bcrypt from "bcryptjs";

// Seed default users if database is empty
export const seedDatabase = async () => {
  try {
    const userCount = await User.countDocuments();
    
    if (userCount === 0) {
      console.log("[Seed] Database is empty. Creating default users...");
      
      // CRITICAL: Seed users WITHOUT companyId to prevent cross-tenant data leakage
      // New companies must create their own users with proper companyId assignment
      
      // Create platform owner user (no companyId - belongs to platform)
      const platformOwnerUser = new User({
        fullName: "Platform Owner",
        email: "platform@litha.com",
        password: "platform123",
        phone: "+1234567890",
        role: "platform-owner",
        isActive: true,
        notificationPreference: "email"
        // companyId is intentionally null for platform owner
      });
      
      await platformOwnerUser.save();
      console.log("[Seed] ✅ Created platform owner: platform@litha.com / platform123");
      
      console.log("[Seed] Database seeding completed successfully!");
      console.log("[Seed] ⚠️  NOTE: Seeded users have no companyId. New companies must create their own users.");
      return true;
    } else {
      console.log(`[Seed] Database already has ${userCount} users. Skipping seeding.`);
      return false;
    }
  } catch (error) {
    console.error("[Seed] Error seeding database:", error);
    return false;
  }
};

// Verify database connection and user count
export const verifyDatabase = async () => {
  try {
    const userCount = await User.countDocuments();
    console.log(`[Database] Current user count: ${userCount}`);
    
    if (userCount === 0) {
      console.log("[Database] ⚠️  No users found. Registration will be needed to create accounts.");
    } else {
      console.log("[Database] ✅ Users exist in database. Authentication should work.");
    }
    
    return userCount;
  } catch (error) {
    console.error("[Database] Error verifying database:", error);
    return 0;
  }
};
