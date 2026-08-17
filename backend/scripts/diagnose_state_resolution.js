/**
 * Deep diagnostic: trace resolveAllowedStateNamesForUser step by step
 */
import dotenv from 'dotenv';
dotenv.config({ path: 'e:/PowerSense/.env' });

import mongoose from 'mongoose';

const log = (...args) => console.log(...args);

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  
  const State = (await import('../models/Location/State.js')).default;
  const Company = (await import('../models/Company.js')).default;

  const users = await db.collection('users').find({
    role: { $in: ['company-super-admin', 'super-admin'] }
  }).toArray();

  for (const user of users) {
    log(`\n========== User: ${user.email} (${user.role}) ==========`);
    log(`  companyId type: ${typeof user.companyId} value: ${user.companyId}`);

    // Step 1: Check if companyId is valid
    const isValidObjId = mongoose.Types.ObjectId.isValid(String(user.companyId || ''));
    log(`  isValidObjectId(companyId): ${isValidObjId}`);
    if (!isValidObjId) {
      log(`  ❌ FAIL: companyId is invalid, cannot load company`);
      continue;
    }

    // Step 2: Find company
    const company = await Company.findById(user.companyId).select('coverageStates name');
    if (!company) {
      log(`  ❌ FAIL: Company not found for companyId ${user.companyId}`);
      continue;
    }
    log(`  Company: ${company.name}`);
    log(`  coverageStates field:`, JSON.stringify(company.coverageStates));
    log(`  coverageStates is array: ${Array.isArray(company.coverageStates)}`);
    log(`  coverageStates.length: ${company.coverageStates?.length}`);

    if (!company.coverageStates || company.coverageStates.length === 0) {
      log(`  ❌ FAIL: coverageStates is empty`);
      continue;
    }

    // Step 3: Extract names/ids from coverageStates
    const stateIdsOrNames = company.coverageStates.map(st => {
      if (!st) return '';
      if (typeof st === 'string') return st.trim();
      if (st.name) return String(st.name).trim();
      return String(st).trim();
    }).filter(Boolean);
    log(`  Extracted stateIdsOrNames: ${JSON.stringify(stateIdsOrNames)}`);

    const objectIds = stateIdsOrNames.filter(st => mongoose.Types.ObjectId.isValid(st));
    const rawNames = stateIdsOrNames.filter(st => !mongoose.Types.ObjectId.isValid(st));
    log(`  objectIds: ${JSON.stringify(objectIds)}`);
    log(`  rawNames: ${JSON.stringify(rawNames)}`);

    // Step 4: Resolve ObjectIds to names
    let namesFromObjectIds = [];
    if (objectIds.length > 0) {
      const statesFound = await State.find({ _id: { $in: objectIds } }).select('name').lean();
      namesFromObjectIds = statesFound.map(s => s.name);
      log(`  namesFromObjectIds (resolved from IDs): ${JSON.stringify(namesFromObjectIds)}`);
    }

    const allAllowedNames = [...new Set([...rawNames, ...namesFromObjectIds])];
    log(`  allAllowedNames: ${JSON.stringify(allAllowedNames)}`);

    // Step 5: Query State by name
    if (allAllowedNames.length > 0) {
      const statesByName = await State.find({ name: { $in: allAllowedNames } }).select('_id name status isActive').lean();
      log(`  State.find({ name: $in ${JSON.stringify(allAllowedNames)} }) => ${statesByName.length} results`);
      log(`  Found states: ${JSON.stringify(statesByName)}`);

      // Step 6: Try case-insensitive fallback
      if (statesByName.length === 0) {
        log(`  ⚠️  Trying case-insensitive regex fallback...`);
        for (const name of allAllowedNames) {
          const found = await State.find({ name: { $regex: new RegExp(`^${name}$`, 'i') } }).select('_id name').lean();
          log(`    Regex "${name}" => ${found.length} results: ${JSON.stringify(found)}`);
        }
      }
    } else {
      log(`  ❌ allAllowedNames is empty — nothing to query`);
    }

    // Step 7: Show all states in DB for reference
    const allStates = await State.find({}).select('_id name status isActive').lean();
    log(`  All states in DB: ${JSON.stringify(allStates)}`);
  }

  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
