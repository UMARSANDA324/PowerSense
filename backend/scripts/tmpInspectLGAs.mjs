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
  console.error('Kano state not found');
  process.exit(1);
}
const lgas = await LGA.find({ state: state._id }).sort({ name: 1 }).lean();
console.log('State:', state.name);
console.log('LGAs count:', lgas.length);
for (const lga of lgas) {
  const wardCount = await Ward.countDocuments({ lga: lga._id });
  console.log(`${lga.name} | id=${lga.id} | slug=${lga.slug} | wards=${wardCount}`);
}
await mongoose.disconnect();
