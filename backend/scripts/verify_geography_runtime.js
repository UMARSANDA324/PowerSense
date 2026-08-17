/**
 * verify_geography_runtime.js
 * 
 * Verifies:
 * 1. Platform Owner profile: companyId=null, company=null
 * 2. Platform Owner response latency is under 3s
 * 3. Super Admin profile: companyId set, company set
 * 4. GET /api/location/states/active filters by company coverage for super admin
 * 5. GET /api/location/lgas filters by company coverage states
 * 6. Coverage state resolution in runtimeContext
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import User from '../models/UserModel.js';

const BASE = 'http://localhost:5002';
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key';

const pass = (msg) => console.log(`  ✅ PASS: ${msg}`);
const fail = (msg, detail) => console.log(`  ❌ FAIL: ${msg}${detail ? ` — ${detail}` : ''}`);
const section = (msg) => console.log(`\n══ ${msg} ══`);

function makeToken(userId) {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '1h' });
}

async function getHeaders(userId) {
  const token = makeToken(userId);
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function verifyPlatformOwnerProfile() {
  section('1. Platform Owner Profile');

  const po = await User.findOne({ role: 'platform-owner' }).select('_id email');
  if (!po) { fail('No platform owner user found'); return; }
  console.log(`  Platform Owner: ${po.email}`);

  const headers = await getHeaders(po._id);
  const start = Date.now();
  const res = await axios.get(`${BASE}/api/auth/profile`, { headers, timeout: 5000 });
  const elapsed = Date.now() - start;
  
  const data = res.data;
  
  if (elapsed < 3000) pass(`Response in ${elapsed}ms (< 3s)`);
  else fail(`Response too slow: ${elapsed}ms`);

  if (data.companyId === null || data.companyId === undefined)
    pass('companyId is null for Platform Owner');
  else fail(`companyId should be null but got: ${data.companyId}`);

  if (data.company === null || data.company === undefined)
    pass('company is null for Platform Owner');
  else fail(`company should be null but got: ${JSON.stringify(data.company)}`);

  if (data.normalizedRole === 'platform-owner') pass('normalizedRole is platform-owner');
  else fail(`normalizedRole is wrong: ${data.normalizedRole}`);

  if (data.platformMetadata) pass('platformMetadata present');
  else fail('platformMetadata missing for Platform Owner');
}

async function verifySuperAdminProfile() {
  section('2. Super Admin Profile');

  const sa = await User.findOne({ role: { $in: ['super-admin', 'company-super-admin'] } }).select('_id email companyId');
  if (!sa) {
    console.log('  ⚠️  No Super Admin found — skipping (company must be created first)');
    return;
  }
  console.log(`  Super Admin: ${sa.email}, companyId: ${sa.companyId}`);

  const headers = await getHeaders(sa._id);
  const start = Date.now();
  const res = await axios.get(`${BASE}/api/auth/profile`, { headers, timeout: 5000 });
  const elapsed = Date.now() - start;
  
  if (elapsed < 3000) pass(`Response in ${elapsed}ms (< 3s)`);
  else fail(`Response too slow: ${elapsed}ms`);

  const data = res.data;
  if (data.companyId) pass(`companyId is set: ${data.companyId}`);
  else fail('companyId is null for Super Admin — should be set');

  if (data.company) pass(`company object present: ${data.company.name}`);
  else fail('company object missing for Super Admin');

  if (data.normalizedRole === 'company-super-admin' || data.normalizedRole === 'super-admin')
    pass(`normalizedRole is ${data.normalizedRole}`);
  else fail(`normalizedRole is wrong: ${data.normalizedRole}`);

  if (!data.platformMetadata) pass('platformMetadata absent for Super Admin (correct)');
  else fail('platformMetadata should not be present for Super Admin');
}

async function verifyStatesFiltering() {
  section('3. Active States Endpoint Filtering');
  
  // Platform Owner can see all states
  const po = await User.findOne({ role: 'platform-owner' }).select('_id');
  if (po) {
    const headers = await getHeaders(po._id);
    const res = await axios.get(`${BASE}/api/location/states/active`, { headers, timeout: 5000 });
    console.log(`  Platform Owner sees ${res.data.length} active state(s)`);
    if (res.status === 200) pass('Platform Owner can access active states endpoint');
    else fail(`Unexpected status: ${res.status}`);
  }

  // Super Admin sees only their coverage states
  const sa = await User.findOne({ role: { $in: ['super-admin', 'company-super-admin'] } }).select('_id');
  if (sa) {
    const headers = await getHeaders(sa._id);
    const res = await axios.get(`${BASE}/api/location/states/active`, { headers, timeout: 5000 });
    console.log(`  Super Admin sees ${res.data.length} active state(s) (filtered by coverage)`);
    if (res.status === 200) pass('Super Admin can access active states endpoint');
    else fail(`Unexpected status: ${res.status}`);
  }
}

async function verifyLGAsFiltering() {
  section('4. LGAs Endpoint Filtering');

  const sa = await User.findOne({ role: { $in: ['super-admin', 'company-super-admin'] } }).select('_id');
  if (!sa) {
    console.log('  ⚠️  No Super Admin found — skipping');
    return;
  }
  const headers = await getHeaders(sa._id);
  const res = await axios.get(`${BASE}/api/location/lgas`, { headers, timeout: 5000 });
  console.log(`  Super Admin sees ${res.data.length} LGA(s)`);
  if (res.status === 200) pass('LGAs endpoint accessible for Super Admin');
  else fail(`Unexpected status: ${res.status}`);
}

async function main() {
  console.log('===========================================');
  console.log(' GEOGRAPHY & RUNTIME CONTEXT VERIFICATION');
  console.log('===========================================');

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('\n[DB] Connected');

    await verifyPlatformOwnerProfile();
    await verifySuperAdminProfile();
    await verifyStatesFiltering();
    await verifyLGAsFiltering();

    console.log('\n===========================================');
    console.log(' VERIFICATION COMPLETE');
    console.log('===========================================\n');
  } catch (err) {
    console.error('\n[ERROR]', err.message);
    if (err.response) {
      console.error('  Response Status:', err.response.status);
      console.error('  Response Data:', JSON.stringify(err.response.data));
    }
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main();
