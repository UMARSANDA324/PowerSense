import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

import Feeder from "../models/Location/Feeder.js";

const removeDuplicates = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log('✅ Connected');
    
    const duplicates = await Feeder.aggregate([
      { $group: { _id: '$slug', count: { $sum: 1 }, docs: { $push: '$_id' } } },
      { $match: { count: { $gt: 1 } } }
    ]);
    
    console.log(`🗑 Found ${duplicates.length} duplicate groups`);
    
    for (const dup of duplicates) {
      // Keep the first one, delete the rest
      const toDelete = dup.docs.slice(1);
      await Feeder.deleteMany({ _id: { $in: toDelete } });
      console.log(`  Deleted ${toDelete.length} for slug ${dup._id}`);
    }
    
    console.log('✅ Done!');
    console.log(`  Total feeders left: ${await Feeder.countDocuments()}`);
    
    await mongoose.disconnect();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

removeDuplicates();
