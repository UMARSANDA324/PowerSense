import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import State from '../models/Location/State.js';
import Ward from '../models/Location/Ward.js';

const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!uri) {
  console.error('MONGODB_URI / MONGO_URI not set in .env');
  process.exit(1);
}

const run = async () => {
  try {
    await mongoose.connect(uri, { dbName: process.env.MONGO_DB_NAME || undefined });
    console.log('Connected to MongoDB');

    const kano = await State.findOne({ name: 'Kano' });
    if (!kano) {
      console.error('Kano state not found in DB');
      await mongoose.disconnect();
      process.exit(1);
    }

    const agg = await Ward.aggregate([
      { $match: { state: kano._id } },
      { $group: { _id: '$lgaName', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    console.log('\nWard counts by LGA in DB (Kano):');
    for (const row of agg) {
      console.log(` - ${row._id}: ${row.count}`);
    }

    const total = await Ward.countDocuments({ state: kano._id });
    console.log(`\nTotal Kano wards in DB: ${total}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    try { await mongoose.disconnect(); } catch(e){}
    process.exit(1);
  }
};

run();
