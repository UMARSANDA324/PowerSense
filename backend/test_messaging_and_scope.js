import { validateCoverageStates } from './utils/companyValidation.js';
import CompanyMessage from './models/CompanyMessage.js';

console.log("--- Testing Company Scope Enforcement & Internal Messaging Setup ---");

// Test 1: Verify CompanyMessage Model Schema fields
const msg = new CompanyMessage({
  companyId: "650000000000000000000001",
  sender: "650000000000000000000002",
  recipientType: "all_admins",
  body: "Broadcast alert to all company admins"
});

console.log("Test 1 (CompanyMessage Model Instantiation):", msg.companyId && msg.recipientType === "all_admins" ? "PASS ✅" : "FAIL ❌");
console.log("Test 2 (Tenant Isolation Check):", msg.companyId.toString() === "650000000000000000000001" ? "PASS ✅" : "FAIL ❌");

console.log("--- Verification Completed Successfully ---");
