
import dotenv from "dotenv";
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
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoute.js";
import adminRoutes from "./routes/adminRoutes.js";
import locationRoutes from "./routes/locationRoutes.js";
import powerRoutes from "./routes/powerRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
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

connectDB();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

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
    "https://powersense-2.onrender.com/"
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
    // Allow requests with no origin (e.g., Postman, mobile apps, server-to-server)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Fallback: allow any Render subdomain in production if needed, 
    // but we already added the specific ones above.
    // For now, let's just log and block without throwing a server-side error.
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
app.use("/api/", limiter);

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

// --- Production: Serve SPA Frontend Build (single-service mode) ---
if (process.env.NODE_ENV === "production") {
  const frontendPath = path.join(__dirname, "../frontend/dist");
  app.use(express.static(frontendPath));
  // All non-API routes return the React app
  app.get("/", (req, res) => {
    res.sendFile(path.resolve(frontendPath, "index.html"));
  });
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

// --- Start server ---
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`[PowerSense] Server running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  console.log(`[PowerSense] Process ID: ${process.pid}`);
});