import mongoose from "mongoose";
import dotenv from "dotenv";
import Feeder from "../models/Location/Feeder.js";
import User from "../models/UserModel.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const cleanup = async () => {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        if (!uri) throw new Error("MONGO_URI (or MONGODB_URI) is not defined in .env");
        await mongoose.connect(uri);
        console.log("Connected to MongoDB...");

        const feeders = await Feeder.find({});
        const feederMap = {};
        const duplicates = [];

        for (const feeder of feeders) {
            const normalizedName = feeder.name.trim().toLowerCase();
            if (feederMap[normalizedName]) {
                duplicates.push({
                    original: feederMap[normalizedName],
                    duplicate: feeder
                });
            } else {
                feederMap[normalizedName] = feeder;
            }
        }



        console.log(`Found ${duplicates.length} duplicate feeders.`);

        for (const { original, duplicate } of duplicates) {
            console.log(`Merging ${duplicate.name} (${duplicate._id}) into (${original._id})`);
            
            // Merge wards
            const combinedWards = [...new Set([...original.wards.map(w => w.toString()), ...duplicate.wards.map(w => w.toString())])];
            original.wards = combinedWards;
            await original.save();

            // Update users that point to the duplicate's ID (highly unlikely if it's referenced by name, but good to check)
            // But if it's an ID reference:
            await User.updateMany({ assignedFeeders: duplicate._id }, { $pull: { assignedFeeders: duplicate._id } });
            await User.updateMany({ assignedFeeders: original._id }, { $addToSet: { assignedFeeders: original._id } });

            // Finally, delete the duplicate
            await Feeder.findByIdAndDelete(duplicate._id);
        }

        console.log("Cleanup completed.");
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

cleanup();
