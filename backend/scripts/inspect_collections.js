import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

const run = async () => {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        await mongoose.connect(uri);
        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        console.log("=== Collections ===");
        collections.forEach(c => console.log(c.name));
        await mongoose.disconnect();
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

run();
