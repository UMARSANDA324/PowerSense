
import mongoose from "mongoose";

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error("[MongoDB] MONGODB_URI is not set in environment variables.");
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri, {
      // These options ensure stable connections on Atlas in production
      serverSelectionTimeoutMS: 10000, // 10 seconds to find a server
      socketTimeoutMS: 45000,          // Close sockets after 45 seconds of inactivity
    });

    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}`);
    console.log(`[MongoDB] Database: ${conn.connection.name}`);
  } catch (error) {
    console.error(`[MongoDB] Connection FAILED: ${error.message}`);
    console.error("[MongoDB] Check that:");
    console.error("  1. MONGODB_URI is correctly set in Render environment variables");
    console.error("  2. Your MongoDB Atlas cluster is running");
    console.error("  3. Your Render IP is whitelisted in Atlas (set 0.0.0.0/0 to allow all)");
    process.exit(1);
  }
};

// Handle unexpected disconnections
mongoose.connection.on("disconnected", () => {
  console.warn("[MongoDB] Disconnected from database. Attempting to reconnect...");
});

mongoose.connection.on("reconnected", () => {
  console.log("[MongoDB] Reconnected to database.");
});

export default connectDB;