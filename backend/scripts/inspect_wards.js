import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

import Ward from "../models/Location/Ward.js";
import LGA from "../models/Location/LGA.js";
import State from "../models/Location/State.js";

const run = async () => {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        await mongoose.connect(uri);

        const totalWards = await Ward.countDocuments({});
        console.log(`Total Ward documents: ${totalWards}`);

        const sample = await Ward.findOne({});
        if (sample) {
            console.log("Sample Ward Document:", JSON.stringify(sample, null, 2));
        }

        // Check if there are any distinct wardNames vs names
        const distinctNames = await Ward.distinct("name");
        const distinctWardNames = await Ward.distinct("wardName");
        console.log(`Distinct names count: ${distinctNames.length}`);
        console.log(`Distinct wardNames count: ${distinctWardNames.length}`);

        // Check distinct LGAs
        const distinctLGAsInWards = await Ward.distinct("lga");
        console.log(`Distinct LGA IDs in Wards: ${distinctLGAsInWards.length}`);

        await mongoose.disconnect();
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

run();
