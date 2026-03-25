
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

connectDB();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true
  }
});

// App configuration and monitoring
app.use(helmet({ contentSecurityPolicy: false })); // CSP off to allow Inline scripts locally if needed
app.use(compression());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Dynamic CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
};
app.use(cors(corsOptions));

// Global Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // Limit each IP to 1k requests per window
  message: "Too many requests from this IP, please try again after 15 minutes",
});
app.use("/api/", limiter);

// Attach io to request object
app.use((req, res, next) => {
  req.io = io;
  next();
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/location", locationRoutes);
app.use("/api/power", powerRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/notifications", notificationRoutes);

// --- Production: Serving SPA Frontend Build ---
if (process.env.NODE_ENV === "production") {
  // Serve frontend build from backend directly (Path for Render mostly)
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "../frontend", "dist", "index.html"));
  });
} else {
  app.get("/", (req, res) => {
    res.send("PowerSense API Running (Development)...");
  });
}

// Error Management
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

io.on("connection", (socket) => {
  console.log("Client connected to real-time grid");

  socket.on("join", (data) => {
    const { userId, feeder, ward, lga, state } = data;
    if (userId) {
      socket.join(`user_${userId}`);
      console.log(`User joined personal room: user_${userId}`);
    }
    if (feeder) {
      socket.join(`feeder_${feeder}`);
      console.log(`User joined feeder room: feeder_${feeder}`);
    }
    if (ward) {
      socket.join(`ward_${ward}`);
    }
    if (lga) {
      socket.join(`lga_${lga}`);
    }
    if (state) {
      socket.join(`state_${state}`);
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected from grid");
  });
});

httpServer.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);