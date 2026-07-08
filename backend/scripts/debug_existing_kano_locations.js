import mongoose from 'mongoose';
import dotenv from 'dotenv';
import State from '../models/Location/State.js';
import LGA from '../models/Location/LGA.js';
import Ward from '../models/Location/Ward.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!uri) {
  console.log('No DB URI');
  process.exit(0);
}

await mongoose.connect(uri);
const state = await State.findOne({ name: 'Kano' });
if (!state) {
  console.log('No Kano state');
  await mongoose.disconnect();
  process.exit(0);
}

const targetLGAs = ['Shanono', 'Sumaila', 'Takai', 'Tarauni', 'Tofa', 'Tsanyawa', 'Tudun Wada'];
const lgas = await LGA.find({ name: { $in: targetLGAs }, state: state._id });
console.log(JSON.stringify(lgas.map((l) => ({ name: l.name, id: l.lgaId, slug: l.slug })), null, 2));
const wards = await Ward.find({ lga: { $in: lgas.map((l) => l._id) }, state: state._id }).sort({ name: 1 });
console.log('Ward count', wards.length);
console.log(JSON.stringify(wards.map((w) => ({ name: w.name, lgaName: w.lgaName })), null, 2));
await mongoose.disconnect();
