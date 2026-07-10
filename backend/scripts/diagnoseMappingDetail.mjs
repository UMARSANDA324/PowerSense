import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import Ward from '../models/Location/Ward.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const uri = process.env.MONGODB_URI;
await mongoose.connect(uri);

const lookup = JSON.parse(fs.readFileSync(path.join(__dirname, 'communityLookup.json'), 'utf8'));

// Test: pick a lookup entry and search comprehensive for matching Ward
const testEntry = lookup['hoto']?.[0];
console.log('Test lookup entry:', testEntry);

if (testEntry) {
  console.log('\n🔍 Searching for Ward matches:');
  
  // 1. By ID
  const byId = await Ward.findOne({ id: testEntry.communityId }).lean();
  console.log(`1. By id "${testEntry.communityId}":`, byId ? byId.name : 'NOT FOUND');
  
  // 2. By slug
  const bySlug = await Ward.findOne({ slug: testEntry.slug }).lean();
  console.log(`2. By slug "${testEntry.slug}":`, bySlug ? bySlug.name : 'NOT FOUND');
  
  // 3. By name (partial match)
  const byName = await Ward.findOne({ name: { $regex: 'Hoto', $options: 'i' } }).lean();
  console.log(`3. By name (regex "Hoto"):`, byName ? byName.name : 'NOT FOUND');
  
  // 4. Show all slugs in database
  const allWards = await Ward.find().lean();
  const hotoWards = allWards.filter(w => w.slug && w.slug.includes('hoto'));
  console.log(`\n4. Wards with 'hoto' in slug: ${hotoWards.length}`);
  for (const w of hotoWards) {
    console.log(`   Slug: "${w.slug}" | Name: "${w.name}" | ID: "${w.id}"`);
  }
}

// Show sample Wards with their slugs and IDs
const sample = await Ward.find().limit(10).lean();
console.log('\n📊 Sample 10 Wards from database:');
for (const w of sample) {
  console.log(`  Slug: "${w.slug}" | Name: "${w.name}" | ID: "${w.id}" | LGA: "${w.lgaName}"`);
}

// Count by LGA name
const kanoWards = await Ward.countDocuments({ lgaName: 'Ungogo' });
console.log(`\nUngo Ward count: ${kanoWards}`);
const ungogogoWards = await Ward.find({ lgaName: 'Ungogo' }).lean();
console.log('Ungogo Wards sample:');
for (const w of ungogogoWards.slice(0, 5)) {
  console.log(`  Slug: "${w.slug}" | Name: "${w.name}"`);
}

await mongoose.disconnect();
