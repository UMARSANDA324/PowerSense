import mongoose from "mongoose";

// Define required database name
const REQUIRED_DB_NAME = "test";

// Enterprise-grade MongoDB configuration
const MONGO_OPTIONS = {
  // Connection pool settings
  maxPoolSize: 50, // Maximum number of connections in the pool
  minPoolSize: 5,  // Minimum number of connections in the pool
  
  // Timeout settings
  serverSelectionTimeoutMS: 10000, // Timeout for server selection
  socketTimeoutMS: 45000,          // Socket timeout
  connectTimeoutMS: 10000,          // Connection timeout
  
  // Retry settings
  retryWrites: true,
  retryReads: true,
  
  // Performance settings
  bufferCommands: false, // Disable buffering to prevent timeout errors
  
  // SSL settings (required for MongoDB Atlas)
  ssl: true,
  tlsAllowInvalidCertificates: false,
  
  // Other settings
  autoIndex: process.env.NODE_ENV !== 'production', // Auto-create indexes in dev only
  family: 4 // Use IPv4, skip trying IPv6
};

// Connection state tracking
let isConnected = false;
let connectionPromise = null;

// Helper to get connection state string
const getConnectionStateString = (state) => {
  const states = {
    0: "Disconnected",
    1: "Connected",
    2: "Connecting",
    3: "Disconnecting"
  };
  return states[state] || "Unknown";
};

/**
 * Establish MongoDB connection with enterprise-grade error handling
 * @returns {Promise<boolean>} Connection success status
 */
const connectDB = async () => {
  // Return existing connection promise if connection is in progress
  if (connectionPromise) {
    return connectionPromise;
  }

  // Return immediately if already connected
  if (isConnected && mongoose.connection.readyState === 1) {
    return true;
  }

  connectionPromise = (async () => {
    try {
      // Get MongoDB URI from environment
      const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
      
      if (!uri) {
        throw new Error('MONGO_URI environment variable is not set');
      }

      // Validate URI format
      if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
        throw new Error('Invalid MongoDB URI format. Must start with mongodb:// or mongodb+srv://');
      }

      // Log connection attempt (without exposing credentials)
      const sanitizedUri = uri.replace(/\/\/.*@/, '//***:***@');
      console.log(`[MongoDB] Connecting to: ${sanitizedUri}`);

      // Configure Mongoose
      mongoose.set('strictQuery', false);
      
      // Connect to MongoDB
      await mongoose.connect(uri, MONGO_OPTIONS);
      
      // Get database name and validate
      const dbName = mongoose.connection.db.databaseName;
      
      // Enforce required database name
      if (dbName !== REQUIRED_DB_NAME) {
        console.error(`[MongoDB] ❌ FATAL: Connected to wrong database! Expected '${REQUIRED_DB_NAME}', got '${dbName}'`);
        await mongoose.disconnect();
        throw new Error(`Connected to wrong database. Expected '${REQUIRED_DB_NAME}', got '${dbName}'`);
      }
      
      isConnected = true;
      console.log('[MongoDB] ✅ Connected successfully');
      
      // Log required info as specified
      console.log("\nMongoDB Connected");
      console.log(`Cluster: Cluster0`);
      console.log(`Database: ${dbName}`);
      console.log(`Connection State: ${getConnectionStateString(mongoose.connection.readyState)}\n`);
      
      // Diagnostic: Check collection counts to verify we're in the right database
      try {
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log(`[MongoDB] Collections:`, collections.map(c => c.name));
        
        // Check user count specifically
        const userCount = await mongoose.connection.db.collection('users').countDocuments();
        console.log(`[MongoDB] Users found: ${userCount}`);
        if (userCount > 0) {
          const sampleUser = await mongoose.connection.db.collection('users').findOne({}, { projection: { email: 1, fullName: 1 } });
          console.log(`[MongoDB] Sample user:`, sampleUser);
        }
      } catch (countErr) {
        console.warn(`[MongoDB] Could not check collections (normal if no data yet):`, countErr.message);
      }
      
      return true;
      
    } catch (error) {
      isConnected = false;
      connectionPromise = null;
      
      // Provide actionable error messages
      if (error.name === 'MongoServerSelectionError') {
        console.error('[MongoDB] ❌ Connection failed: Unable to connect to MongoDB server');
        console.error('[MongoDB] Possible causes:');
        console.error('  1. Invalid MONGO_URI in environment variables');
        console.error('  2. MongoDB Atlas IP whitelist does not include your IP');
        console.error('  3. Network connectivity issues');
        console.error('  4. MongoDB cluster is paused or unavailable');
      } else if (error.name === 'MongoParseError') {
        console.error('[MongoDB] ❌ Connection string parse error:', error.message);
      } else if (error.message.includes('authentication failed')) {
        console.error('[MongoDB] ❌ Authentication failed: Invalid username or password');
      } else {
        console.error('[MongoDB] ❌ Connection error:', error.message);
      }
      
      throw error;
    }
  })();

  return connectionPromise;
};

/**
 * Gracefully close MongoDB connection
 */
const disconnectDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      console.log('[MongoDB] Closing connection...');
      await mongoose.connection.close();
      console.log('[MongoDB] ✅ Connection closed');
    }
  } catch (error) {
    console.error('[MongoDB] Error closing connection:', error.message);
  }
};

// Connection event handlers
mongoose.connection.on('connecting', () => {
  console.log('[MongoDB] Connecting...');
});

mongoose.connection.on('connected', () => {
  isConnected = true;
  console.log('[MongoDB] ✅ Connected');
});

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  console.warn('[MongoDB] ⚠️  Disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('[MongoDB] ❌ Error:', err.message);
});

mongoose.connection.on('reconnected', () => {
  isConnected = true;
  console.log('[MongoDB] ✅ Reconnected');
});

// Handle process termination gracefully
const handleShutdown = async (signal) => {
  console.log(`\n[MongoDB] ${signal} received, shutting down gracefully...`);
  await disconnectDB();
  process.exit(0);
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

export { connectDB, disconnectDB };
export default connectDB;