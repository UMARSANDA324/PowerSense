import axios from "axios";

const BASE_URL = "http://localhost:5002";

async function runTest() {
  console.log("🚀 Testing litha AI Assistant Endpoints");
  console.log("==================================================");

  try {
    // 1. Login to get token
    console.log("🔑 Logging in as Admin...");
    const loginRes = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: "admin@litha.com",
      password: "admin123"
    });

    const token = loginRes.data.token;
    console.log("✅ Logged in successfully. Token length:", token.length);

    const headers = { Authorization: `Bearer ${token}` };

    // 2. Query in English: "Why is there no light?"
    console.log("\n💬 Query 1: English - Why is there no light?");
    const res1 = await axios.post(`${BASE_URL}/api/ai/assistant`, {
      question: "Why is there no light?",
      context: {
        feeder: "Sallari 11kv",
        ward: "Sheka Arewa"
      }
    }, { headers });

    console.log("Response Text:\n" + res1.data.result.text);

    // 3. Query in Hausa: "Me yasa babu wuta?"
    console.log("\n💬 Query 2: Hausa - Me yasa babu wuta?");
    const res2 = await axios.post(`${BASE_URL}/api/ai/assistant`, {
      question: "Me yasa babu wuta?",
      context: {
        feeder: "Sallari 11kv",
        ward: "Sheka Arewa"
      }
    }, { headers });

    console.log("Response Text:\n" + res2.data.result.text);

    // 4. Query in English: "When will power return?"
    console.log("\n💬 Query 3: English - When will power return?");
    const res3 = await axios.post(`${BASE_URL}/api/ai/assistant`, {
      question: "When will power return?",
      context: {
        feeder: "Sallari 11kv",
        ward: "Sheka Arewa"
      }
    }, { headers });

    console.log("Response Text:\n" + res3.data.result.text);

  } catch (error) {
    console.error("❌ Test failed:", error.response ? error.response.data : error.message);
  }
}

runTest();
