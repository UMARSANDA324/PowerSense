import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

import LGA from "../models/Location/LGA.js";
import Ward from "../models/Location/Ward.js";
import State from "../models/Location/State.js";
import { buildAreaStableId, buildLGAStableId, slugify } from "../utils/slugGenerator.js";

const run = async () => {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    await mongoose.connect(uri);
    console.log("Connected to database for cleanup.");

    const kano = await State.findOne({ name: "Kano" });
    if (!kano) {
        console.error("Kano state not found!");
        process.exit(1);
    }

    // 1. Remove duplicate Sheka Gidan Kaji in Kumbotso (if it still exists)
    console.log("Removing duplicate Sheka Gidan Kaji ward in Kumbotso...");
    const removeDupeResult = await Ward.deleteOne({ _id: "69c27b7ab866468c517fcd30" });
    console.log(`Removed duplicate: ${removeDupeResult.deletedCount}`);

    // 2. Find Dala and Dala Rural LGAs
    const dalaLGA = await LGA.findOne({ name: "Dala", state: kano._id });
    const dalaRuralLGA = await LGA.findOne({ name: "Dala Rural", state: kano._id });

    if (dalaLGA && dalaRuralLGA) {
        console.log("Reassigning wards from Dala Rural to Dala...");
        const wardsToMove = await Ward.find({ lga: dalaRuralLGA._id });
        for (const ward of wardsToMove) {
            // Compute new values
            const slug = slugify(ward.name);
            const newId = `ward_kano_dala_${slug.replace(/-/g, "")}`;
            const newAreaId = buildAreaStableId("Kano", "Dala", ward.name);

            console.log(`  Checking "${ward.name}":`);
            
            // Check collision on id or areaId or name
            const collision = await Ward.findOne({
                $or: [
                    { id: newId },
                    { areaId: newAreaId },
                    { lga: dalaLGA._id, slug: slug },
                    { lga: dalaLGA._id, name: { $regex: new RegExp(`^${ward.name}$`, "i") } }
                ]
            });

            if (collision) {
                console.log(`    ⚠ Collision found with existing ward in Dala ("${collision.name}" id: ${collision.id})! Merging/Removing duplicate Dala Rural record...`);
                await Ward.deleteOne({ _id: ward._id });
            } else {
                console.log(`    Moving ward to Dala LGA. ID -> ${newId}`);
                ward.lga = dalaLGA._id;
                ward.lgaName = dalaLGA.name;
                ward.lgaId = dalaLGA.lgaId || buildLGAStableId("Kano", "Dala");
                ward.id = newId;
                ward.areaId = newAreaId;
                ward.slug = slug;
                await ward.save();
            }
        }
    }

    // 3. Delete invalid LGAs
    console.log("Deleting invalid LGAs...");
    const deleteDalaRural = await LGA.deleteOne({ name: "Dala Rural", state: kano._id });
    console.log(`Deleted "Dala Rural": ${deleteDalaRural.deletedCount}`);

    const deleteNasKumb = await LGA.deleteOne({ name: "Nasarawa/kumbotso", state: kano._id });
    console.log(`Deleted "Nasarawa/kumbotso": ${deleteNasKumb.deletedCount}`);

    // 4. Ensure every active LGA belongs to Kano State
    console.log("Ensuring all active LGAs belong to Kano State...");
    const lgas = await LGA.find({ isActive: { $ne: false } });
    let updatedLgaCount = 0;
    for (const l of lgas) {
        if (!l.state.equals(kano._id)) {
            l.state = kano._id;
            await l.save();
            updatedLgaCount++;
        }
    }
    console.log(`Updated state reference for ${updatedLgaCount} LGAs`);

    // Verify LGA count
    const activeLgasCount = await LGA.countDocuments({ isActive: { $ne: false } });
    console.log(`Active LGAs now in DB: ${activeLgasCount}`);

    await mongoose.disconnect();
    console.log("Cleanup complete!");
    process.exit(0);
};

run();
