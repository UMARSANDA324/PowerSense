import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import Ward from '../models/Location/Ward.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dotenvPath = path.resolve(__dirname, '../.env');

console.log('Loading .env from:', dotenvPath);
dotenv.config({ path: dotenvPath, override: true });

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI not found in .env');
  console.error ('Available env keys:', Object.keys(process.env).filter(k => k.startsWith('MONGO')));
  process.exit(1);
}

await mongoose.connect(uri);

const lookup = JSON.parse(fs.readFileSync(path.join(__dirname, 'communityLookup.json'), 'utf8'));

// Test matching a few community IDs from the lookup
const testCommunityIds = [
  'community_kano_ungogo_hoto',
  'community_kano_kumbotso_shara',
  'community_kano_dawakin_kudu_bompai'
];

console.log('🔍 Testing community ID matching:\n');
for (const cId of testCommunityIds) {
  const ward = await Ward.findOne({ id: cId });
  console.log(`ID: ${cId}`);
  console.log(`  Result: ${ward ? ward.name : 'NOT FOUND'}\n`);
}

// List sample Ward IDs
const sampleWards = await Ward.find().limit(5).lean();
console.log('📊 Sample Ward IDs from database:\n');
for (const w of sampleWards) {
  console.log(`  ID: ${w.id} | Name: ${w.name}`);
}

// Check total Ward count
const totalWards = await Ward.countDocuments();
console.log(`\n📈 Total wards in database: ${totalWards}`);

// Check lookup sample points
const lookupSample = Object.entries(lookup).slice(0, 5);
console.log('\n📋 Sample lookup entries:\n');
for (const [key, entries] of lookupSample) {
  console.log(`Key: ${key}`);
  for (const entry of entries) {
    console.log(`  Community ID: ${entry.communityId} (${entry.lga})`);
  }
}

await mongoose.disconnect();
