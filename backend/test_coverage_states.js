import { validateCoverageStates } from './utils/companyValidation.js';
import { NIGERIAN_STATES } from './config/states.js';

console.log("--- Testing Coverage States Validation ---");

// Test 1: Valid 1 state
const res1 = validateCoverageStates(["Kano"]);
console.log("Test 1 (1 state Kano):", res1.valid === true ? "PASS ✅" : `FAIL ❌ (${res1.error})`);

// Test 2: Valid 3 states
const res2 = validateCoverageStates(["Kano", "Jigawa", "Katsina"]);
console.log("Test 2 (3 states):", res2.valid === true ? "PASS ✅" : `FAIL ❌ (${res2.error})`);

// Test 3: 0 states
const res3 = validateCoverageStates([]);
console.log("Test 3 (0 states):", res3.valid === false && res3.error.includes("At least one") ? "PASS ✅" : `FAIL ❌ (${res3.error})`);

// Test 4: Duplicate states
const res4 = validateCoverageStates(["Kano", "Jigawa", "Kano"]);
console.log("Test 4 (Duplicate states):", res4.valid === false && res4.error.includes("Duplicate") ? "PASS ✅" : `FAIL ❌ (${res4.error})`);

// Test 5: Invalid state name
const res5 = validateCoverageStates(["Kano", "Atlantis"]);
console.log("Test 5 (Invalid state):", res5.valid === false && res5.error.includes("Invalid Nigerian state") ? "PASS ✅" : `FAIL ❌ (${res5.error})`);

// Test 6: More than 10 states
const elevenStates = NIGERIAN_STATES.slice(0, 11);
const res6 = validateCoverageStates(elevenStates);
console.log("Test 6 (> 10 states):", res6.valid === false && res6.error.includes("more than 10") ? "PASS ✅" : `FAIL ❌ (${res6.error})`);

// Test 7: Exactly 10 states
const tenStates = NIGERIAN_STATES.slice(0, 10);
const res7 = validateCoverageStates(tenStates);
console.log("Test 7 (10 states):", res7.valid === true ? "PASS ✅" : `FAIL ❌ (${res7.error})`);

console.log("--- All tests executed ---");
