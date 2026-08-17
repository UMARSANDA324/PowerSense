/**
 * Live request trace: sends actual HTTP request and traces what the server sees
 * This hits a custom debug endpoint we temporarily add
 */
import dotenv from 'dotenv';
dotenv.config({ path: 'e:/PowerSense/.env' });

import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import axios from 'axios';

const BASE = 'http://localhost:5002';
const JWT_SECRET = process.env.JWT_SECRET;

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const superAdmin = await db.collection('users').findOne({
    role: 'company-super-admin',
    companyId: { $exists: true, $ne: null }
  });

  console.log('Testing with:', superAdmin.email);
  console.log('companyId:', superAdmin.companyId);

  const token = jwt.sign({ id: superAdmin._id }, JWT_SECRET, { expiresIn: '1h' });
  const headers = { Authorization: `Bearer ${token}` };

  // Test each endpoint
  const endpoints = [
    '/api/location/states',
    '/api/location/states/active',
    '/api/location/all',
  ];

  for (const ep of endpoints) {
    try {
      const res = await axios.get(`${BASE}${ep}`, { headers, timeout: 10000 });
      const data = res.data;
      const states = ep === '/api/location/all' ? data.states : data;
      console.log(`\n${ep}: ${states?.length ?? 'N/A'} states — ${JSON.stringify(states?.map(s => s.name))}`);
    } catch (err) {
      console.log(`\n${ep}: ERROR ${err.response?.status} — ${JSON.stringify(err.response?.data) || err.message}`);
    }
  }

  // Also test WITHOUT auth to confirm it works
  try {
    const res = await axios.get(`${BASE}/api/location/all`, { timeout: 10000 });
    console.log(`\n/api/location/all (no auth): ${res.data.states?.length} states — ${JSON.stringify(res.data.states?.map(s => s.name))}`);
  } catch (err) {
    console.log(`\n/api/location/all (no auth): ERROR — ${err.message}`);
  }

  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
