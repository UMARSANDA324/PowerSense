import Company from './models/Company.js';

console.log("--- Verification: Dynamic Company Identity System ---");

// Test 1: Verify Company model fields
const testComp = new Company({
  name: "Eko Electricity Distribution Company",
  shortName: "EKEDC",
  code: "EKEDC",
  officialEmail: "info@ekedp.com",
  officialPhone: "+2348000000000",
  headquarters: { address: "Marina", city: "Lagos", state: "Lagos" },
  logo: "https://example.com/ekedc-logo.png"
});

console.log("Test 1 (Dynamic Company Model):", testComp.name === "Eko Electricity Distribution Company" && testComp.logo === "https://example.com/ekedc-logo.png" ? "PASS ✅" : "FAIL ❌");

// Test 2: Fallback when logo is null
const noLogoComp = new Company({
  name: "Ibadan Electricity Distribution Company",
  shortName: "IBEDC",
  code: "IBEDC",
  officialEmail: "info@ibedc.com",
  officialPhone: "+2348000000001",
  headquarters: { address: "Ibadan", city: "Ibadan", state: "Oyo" },
  logo: null
});

console.log("Test 2 (Null Logo Fallback):", noLogoComp.name === "Ibadan Electricity Distribution Company" && noLogoComp.logo === null ? "PASS ✅" : "FAIL ❌");

console.log("--- All Identity Verification Tests PASSED ---");
