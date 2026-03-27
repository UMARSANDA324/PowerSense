import mongoose from "mongoose";
import dotenv from "dotenv";
import Feeder from "../models/Location/Feeder.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const list = async () => {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        if (!uri) throw new Error("MONGO_URI (or MONGODB_URI) is not defined in .env");
        await mongoose.connect(uri);
        const feeders = await Feeder.find({});
        console.log("Feeders in DB:");
        feeders.forEach(f => console.log(`- '${f.name}' (${f._id})`));
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};
list();
