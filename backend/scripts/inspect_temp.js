import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Feeder from '../models/Location/Feeder.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const feeders = await Feeder.find({});
  console.log(JSON.stringify(feeders, null, 2));
  process.exit(0);
};
run();
