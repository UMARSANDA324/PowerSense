
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load .env from project root (not backend directory)
const envPath = path.resolve(__dirname, "../.env");
dotenv.config({ path: envPath });

// Platform Owner Environment Debug
console.log('\nPlatform Owner Environment Check');
console.log('Loaded .env:');
console.log(envPath);
console.log('');
console.log(`PLATFORM_OWNER_NAME ..... ${process.env.PLATFORM_OWNER_NAME ? 'FOUND' : 'MISSING'}`);
console.log(`PLATFORM_OWNER_EMAIL .... ${process.env.PLATFORM_OWNER_EMAIL ? 'FOUND' : 'MISSING'}`);
console.log(`PLATFORM_OWNER_PASSWORD . ${process.env.PLATFORM_OWNER_PASSWORD ? 'FOUND' : 'MISSING'}`);
console.log('');

import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { createServer } from "http";
import { Server } from "socket.io";
import connectDB, { disconnectDB } from "./config/db.js";
import { seedDatabase, verifyDatabase } from "./utils/seedDatabase.js";
import { seedDefaultCompany } from "./utils/seedCompany.js";
import { seedDefaultGeography } from "./utils/seedGeography.js";
import authRoutes from "./routes/authRoute.js";
import adminRoutes from "./routes/adminRoutes.js";
import locationRoutes from "./routes/locationRoutes.js";
import powerRoutes from "./routes/powerRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import predictionRoutes from "./routes/predictionRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import companyRoutes from "./routes/companyRoutes.js";
import platformAnalyticsRoutes from "./routes/platformAnalyticsRoutes.js";
import platformOperationsRoutes from "./routes/platformOperationsRoutes.js";
import platformSecurityRoutes from "./routes/platformSecurityRoutes.js";
import enterpriseIntelligenceRoutes from "./routes/enterpriseIntelligenceRoutes.js";
import companyMessageRoutes from "./routes/companyMessageRoutes.js";
import featureFlagRoutes from "./routes/featureFlagRoutes.js";
import referralRoutes from "./routes/referralRoutes.js";
import { startPredictionScheduler, startReminderScheduler } from "./utils/cronJobs.js";
import { errorHandler, notFound } from "./middleware/errorMiddleware.js";
import { softTenantMiddleware } from "./middleware/tenantMiddleware.js";
import { runtimeContextMiddleware } from "./services/runtimeContext.js";
import { operationalScopeMiddleware } from "./services/operationalScope.js";
import { runBootstrap } from "./services/bootstrapService.js";
import { softProtect } from "./middleware/authMiddleware.js";
import jwt from "jsonwebtoken";
import User from "./models/UserModel.js";
import { setPlatformSocketServer } from "./services/platformEventDispatcher.js";

// --- Enterprise Infrastructure ---
// The following enterprise engines are available for use throughout the application:
// - Workflow Engine (services/workflowEngine.js) - Lifecycle management
// - Approval Engine (services/approvalEngine.js) - Approval workflows
// - Audit Engine (services/auditEngine.js) - Audit logging
// - Activity Timeline Engine (services/activityTimelineEngine.js) - Activity tracking
// - Enterprise Utilities (utils/enterpriseUtils.js) - Unified access to all engines
// These engines are non-breaking and can be used optionally in controllers and services.

// --- Validate critical environment variables on startup ---
const REQUIRED_ENV = ["JWT_SECRET"];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);

// Standardize on MONGO_URI, but allow MONGODB_URI as fallback
if (!process.env.MONGO_URI && !process.env.MONGODB_URI) {
  missing.push("MONGO_URI");
}

if (missing.length > 0) {
  console.error(`[Nikola] FATAL: Missing required environment variables: ${missing.join(", ")}`);
  console.error("[Nikola] Please set these in your Render Environment settings.");
  process.exit(1);
}

const app = express();
const httpServer = createServer(app);

// Global request logger
app.use((req, res, next) => {
  console.log(`[Request] ${req.method} ${req.url}`);
  next();
});

// --- Build allowed origins list ---
// FRONTEND_URL can be a comma-separated list of origins for flexibility
// e.g. "https://nikola.onrender.com,http://localhost:5173"
const getAllowedOrigins = () => {
  const raw = process.env.FRONTEND_URL || "http://localhost:5173";
  const origins = raw.split(",").map((url) => url.trim()).filter(Boolean);

  const productionOrigins = [
    "https://nikola.onrender.com",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000"
  ];

  productionOrigins.forEach((origin) => {
    const normalized = origin.replace(/\/$/, "");
    if (!origins.includes(normalized)) {
      origins.push(normalized);
    }
  });

  return origins;
};

const allowedOrigins = getAllowedOrigins();
console.log(`[Nikola] CORS allowed origins: ${allowedOrigins.join(", ")}`);

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

    console.warn(`[Nikola] CORS blocked request from: ${origin}`);
    callback(null, false);
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

const io = new Server(httpServer, { cors: corsOptions });
setPlatformSocketServer(io);

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication required"));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user || !user.isActive) return next(new Error("Socket user unavailable"));

    socket.user = user;
    next();
  } catch (error) {
    next(new Error("Socket authentication failed"));
  }
});

// --- Middleware stack ---
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
// Body parsers — MUST be before routes for JSON/form data to be parsed
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
// Catch JSON parsing syntax errors immediately
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    console.error(`[Nikola] Invalid JSON payload from ${req.ip}:`, err.message);
    return res.status(400).json({
      success: false,
      message: "Invalid JSON format in request body",
      error: err.message
    });
  }
  next(err);
});
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
  console.log("[Nikola] Development mode: API rate limiting disabled for local debugging.");
}

// --- Attach Socket.io to request ---
app.use((req, res, next) => {
  req.io = io;
  next();
});

// --- Tenant Middleware (non-breaking) ---
// This middleware quietly resolves tenant context without changing existing behavior
app.use(softProtect);
app.use(softTenantMiddleware);

// --- Runtime Context Middleware (non-breaking) ---
// This middleware resolves runtime context (user, role, permissions, scope) for each request
// It provides centralized access to context information throughout the request lifecycle
app.use(runtimeContextMiddleware);

// --- Operational Scope Middleware (non-breaking) ---
// This middleware resolves operational scope (what infrastructure user can operate) for each request
// It provides centralized access to operational scope for power control and infrastructure operations
app.use(operationalScopeMiddleware);

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
app.use("/api/companies", companyRoutes);
app.use("/api/platform-analytics", platformAnalyticsRoutes);
app.use("/api/platform-operations", platformOperationsRoutes);
app.use("/api/platform-security", platformSecurityRoutes);
app.use("/api/enterprise-intelligence", enterpriseIntelligenceRoutes);
app.use("/api/company-messages", companyMessageRoutes);
app.use("/api/feature-flags", featureFlagRoutes);
app.use("/api/referral", referralRoutes);

// --- Production: Serve SPA Frontend Build (single-service mode) ---
// Note: This block only runs if NODE_ENV=production AND the frontend/dist folder exists.
if (process.env.NODE_ENV === "production") {
  const frontendPath = path.join(__dirname, "../frontend/dist");

  // Check if the directory exists before attempting to serve it
  if (fs.existsSync(frontendPath)) {
    console.log(`[Nikola] Serving static frontend from: ${frontendPath}`);
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
    console.warn("[Nikola] Production mode active but /frontend/dist not found. " +
      "Ensure frontend is built before starting backend or that services are separate.");
    app.get("/", (req, res) => {
      res.status(200).json({
        message: "Nikola API is active. Frontend build missing.",
        note: "If this is a separate service deployment, this is expected."
      });
    });
  }
} else {
  app.get("/", (req, res) => {
    res.send("Nikola API is running in development mode.");
  });
}

// --- Error handling (must be after routes) ---
app.use(notFound);
app.use(errorHandler);

// --- Socket.io real-time events ---
io.on("connection", (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  const user = socket.user;
  socket.join(`user_${user._id}`);
  socket.join(`role_${user.role}`);
  if (user.companyId) socket.join(`company_${user.companyId}`);
  if (user.ward) socket.join(`ward_${user.ward}`);
  if (user.lga) socket.join(`lga_${user.lga}`);
  if (user.state) socket.join(`state_${user.state}`);
  if (user.feeder) socket.join(`feeder_${user.feeder}`);
  (user.assignedFeeders || []).forEach((feeder) => socket.join(`feeder_${feeder}`));

  // Keep the legacy event for clients that still signal readiness; room membership is server-derived.
  socket.on("join", () => {});

  socket.on("disconnect", () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// --- Initialize Application ---
const initializeApp = async () => {
  try {
    // Step 1: Connect to MongoDB first
    console.log('[Nikola] Initializing application...');
    await connectDB();
    
    // Step 2: Verify database and seed if needed
    await verifyDatabase();
    
    // Only seed in development or if explicitly enabled
    if (process.env.NODE_ENV === "development" || process.env.SEED_DATABASE === "true") {
      await seedDatabase();
    }
    
    // Seed default company and global geography for enterprise compatibility
    await seedDefaultCompany();
    await seedDefaultGeography();
    
    // Step 2.5: Bootstrap Platform Owner (non-breaking)
    try {
      const bootstrapResult = await runBootstrap();
      if (bootstrapResult.success) {
        console.log('[Nikola] Platform bootstrap complete:', bootstrapResult.message);
      } else {
        console.warn('[Nikola] Platform bootstrap warning:', bootstrapResult.message);
      }
    } catch (err) {
      console.error('[Nikola] Platform bootstrap failed (non-critical):', err.message);
      // Bootstrap failure should not prevent server startup
    }
    
    // Step 3: Start prediction scheduler after DB connection
    const enablePredictions = process.env.ENABLE_PREDICTIONS === "true" || process.env.NODE_ENV !== "production";
    if (enablePredictions) {
      try {
        startPredictionScheduler(io);
        console.log("[Nikola] Prediction scheduler started.");
      } catch (err) {
        console.error("[Nikola] Failed to start prediction scheduler:", err.message);
      }
    }

    // Step 3.5: Start reminder scheduler
    try {
      startReminderScheduler(io);
      console.log("[Nikola] Reminder scheduler started.");
    } catch (err) {
      console.error("[Nikola] Failed to start reminder scheduler:", err.message);
    }
    
    // Step 4: Start HTTP server
    const requestedPort = Number.parseInt(process.env.PORT || "5002", 10);
    const PORT = Number.isInteger(requestedPort) && requestedPort > 0 ? requestedPort : 5002;
    console.log(`[Nikola] Resolved runtime port: ${PORT} (env PORT=${process.env.PORT || "<unset>"})`);
    httpServer.listen(PORT, () => {
      console.log(`[Nikola] ✅ Server running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode`);
      console.log(`[Nikola] Process ID: ${process.pid}`);
    }).on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`[Nikola] FATAL: Port ${PORT} is already in use.`);
        console.error(`[Nikola] Please kill the process using port ${PORT} and restart.`);
        process.exit(1);
      } else {
        console.error(`[Nikola] Server error:`, err);
      }
    });
    
  } catch (error) {
    console.error('[Nikola] FATAL: Application initialization failed:', error.message);
    process.exit(1);
  }
};

// Start the application
initializeApp();
