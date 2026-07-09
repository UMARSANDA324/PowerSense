
import dotenv from "dotenv";
import fs from "fs";
dotenv.config();

import express from "express";
import cors from "cors";
import path from "path";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { Server } from "socket.io";
import connectDB, { disconnectDB } from "./config/db.js";
import { seedDatabase, verifyDatabase } from "./utils/seedDatabase.js";
import authRoutes from "./routes/authRoute.js";
import adminRoutes from "./routes/adminRoutes.js";
import locationRoutes from "./routes/locationRoutes.js";
import powerRoutes from "./routes/powerRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import predictionRoutes from "./routes/predictionRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import { startPredictionScheduler, startReminderScheduler } from "./utils/cronJobs.js";
import { errorHandler, notFound } from "./middleware/errorMiddleware.js";

// --- Validate critical environment variables on startup ---
const REQUIRED_ENV = ["JWT_SECRET"];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);

// Standardize on MONGO_URI, but allow MONGODB_URI as fallback
if (!process.env.MONGO_URI && !process.env.MONGODB_URI) {
  missing.push("MONGO_URI");
}

if (missing.length > 0) {
  console.error(`[PowerSense] FATAL: Missing required environment variables: ${missing.join(", ")}`);
  console.error("[PowerSense] Please set these in your Render Environment settings.");
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../.env");

console.log("[Env Debug] dotenv loaded");
console.log(`[Env Debug] cwd=${process.cwd()}`);
console.log(`[Env Debug] env file path=${envPath}`);
console.log(`[Env Debug] GEMINI_API_KEY present=${Boolean(process.env.GEMINI_API_KEY)}`);
console.log(`[Env Debug] GEMINI_API_KEY preview=${process.env.GEMINI_API_KEY ? `${process.env.GEMINI_API_KEY.slice(0, 8)}...` : "<missing>"}`);
console.log(`[Env Debug] GEMINI_API_KEY length=${process.env.GEMINI_API_KEY?.length || 0}`);

const app = express();
const httpServer = createServer(app);

// Global request logger
app.use((req, res, next) => {
  console.log(`[Request] ${req.method} ${req.url}`);
  next();
});

// --- Build allowed origins list ---
// FRONTEND_URL can be a comma-separated list of origins for flexibility
// e.g. "https://powersense.onrender.com,http://localhost:5173"
const getAllowedOrigins = () => {
  const raw = process.env.FRONTEND_URL || "http://localhost:5173";
  const origins = raw.split(",").map((url) => url.trim()).filter(Boolean);

  // Add production origins if they are not already present
  const productionOrigins = [
    "https://powersense-1.onrender.com",
    "https://powersense-2.onrender.com",
    "https://powersense-1.onrender.com/",
    "https://powersense-2.onrender.com/",
    "http://localhost:5173",
    "http://127.0.0.1:5173"
  ];

  productionOrigins.forEach(origin => {
    // Check both with and without trailing slash
    const normalized = origin.replace(/\/$/, "");
    if (!origins.includes(normalized)) {
      origins.push(normalized);
    }
  });

  return origins;
};

const allowedOrigins = getAllowedOrigins();
console.log(`[PowerSense] CORS allowed origins: ${allowedOrigins.join(", ")}`);

const corsOptions = {
  origin: (origin, callback) => {
    // In development, allow everything for debugging
    if (process.env.NODE_ENV !== "production") {
      return callback(null, true);
    }

    // Allow requests with no origin (e.g., Postman, mobile apps, server-to-server)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn(`[PowerSense] CORS blocked request from: ${origin}`);
    callback(null, false);
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

const io = new Server(httpServer, { cors: corsOptions });

// --- Middleware stack ---
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
// Body parsers — MUST be before routes for JSON/form data to be parsed
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cors(corsOptions));

// --- Rate Limiting ---
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { message: "Too many requests from this IP, please try again after 15 minutes" },
  standardHeaders: true,
  legacyHeaders: false,
});

if (process.env.NODE_ENV === "production") {
  app.use("/api/", limiter);
} else {
  console.log("[PowerSense] Development mode: API rate limiting disabled for local debugging.");
}

// --- Attach Socket.io to request ---
app.use((req, res, next) => {
  req.io = io;
  next();
});

// --- Health Check endpoint (useful for Render health checks) ---
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", environment: process.env.NODE_ENV });
});

// --- API Routes ---
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/location", locationRoutes);
app.use("/api/power", powerRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/predictions", predictionRoutes);
app.use("/api/ai", aiRoutes);

// --- Production: Serve SPA Frontend Build (single-service mode) ---
// Note: This block only runs if NODE_ENV=production AND the frontend/dist folder exists.
if (process.env.NODE_ENV === "production") {
  const frontendPath = path.join(__dirname, "../frontend/dist");

  // Check if the directory exists before attempting to serve it
  if (fs.existsSync(frontendPath)) {
    console.log(`[PowerSense] Serving static frontend from: ${frontendPath}`);
    app.use(express.static(frontendPath));

    // All non-API routes return the React app
    app.get("*path", (req, res, next) => {
      // If the request is for an API route that wasn't matched above, let it pass to 404 handler
      if (req.path.startsWith("/api/")) return next();

      const indexPath = path.resolve(frontendPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        next();
      }
    });
  } else {
    console.warn("[PowerSense] Production mode active but /frontend/dist not found. " +
      "Ensure frontend is built before starting backend or that services are separate.");
    app.get("/", (req, res) => {
      res.status(200).json({
        message: "PowerSense API is active. Frontend build missing.",
        note: "If this is a separate service deployment, this is expected."
      });
    });
  }
} else {
  app.get("/", (req, res) => {
    res.send("PowerSense API is running in development mode.");
  });
}

// --- Error handling (must be after routes) ---
app.use(notFound);
app.use(errorHandler);

// --- Socket.io real-time events ---
io.on("connection", (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  socket.on("join", (data) => {
    const { userId, feeder, ward, lga, state } = data;
    if (userId) socket.join(`user_${userId}`);
    if (feeder) socket.join(`feeder_${feeder}`);
    if (ward) socket.join(`ward_${ward}`);
    if (lga) socket.join(`lga_${lga}`);
    if (state) socket.join(`state_${state}`);
  });

  socket.on("disconnect", () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// --- Initialize Application ---
const initializeApp = async () => {
  try {
    // Step 1: Connect to MongoDB first
    console.log('[PowerSense] Initializing application...');
    await connectDB();
    
    // Step 2: Verify database and seed if needed
    await verifyDatabase();
    
    // Only seed in development or if explicitly enabled
    if (process.env.NODE_ENV === "development" || process.env.SEED_DATABASE === "true") {
      await seedDatabase();
    }
    
    // Step 3: Start prediction scheduler after DB connection
    const enablePredictions = process.env.ENABLE_PREDICTIONS === "true" || process.env.NODE_ENV !== "production";
    if (enablePredictions) {
      try {
        startPredictionScheduler(io);
        console.log("[PowerSense] Prediction scheduler started.");
      } catch (err) {
        console.error("[PowerSense] Failed to start prediction scheduler:", err.message);
      }
    }

    // Step 3.5: Start reminder scheduler
    try {
      startReminderScheduler(io);
      console.log("[PowerSense] Reminder scheduler started.");
    } catch (err) {
      console.error("[PowerSense] Failed to start reminder scheduler:", err.message);
    }
    
    // Step 4: Start HTTP server
    const PORT = process.env.PORT || 5000;
    httpServer.listen(PORT, () => {
      console.log(`[PowerSense] ✅ Server running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode`);
      console.log(`[PowerSense] Process ID: ${process.pid}`);
    }).on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`[PowerSense] FATAL: Port ${PORT} is already in use.`);
        console.error(`[PowerSense] Please kill the process using port ${PORT} and restart.`);
        process.exit(1);
      } else {
        console.error(`[PowerSense] Server error:`, err);
      }
    });
    
  } catch (error) {
    console.error('[PowerSense] FATAL: Application initialization failed:', error.message);
    process.exit(1);
  }
};

// Start the application
initializeApp();
