import http from "http";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
if (!process.env.MONGO_URI && !process.env.MONGODB_URI) {
  dotenv.config({ path: path.resolve(__dirname, "../.env") });
}

import User from "../models/UserModel.js";

async function testProfile() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const platformOwner = await User.findOne({ role: "platform-owner" });
  console.log("Found platform owner:", platformOwner?.email);
  if (!platformOwner) {
    console.error("No platform owner");
    process.exit(1);
  }

  const token = jwt.sign(
    { id: platformOwner._id, role: platformOwner.role },
    process.env.JWT_SECRET,
    { expiresIn: "30d" }
  );

  console.log("Generated token. Sending request to http://localhost:5002/api/auth/profile...");

  const req = http.request(
    {
      hostname: "localhost",
      port: 5002,
      path: "/api/auth/profile",
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      },
      timeout: 5000
    },
    (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        console.log(`Status: ${res.statusCode}`);
        console.log("Response:", data);
        process.exit(0);
      });
    }
  );

  req.on("error", (e) => {
    console.error("Request error:", e.message);
    process.exit(1);
  });

  req.on("timeout", () => {
    console.error("Request timed out after 5000ms!");
    req.destroy();
    process.exit(1);
  });

  req.end();
}

testProfile().catch(console.error);
