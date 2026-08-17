import mongoose from "mongoose";
import dotenv from "dotenv";
import { chatAssistant } from "./services/aiService.js";
import User from "./models/UserModel.js";

dotenv.config();

async function run() {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    console.log("Connecting to database...");
    await mongoose.connect(uri);
    console.log("Connected. Finding admin user...");
    const admin = await User.findOne({ email: "admin@litha.com" });
    
    // Set a custom chat session ID to simulate session memory
    const context = {
      sessionId: "test-conversational-session-123",
      feeder: "Sallari 11kv",
      area: "Sheka Arewa"
    };

    // Case 1: Initial query resolving context
    console.log("\n=================== QUERY 1: Why is there no light? ===================");
    let res1 = await chatAssistant({
      userQuery: "Why is there no light?",
      context,
      user: admin
    });
    console.log("RESPONSE 1:\n", res1.text);

    // Case 2: Follow-up query inheriting resolved context
    console.log("\n=================== QUERY 2: When will power return? (no feeder specified) ===================");
    let res2 = await chatAssistant({
      userQuery: "When will power return?",
      context: { sessionId: "test-conversational-session-123" }, // No feeder/area passed!
      user: admin
    });
    console.log("RESPONSE 2:\n", res2.text);

    // Case 3: Follow-up query in Hausa inheriting resolved context
    console.log("\n=================== QUERY 3: Yaushe wuta zata dawo? (Hausa follow-up) ===================");
    let res3 = await chatAssistant({
      userQuery: "Yaushe wuta zata dawo?",
      context: { sessionId: "test-conversational-session-123" }, // No feeder/area passed!
      user: admin
    });
    console.log("RESPONSE 3:\n", res3.text);

    // Case 4: Follow-up query on feeder health inheriting context
    console.log("\n=================== QUERY 4: Is my feeder healthy? ===================");
    let res4 = await chatAssistant({
      userQuery: "Is my feeder healthy?",
      context: { sessionId: "test-conversational-session-123" }, // No feeder/area passed!
      user: admin
    });
    console.log("RESPONSE 4:\n", res4.text);

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error during V2 test:", err);
  }
}

run();
