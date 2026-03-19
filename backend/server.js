
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoute.js";
import adminRoutes from "./routes/adminRoutes.js";
import locationRoutes from "./routes/locationRoutes.js";
import powerRoutes from "./routes/powerRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";

dotenv.config();
connectDB();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://127.0.0.1:5173",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true
  }
});

// Attach io to request object so it can be used in routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/location", locationRoutes);
app.use("/api/power", powerRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/notifications", notificationRoutes);

app.get("/", (req, res) => {
  res.send("PowerSense API Running...");
});

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