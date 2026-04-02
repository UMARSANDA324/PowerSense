import User from "../models/UserModel.js";
import bcrypt from "bcryptjs";

// Seed default users if database is empty
export const seedDatabase = async () => {
  try {
    const userCount = await User.countDocuments();
    
    if (userCount === 0) {
      console.log("[Seed] Database is empty. Creating default users...");
      
      // Create test user
      const testUserPassword = await bcrypt.hash("123456", 10);
      const testUser = new User({
        fullName: "Test User",
        email: "test@example.com",
        password: testUserPassword,
        phone: "+1234567890",
        role: "user",
        isActive: true,
        notificationPreference: "push"
      });
      
      await testUser.save();
      console.log("[Seed] ✅ Created test user: test@example.com / 123456");
      
      // Create admin user
      const adminPassword = await bcrypt.hash("admin123", 10);
      const adminUser = new User({
        fullName: "System Administrator",
        email: "admin@powersense.com",
        password: adminPassword,
        phone: "+0987654321",
        role: "admin",
        isActive: true,
        notificationPreference: "email"
      });
      
      await adminUser.save();
      console.log("[Seed] ✅ Created admin user: admin@powersense.com / admin123");
      
      console.log("[Seed] Database seeding completed successfully!");
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
