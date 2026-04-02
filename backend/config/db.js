
import mongoose from "mongoose";
import dns from "dns";

// Implementation of exponential backoff retry for MongoDB connection
const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY = 2000; // 2 seconds

const connectWithRetry = async (uri, attempt = 1) => {
  try {
    // Trim and sanitize URI to prevent malformed connection strings
    const sanitizedUri = uri.trim();
    
    // Diagnostic check for database name in URI
    const uriObj = sanitizedUri.split('?')[0]; // Ignore query params
    const parts = uriObj.split('/');
    const dbName = parts[parts.length - 1];
    
    if (!dbName || dbName === "") {
      console.warn("[MongoDB] WARNING: No database name detected in connection string. Using 'test' by default.");
    } else {
      console.log(`[MongoDB] Targeting database: ${dbName}`);
    }

    // Programmatic DNS override for development SRV resolution issues
    // This solves querySrv ECONNREFUSED in many local environments
    if (process.env.NODE_ENV === "development") {
      try {
        dns.setServers(["8.8.8.8", "8.8.4.4"]);
      } catch (dnsErr) {
        console.warn("[MongoDB] DNS override skipped:", dnsErr.message);
      }
    }

    const conn = await mongoose.connect(sanitizedUri, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
    });

    console.log(`[MongoDB] MongoDB Connected`);
    
    // Diagnostic check: Count users in the database
    try {
      const userCount = await mongoose.connection.db.collection("users").countDocuments();
      console.log(`[MongoDB] Database Diagnostic: Found ${userCount} users in 'users' collection.`);
    } catch (countErr) {
      console.warn(`[MongoDB] Database Diagnostic Error: ${countErr.message}`);
    }

    return true;
  } catch (error) {
    if (error.message.includes("authentication failed")) {
      console.error("[MongoDB] CRITICAL: Authentication failed. Please verify your username and password.");
      console.error("[MongoDB] Note: If your password contains special characters, ensure they are URL-encoded.");
      return false; // Don't retry auth errors as they won't fix themselves
    }
    
    console.error(`[MongoDB] Attempt ${attempt} failed: ${error.message}`);
    
    if (attempt < MAX_RETRIES) {
      const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
      console.log(`[MongoDB] Retrying in ${delay / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return connectWithRetry(uri, attempt + 1);
    }
    
    return false;
  }
};

const connectDB = async () => {
  // Prefer MONGO_URI as per senior engineering standard, fallback to MONGODB_URI
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (!uri) {
    console.error("[PowerSense] FATAL: MONGO_URI is not set in environment variables.");
    process.exit(1);
  }

  const success = await connectWithRetry(uri);
  
  if (!success) {
    console.error("[PowerSense] FATAL: Failed to connect to MongoDB after multiple attempts.");
    console.error("Troubleshooting Steps:");
    console.error("1. Check if your MONGO_URI is correct (mongodb+srv://...)");
    console.error("2. Ensure 0.0.0.0/0 is whitelisted in MongoDB Atlas Network Access");
    console.error("3. Verify your database user credentials (username/password)");
    console.error("4. Ensure the cluster is active and not paused.");
    
    // In production, we might want to keep the process alive but in a 'degraded' state
    // but for most MERN apps, the app cannot function without the DB.
    if (process.env.NODE_ENV === "production") {
       console.error("[PowerSense] Production startup failed. Exiting.");
       process.exit(1);
    } else {
       console.warn("[PowerSense] Development mode: Keeping process alive for code changes, but DB features will fail.");
    }
  }
};

// Handle post-connection lifecycle events
mongoose.connection.on("error", (err) => {
  console.error(`[MongoDB] Runtime error: ${err.message}`);
});

mongoose.connection.on("disconnected", () => {
  console.warn("[MongoDB] Disconnected from cluster. Mongoose will attempt to reconnect automatically.");
});

mongoose.connection.on("reconnected", () => {
  console.log("[MongoDB] Reconnected successfully.");
});

export default connectDB;