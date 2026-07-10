import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

import State from "../models/Location/State.js";

const run = async () => {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        await mongoose.connect(uri);

        const states = await State.find({});
        console.log("=== States ===");
        states.forEach(s => console.log(`'${s.name}' (ID: ${s._id})`));

        await mongoose.disconnect();
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

run();
