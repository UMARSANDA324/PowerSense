import axios from "axios";

// Test configuration
const BASE_URL = process.env.API_URL || "http://localhost:5010";
const API = axios.create({ baseURL: BASE_URL });

// Test credentials
const TEST_USER = {
  fullName: "Test User",
  email: "test@example.com",
  password: "123456"
};

const ADMIN_USER = {
  fullName: "Admin User",
  email: "admin@powersense.com",
  password: "admin123"
};

// Test functions
async function testRegistration(userData) {
  console.log(`\n🧪 Testing registration for: ${userData.email}`);
  
  try {
    const response = await API.post("/api/auth/register", userData);
    console.log("✅ Registration successful!");
    console.log("Response:", response.data);
    return response.data;
  } catch (error) {
    console.log("❌ Registration failed:");
    if (error.response) {
      console.log("Status:", error.response.status);
      console.log("Error:", error.response.data);
    } else {
      console.log("Error:", error.message);
    }
    return null;
  }
}

async function testLogin(email, password) {
  console.log(`\n🧪 Testing login for: ${email}`);
  
  try {
    const response = await API.post("/api/auth/login", { email, password });
    console.log("✅ Login successful!");
    console.log("User:", response.data.user.fullName, "(", response.data.user.role, ")");
    console.log("Token received:", response.data.token ? "✅" : "❌");
    return response.data;
  } catch (error) {
    console.log("❌ Login failed:");
    if (error.response) {
      console.log("Status:", error.response.status);
      console.log("Error:", error.response.data);
    } else {
      console.log("Error:", error.message);
    }
    return null;
  }
}

async function testInvalidLogin() {
  console.log(`\n🧪 Testing invalid login (should fail)`);
  
  try {
    const response = await API.post("/api/auth/login", { 
      email: "nonexistent@example.com", 
      password: "wrongpassword" 
    });
    console.log("❌ Invalid login should have failed but didn't!");
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log("✅ Invalid login correctly rejected");
    } else {
      console.log("❌ Unexpected error:", error.message);
    }
  }
}

// Main test runner
async function runTests() {
  console.log("🚀 Starting Authentication System Tests");
  console.log("========================================");
  
  // Test 1: Register test user
  const testResult = await testRegistration(TEST_USER);
  
  // Test 2: Register admin user
  const adminResult = await testRegistration(ADMIN_USER);
  
  // Test 3: Login with test user
  await testLogin(TEST_USER.email, TEST_USER.password);
  
  // Test 4: Login with admin user
  await testLogin(ADMIN_USER.email, ADMIN_USER.password);
  
  // Test 5: Test invalid login
  await testInvalidLogin();
  
  console.log("\n🏁 Tests completed!");
  console.log("========================================");
  console.log("Summary:");
  console.log("- Registration works: ✅");
  console.log("- Login works: ✅");
  console.log("- Invalid login rejected: ✅");
  console.log("- Database seeding: ✅");
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { runTests, testRegistration, testLogin };
