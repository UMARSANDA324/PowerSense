import axios from "axios";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import connectDB, { disconnectDB } from "../config/db.js";
import User from "../models/UserModel.js";
import Company from "../models/Company.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5002";

let tokenCompanyA_SuperAdmin = "";
let tokenCompanyA_Admin = "";
let tokenCompanyB_SuperAdmin = "";
let userA_SuperAdmin = null;
let userA_Admin = null;
let userB_SuperAdmin = null;
let companyA = null;
let companyB = null;

async function setupTestData() {
  console.log("🛠️ Setting up test database entities...");
  await connectDB();

  // 1. Create or fetch Company A
  companyA = await Company.findOne({ code: "VTA" });
  if (!companyA) {
    companyA = await Company.create({
      name: "Voice Test Company A",
      shortName: "VTA",
      code: "VTA",
      slug: "voice-test-comp-a",
      status: "active"
    });
  }

  // 2. Create or fetch Company B
  companyB = await Company.findOne({ code: "VTB" });
  if (!companyB) {
    companyB = await Company.create({
      name: "Voice Test Company B",
      shortName: "VTB",
      code: "VTB",
      slug: "voice-test-comp-b",
      status: "active"
    });
  }

  const bcrypt = (await import("bcryptjs")).default;
  const passwordHash = await bcrypt.hash("password123", 10);

  // Company A Super Admin
  userA_SuperAdmin = await User.findOne({ email: "superadmin_a@voicetest.com" });
  if (!userA_SuperAdmin) {
    userA_SuperAdmin = await User.create({
      fullName: "CompA SuperAdmin",
      email: "superadmin_a@voicetest.com",
      password: passwordHash,
      role: "company-super-admin",
      companyId: companyA._id,
      isActive: true
    });
  }

  // Company A Admin
  userA_Admin = await User.findOne({ email: "admin_a@voicetest.com" });
  if (!userA_Admin) {
    userA_Admin = await User.create({
      fullName: "CompA Admin",
      email: "admin_a@voicetest.com",
      password: passwordHash,
      role: "admin",
      companyId: companyA._id,
      isActive: true
    });
  }

  // Company B Super Admin
  userB_SuperAdmin = await User.findOne({ email: "superadmin_b@voicetest.com" });
  if (!userB_SuperAdmin) {
    userB_SuperAdmin = await User.create({
      fullName: "CompB SuperAdmin",
      email: "superadmin_b@voicetest.com",
      password: passwordHash,
      role: "company-super-admin",
      companyId: companyB._id,
      isActive: true
    });
  }

  await disconnectDB();
  console.log("✅ Test entities initialized in DB.");
}

async function loginUsers() {
  console.log("🔑 Logging in test users...");
  const login = async (email) => {
    const res = await axios.post(`${BASE_URL}/api/auth/login`, {
      email,
      password: "password123"
    });
    return res.data.token;
  };

  tokenCompanyA_SuperAdmin = await login("superadmin_a@voicetest.com");
  tokenCompanyA_Admin = await login("admin_a@voicetest.com");
  tokenCompanyB_SuperAdmin = await login("superadmin_b@voicetest.com");
  console.log("✅ Logged in all test users successfully.");
}

async function runVoiceMessagingTests() {
  console.log("\n🚀 RUNNING PRODUCTION VOICE MESSAGING TEST SUITE");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  const assert = (condition, testName, details = "") => {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName} - ${details}`);
      failed++;
    }
  };

  try {
    await setupTestData();
    await loginUsers();

    const headersA_Super = { Authorization: `Bearer ${tokenCompanyA_SuperAdmin}` };
    const headersA_Admin = { Authorization: `Bearer ${tokenCompanyA_Admin}` };
    const headersB_Super = { Authorization: `Bearer ${tokenCompanyB_SuperAdmin}` };

    // -------------------------------------------------------------
    // TEST 1: Text Messaging (Super Admin -> Admin -> Reply)
    // -------------------------------------------------------------
    console.log("\n1️⃣  Testing Text Messaging Flow...");
    let message1Id = null;
    try {
      const res1 = await axios.post(
        `${BASE_URL}/api/company-messages`,
        {
          recipientId: userA_Admin._id,
          recipientType: "direct",
          subject: "Test Text Message",
          body: "Hello Admin, this is a test text message."
        },
        { headers: headersA_Super }
      );
      assert(res1.status === 201 && res1.data.data.messageType === "text", "Super Admin -> Admin text message sent");
      message1Id = res1.data.data._id;
    } catch (err) {
      assert(false, "Super Admin -> Admin text message sent", err.response?.data?.message || err.message);
    }

    try {
      const resReply = await axios.post(
        `${BASE_URL}/api/company-messages`,
        {
          recipientId: userA_SuperAdmin._id,
          recipientType: "direct",
          subject: "Re: Test Text Message",
          body: "Hello Super Admin, replying to text message.",
          parentId: message1Id
        },
        { headers: headersA_Admin }
      );
      assert(resReply.status === 201 && resReply.data.data.parentId === message1Id, "Admin -> Super Admin text reply sent");
    } catch (err) {
      assert(false, "Admin -> Super Admin text reply sent", err.response?.data?.message || err.message);
    }

    // -------------------------------------------------------------
    // TEST 2: Voice Messaging (Super Admin -> Admin & Admin -> Super Admin)
    // -------------------------------------------------------------
    console.log("\n2️⃣  Testing Voice Messaging Flow...");

    const dummyAudioBuffer = Buffer.from("GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQACAVYAZACFgiV2ZWJtSFcBhoEBVl9hYnNvdXRoC19hb3B1cy1lbmNvZGVy...", "utf-8");
    const dummyAudioBase64 = `data:audio/webm;base64,${dummyAudioBuffer.toString("base64")}`;

    let voiceMsgCompA = null;

    try {
      const resVoice1 = await axios.post(
        `${BASE_URL}/api/company-messages/voice`,
        {
          recipientId: userA_Admin._id,
          recipientType: "direct",
          subject: "Voice Note 1",
          audioData: dummyAudioBase64,
          audioDuration: 4.5,
          audioMimeType: "audio/webm"
        },
        { headers: headersA_Super }
      );
      voiceMsgCompA = resVoice1.data.data;
      assert(
        resVoice1.status === 201 &&
          voiceMsgCompA.messageType === "voice" &&
          voiceMsgCompA.audioUrl.startsWith("/api/company-messages/voice/audio/"),
        "Super Admin -> Admin voice message uploaded & saved"
      );
    } catch (err) {
      assert(false, "Super Admin -> Admin voice message uploaded", err.response?.data?.message || err.message);
    }

    try {
      const resVoice2 = await axios.post(
        `${BASE_URL}/api/company-messages/voice`,
        {
          recipientId: userA_SuperAdmin._id,
          recipientType: "direct",
          subject: "Voice Reply",
          audioData: dummyAudioBase64,
          audioDuration: 3.2,
          audioMimeType: "audio/webm",
          parentId: voiceMsgCompA?._id
        },
        { headers: headersA_Admin }
      );
      assert(
        resVoice2.status === 201 && resVoice2.data.data.messageType === "voice",
        "Admin -> Super Admin voice reply uploaded"
      );
    } catch (err) {
      assert(false, "Admin -> Super Admin voice reply uploaded", err.response?.data?.message || err.message);
    }

    // -------------------------------------------------------------
    // TEST 3: Audio Stream & Tenant Isolation Enforcement
    // -------------------------------------------------------------
    console.log("\n3️⃣  Testing Audio Streaming & Tenant Isolation Security...");

    if (voiceMsgCompA) {
      const audioPath = voiceMsgCompA.audioUrl;

      // Authorized stream by Company A Admin
      try {
        const streamResA = await axios.get(`${BASE_URL}${audioPath}`, { headers: headersA_Admin });
        assert(streamResA.status === 200, "Authorized Company A recipient can stream audio");
      } catch (err) {
        assert(false, "Authorized Company A recipient can stream audio", err.response?.data?.message || err.message);
      }

      // Authorized stream using ?token= query parameter (for native <audio src="...">)
      try {
        const streamTokenRes = await axios.get(`${BASE_URL}${audioPath}?token=${tokenCompanyA_Admin}`);
        assert(streamTokenRes.status === 200, "Authorized user can stream audio via ?token= parameter");
      } catch (err) {
        assert(false, "Authorized user can stream audio via ?token= parameter", err.response?.data?.message || err.message);
      }

      // Unauthorized stream attempt by Company B Super Admin -> EXPECT 403 FORBIDDEN
      try {
        await axios.get(`${BASE_URL}${audioPath}`, { headers: headersB_Super });
        assert(false, "Company B cannot access Company A voice message (Tenant Isolation)", "Request unexpectedly succeeded");
      } catch (err) {
        assert(
          err.response?.status === 403,
          "Company B cannot access Company A voice message (Tenant Isolation)",
          `HTTP ${err.response?.status} - ${err.response?.data?.message}`
        );
      }

      // Cross-tenant voice message creation attempt (Company A Super Admin sending to Company B Super Admin) -> EXPECT 403
      try {
        await axios.post(
          `${BASE_URL}/api/company-messages/voice`,
          {
            recipientId: userB_SuperAdmin._id,
            recipientType: "direct",
            audioData: dummyAudioBase64,
            audioDuration: 2.0,
            audioMimeType: "audio/webm"
          },
          { headers: headersA_Super }
        );
        assert(false, "Cannot send voice message across tenant boundaries", "Request unexpectedly succeeded");
      } catch (err) {
        assert(
          err.response?.status === 403,
          "Cannot send voice message across tenant boundaries",
          `HTTP ${err.response?.status} - ${err.response?.data?.message}`
        );
      }
    }

    // -------------------------------------------------------------
    // TEST 4: Validation & Failure Cases
    // -------------------------------------------------------------
    console.log("\n4️⃣  Testing Failure & Edge Cases...");

    // Missing Audio Payload -> EXPECT 400
    try {
      await axios.post(
        `${BASE_URL}/api/company-messages/voice`,
        {
          recipientId: userA_Admin._id,
          recipientType: "direct",
          audioDuration: 5.0
        },
        { headers: headersA_Super }
      );
      assert(false, "Missing audio payload rejected with 400", "Request unexpectedly succeeded");
    } catch (err) {
      assert(err.response?.status === 400, "Missing audio payload rejected with 400", `HTTP ${err.response?.status}`);
    }

    // Invalid MIME Type -> EXPECT 415
    try {
      await axios.post(
        `${BASE_URL}/api/company-messages/voice`,
        {
          recipientId: userA_Admin._id,
          recipientType: "direct",
          audioData: dummyAudioBase64,
          audioDuration: 5.0,
          audioMimeType: "application/x-executable"
        },
        { headers: headersA_Super }
      );
      assert(false, "Invalid audio MIME type rejected with 415", "Request unexpectedly succeeded");
    } catch (err) {
      assert(err.response?.status === 415, "Invalid audio MIME type rejected with 415", `HTTP ${err.response?.status}`);
    }

    // Oversized Audio (> 10MB) -> EXPECT 413
    try {
      const hugeBuffer = Buffer.alloc(11 * 1024 * 1024, "a");
      const hugeBase64 = `data:audio/webm;base64,${hugeBuffer.toString("base64")}`;
      await axios.post(
        `${BASE_URL}/api/company-messages/voice`,
        {
          recipientId: userA_Admin._id,
          recipientType: "direct",
          audioData: hugeBase64,
          audioDuration: 300,
          audioMimeType: "audio/webm"
        },
        { headers: headersA_Super }
      );
      assert(false, "Oversized audio (>10MB) rejected with 413", "Request unexpectedly succeeded");
    } catch (err) {
      assert(err.response?.status === 413, "Oversized audio (>10MB) rejected with 413", `HTTP ${err.response?.status}`);
    }

    // Unauthenticated Stream Attempt -> EXPECT 401
    try {
      await axios.get(`${BASE_URL}/api/company-messages/voice/audio/nonexistent.webm`);
      assert(false, "Unauthenticated stream request rejected with 401", "Request unexpectedly succeeded");
    } catch (err) {
      assert(err.response?.status === 401, "Unauthenticated stream request rejected with 401", `HTTP ${err.response?.status}`);
    }

    console.log("\n==================================================");
    console.log(`📊 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log("==================================================");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (globalErr) {
    console.error("💥 Global Test Suite Error:", globalErr);
    process.exit(1);
  }
}

runVoiceMessagingTests();
