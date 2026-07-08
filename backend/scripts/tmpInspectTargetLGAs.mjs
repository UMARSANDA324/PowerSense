import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import State from '../models/Location/State.js';
import LGA from '../models/Location/LGA.js';
import Ward from '../models/Location/Ward.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
 dotenv.config({ path: path.join(__dirname, '../.env') });
const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!uri) {
  console.error('Missing MongoDB URI');
  process.exit(1);
}
await mongoose.connect(uri);
const state = await State.findOne({ name: 'Kano' });
if (!state) {
  console.error('State Kano not found');
  process.exit(1);
}
const targets = ['Tudun Wada','Tsanyawa','Tofa','Takai','Sumaila','Shanono','Rogo','Rimin Gado','Rano'];
for (const name of targets) {
  const lga = await LGA.findOne({ state: state._id, name: name });
  console.log('==', name, '==');
  if (!lga) {
    console.log('  LGA missing');
    continue;
  }
  console.log('  lga id', lga.id, 'slug', lga.slug, 'lgaId', lga.lgaId);
  const count = await Ward.countDocuments({ lga: lga._id });
  console.log('  wards count', count);
  const wards = await Ward.find({ lga: lga._id }).limit(10).lean();
  for (const w of wards) {
    console.log('   ', w.name, '|id=', w.id, '|slug=', w.slug, '|lgaName=', w.lgaName);
  }
}
await mongoose.disconnect();
