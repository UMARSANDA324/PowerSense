/**
 * End-to-End Hierarchy & Security Verification Test
 * 
 * Verifies:
 * 1. Platform Owner profile & global state visibility.
 * 2. KEDCO Super Admin sees assigned coverage state (Kano).
 * 3. Kaduna Super Admin sees assigned coverage state (Kaduna).
 * 4. Cross-tenant security: KEDCO Super Admin blocked (403) from creating LGA in unauthorized state (Kaduna).
 * 5. Full Downstream Creation Chain:
 *    Coverage State (Kano) -> LGA -> Ward -> Injection Substation -> Feeder -> Admin
 */

import dotenv from 'dotenv';
dotenv.config({ path: 'e:/PowerSense/.env' });

import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import axios from 'axios';

const BASE = 'http://localhost:5002';
const JWT_SECRET = process.env.JWT_SECRET;

const pass = (msg) => console.log(`  ✅ PASS: ${msg}`);
const fail = (msg, detail) => {
  console.log(`  ❌ FAIL: ${msg}${detail ? ` — ${detail}` : ''}`);
  throw new Error(`Assertion failed: ${msg}`);
};
const section = (msg) => console.log(`\n═══════════════════════════════════════\n ${msg}\n═══════════════════════════════════════`);

function makeHeaders(userId) {
  const token = jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '1h' });
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const po = await db.collection('users').findOne({ role: 'platform-owner' });
  const kedcoSA = await db.collection('users').findOne({ email: 'jimeta@gmail.com' });
  const kadunaSA = await db.collection('users').findOne({ email: 'kada@gmail.com' });

  const kanoState = await db.collection('states').findOne({ name: 'Kano' });
  const kadunaState = await db.collection('states').findOne({ name: 'kaduna' });

  if (!po || !kedcoSA || !kadunaSA || !kanoState || !kadunaState) {
    fail('Missing prerequisite test users or states in DB');
  }

  // 1. Platform Owner Visibility
  section('1. Platform Owner Visibility (Global)');
  const poHeaders = makeHeaders(po._id);
  const poStatesRes = await axios.get(`${BASE}/api/location/states/active`, { headers: poHeaders });
  if (poStatesRes.data.length >= 2) {
    pass(`Platform Owner sees all active states (${poStatesRes.data.length} states)`);
  } else {
    fail(`Platform Owner should see all states, got ${poStatesRes.data.length}`);
  }

  // 2. KEDCO Super Admin Visibility (Coverage-Scoped)
  section('2. KEDCO Super Admin Coverage Scoping');
  const kedcoHeaders = makeHeaders(kedcoSA._id);
  const kedcoAllRes = await axios.get(`${BASE}/api/location/all`, { headers: kedcoHeaders });
  const kedcoStates = kedcoAllRes.data.states || [];
  if (kedcoStates.length === 1 && kedcoStates[0].name === 'Kano') {
    pass('KEDCO Super Admin GET /api/location/all returns exactly [Kano]');
  } else {
    fail(`KEDCO Super Admin expected only [Kano], got: ${JSON.stringify(kedcoStates.map(s => s.name))}`);
  }

  const kedcoActiveRes = await axios.get(`${BASE}/api/location/states/active`, { headers: kedcoHeaders });
  if (kedcoActiveRes.data.length === 1 && kedcoActiveRes.data[0].name === 'Kano') {
    pass('KEDCO Super Admin GET /api/location/states/active returns exactly [Kano]');
  } else {
    fail(`KEDCO Super Admin expected only [Kano], got: ${JSON.stringify(kedcoActiveRes.data.map(s => s.name))}`);
  }

  // 3. Kaduna Super Admin Visibility (Coverage-Scoped)
  section('3. Kaduna Super Admin Coverage Scoping');
  const kadunaHeaders = makeHeaders(kadunaSA._id);
  const kadunaAllRes = await axios.get(`${BASE}/api/location/all`, { headers: kadunaHeaders });
  const kadunaStates = kadunaAllRes.data.states || [];
  if (kadunaStates.length === 1 && kadunaStates[0].name === 'kaduna') {
    pass('Kaduna Super Admin GET /api/location/all returns exactly [kaduna]');
  } else {
    fail(`Kaduna Super Admin expected only [kaduna], got: ${JSON.stringify(kadunaStates.map(s => s.name))}`);
  }

  // 4. Cross-Tenant Authorization Test
  section('4. Cross-Tenant Security Enforcement');
  try {
    await axios.post(`${BASE}/api/location/lga`, {
      name: 'Unauthorized LGA Test',
      stateId: kadunaState._id.toString()
    }, { headers: kedcoHeaders });
    fail('KEDCO Super Admin should NOT be allowed to create LGA in Kaduna State');
  } catch (err) {
    if (err.response?.status === 403) {
      pass('KEDCO Super Admin blocked with 403 when creating LGA in Kaduna State');
    } else {
      fail(`Expected 403 Forbidden, got ${err.response?.status}: ${err.message}`);
    }
  }

  // 5. Downstream Geography Creation Chain in Authorized State (Kano)
  section('5. Downstream Geography Creation Chain (KEDCO -> Kano)');
  const testSuffix = Date.now().toString().slice(-4);
  const testLgaName = `Test LGA ${testSuffix}`;
  const testWardName = `Test Ward ${testSuffix}`;
  const testSubName = `Test Substation ${testSuffix}`;
  const testFeederName = `Test Feeder ${testSuffix}`;
  const testAdminEmail = `admin_test_${testSuffix}@kedco.com`;

  let createdLgaId, createdWardId, createdSubId, createdFeederId, createdAdminId;

  try {
    // 5a. Create LGA in Kano
    const lgaRes = await axios.post(`${BASE}/api/location/lga`, {
      name: testLgaName,
      stateId: kanoState._id.toString()
    }, { headers: kedcoHeaders });
    createdLgaId = lgaRes.data.lga?._id || lgaRes.data._id;
    pass(`Created LGA: "${testLgaName}" (ID: ${createdLgaId})`);

    // 5b. Create Ward under LGA
    const wardRes = await axios.post(`${BASE}/api/location/ward`, {
      name: testWardName,
      lgaId: createdLgaId
    }, { headers: kedcoHeaders });
    createdWardId = wardRes.data.ward?._id || wardRes.data._id;
    pass(`Created Ward: "${testWardName}" (ID: ${createdWardId})`);

    // 5c. Create Injection Substation
    const subRes = await axios.post(`${BASE}/api/location/injection-substation`, {
      name: testSubName,
      code: `SUB-${testSuffix}`,
      stateId: kanoState._id.toString()
    }, { headers: kedcoHeaders });
    createdSubId = subRes.data.data?._id || subRes.data._id || subRes.data.substation?._id;
    pass(`Created Injection Substation: "${testSubName}" (ID: ${createdSubId})`);

    // 5d. Create Feeder
    const feederRes = await axios.post(`${BASE}/api/location/feeder`, {
      name: testFeederName,
      wardIds: [createdWardId],
      injectionSubstationId: createdSubId
    }, { headers: kedcoHeaders });
    createdFeederId = feederRes.data.feeder?._id || feederRes.data._id;
    pass(`Created Feeder: "${testFeederName}" (ID: ${createdFeederId})`);

    // 5e. Create Admin assigned to Feeder & Kano State
    const adminRes = await axios.post(`${BASE}/api/admin/create-admin`, {
      fullName: `Test Admin ${testSuffix}`,
      email: testAdminEmail,
      password: 'Password@123',
      state: 'Kano',
      lga: testLgaName,
      ward: testWardName,
      assignedFeederId: createdFeederId
    }, { headers: kedcoHeaders });
    createdAdminId = adminRes.data.admin?._id || adminRes.data._id;
    pass(`Created Admin: "${testAdminEmail}" (ID: ${createdAdminId})`);

    section('6. Full Verification Succeeded');
    console.log('  🎉 All tests passed! Platform Owner -> Company -> Coverage State -> Super Admin -> LGA -> Ward -> Substation -> Feeder -> Admin verified end-to-end.');

  } finally {
    // Clean up created test records
    if (createdAdminId) await db.collection('users').deleteOne({ _id: new mongoose.Types.ObjectId(createdAdminId) });
    if (createdFeederId) await db.collection('feeders').deleteOne({ _id: new mongoose.Types.ObjectId(createdFeederId) });
    if (createdSubId) await db.collection('injectionsubstations').deleteOne({ _id: new mongoose.Types.ObjectId(createdSubId) });
    if (createdWardId) await db.collection('wards').deleteOne({ _id: new mongoose.Types.ObjectId(createdWardId) });
    if (createdLgaId) await db.collection('lgas').deleteOne({ _id: new mongoose.Types.ObjectId(createdLgaId) });
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('\nTest failed with error:', err.response?.data || err.message);
  process.exit(1);
});
