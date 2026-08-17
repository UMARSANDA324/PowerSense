/**
 * Diagnostic: test the full Super Admin state access chain
 * Run: node backend/scripts/diagnose_super_admin_states.js
 */
import dotenv from 'dotenv';
dotenv.config({ path: 'e:/PowerSense/.env' });

import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import axios from 'axios';

const BASE = 'http://localhost:5002';
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key';

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const users = await db.collection('users').find({
    role: { $in: ['company-super-admin', 'super-admin'] }
  }).toArray();

  for (const user of users) {
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1h' });
    const headers = { Authorization: `Bearer ${token}` };

    console.log(`\n========== Super Admin: ${user.email} ===========`);
    console.log(`  User._id:    ${user._id}`);
    console.log(`  companyId:   ${user.companyId}`);

    // Get company to see coverage states
    if (user.companyId) {
      const company = await db.collection('companies').findOne({ _id: user.companyId });
      console.log(`  Company:     ${company?.name}`);
      console.log(`  coverageStates (raw): ${JSON.stringify(company?.coverageStates)}`);
    }

    // Hit /api/location/all
    try {
      const res = await axios.get(`${BASE}/api/location/all`, { headers, timeout: 8000 });
      const data = res.data;
      console.log(`\n  GET /api/location/all:`);
      console.log(`    states returned: ${data.states?.length ?? 'N/A'}`);
      if (data.states?.length > 0) {
        console.log(`    state names: ${data.states.map(s => s.name).join(', ')}`);
      } else {
        console.log(`    ❌ NO STATES RETURNED`);
      }
    } catch (err) {
      console.log(`    ❌ ERROR: ${err.response?.status} - ${JSON.stringify(err.response?.data) || err.message}`);
    }

    // Hit /api/location/states/active
    try {
      const res = await axios.get(`${BASE}/api/location/states/active`, { headers, timeout: 8000 });
      console.log(`\n  GET /api/location/states/active:`);
      console.log(`    states returned: ${res.data?.length}`);
      if (res.data?.length > 0) {
        console.log(`    state names: ${res.data.map(s => s.name).join(', ')}`);
      } else {
        console.log(`    ❌ NO STATES RETURNED`);
      }
    } catch (err) {
      console.log(`    ❌ ERROR: ${err.response?.status} - ${JSON.stringify(err.response?.data) || err.message}`);
    }

    // Hit /api/location/states
    try {
      const res = await axios.get(`${BASE}/api/location/states`, { headers, timeout: 8000 });
      console.log(`\n  GET /api/location/states:`);
      console.log(`    states returned: ${res.data?.length}`);
      if (res.data?.length > 0) {
        console.log(`    state names: ${res.data.map(s => s.name).join(', ')}`);
      } else {
        console.log(`    ❌ NO STATES RETURNED`);
      }
    } catch (err) {
      console.log(`    ❌ ERROR: ${err.response?.status} - ${JSON.stringify(err.response?.data) || err.message}`);
    }
  }

  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
