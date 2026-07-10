import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });
const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!uri) {
  console.error('No URI');
  process.exit(1);
}
const Ward = (await import('./models/Location/Ward.js')).default;
const LGA = (await import('./models/Location/LGA.js')).default;
const Feeder = (await import('./models/Location/Feeder.js')).default;
await mongoose.connect(uri, { dbName: 'test' });
console.log('Ward count', await Ward.countDocuments());
console.log('LGA count', await LGA.countDocuments());
console.log('Feeder count', await Feeder.countDocuments());
console.log('Sample Wards', await Ward.find().limit(3).lean());
console.log('Sample Feeders', await Feeder.find().limit(3).lean());
await mongoose.disconnect();
