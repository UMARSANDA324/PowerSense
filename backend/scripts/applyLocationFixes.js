import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import LGA from "../models/Location/LGA.js";
import Ward from "../models/Location/Ward.js";
import Feeder from "../models/Location/Feeder.js";
import State from "../models/Location/State.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

const run = async () => {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        if (!uri) throw new Error("MONGO_URI not found");
        await mongoose.connect(uri);
        console.log("Connected to MongoDB.");

        let report = {
            lgasCorrected: 0,
            wardsCorrected: 0,
            feederMappingsUpdated: 0,
            validationIssues: []
        };

        const kanoState = await State.findOne({ name: "Kano" });
        if (!kanoState) throw new Error("State 'Kano' not found.");

        // --- 1. Fix Garun Mallam LGA ---
        // Original (misspelled) LGA
        const originalLga = await LGA.findOne({ _id: "6a43dd43bd4ea9e0557420f5" }); 
        // Duplicate newly created LGA
        const newLga = await LGA.findOne({ _id: "6a456ac24947df6644e06b5d" });

        if (originalLga && newLga) {
            console.log("Merging Garun Mallam LGAs...");
            // Move all wards from newLga to originalLga
            const result = await Ward.updateMany(
                { lga: newLga._id },
                { $set: { lga: originalLga._id, lgaName: "Garun Mallam" } }
            );
            report.wardsCorrected += result.modifiedCount;

            // Delete newLga FIRST to prevent duplicate key error
            await LGA.deleteOne({ _id: newLga._id });

            // Rename originalLga
            originalLga.name = "Garun Mallam";
            originalLga.slug = "garun-mallam";
            await originalLga.save();
            report.lgasCorrected++;
        } else if (originalLga && !newLga) {
            console.log("Only original Garum Mallam found. Renaming it.");
            if (originalLga.name !== "Garun Mallam") {
                originalLga.name = "Garun Mallam";
                originalLga.slug = "garun-mallam";
                await originalLga.save();
                report.lgasCorrected++;
            }
        }

        // --- 2. Update Feeder Assignment (Shekar Barde -> Sallari 11kV Feeder) ---
        const shekarBarde = await Ward.findOne({ name: new RegExp('Shekar Barde', 'i') });
        const sallariFeeder = await Feeder.findOne({ name: new RegExp('Sallari', 'i') });

        if (!shekarBarde) {
            report.validationIssues.push("Ward 'Shekar Barde' not found.");
        }
        if (!sallariFeeder) {
            report.validationIssues.push("Feeder 'Sallari 11kV Feeder' not found.");
        }

        if (shekarBarde && sallariFeeder) {
            let mappingUpdated = false;
            
            shekarBarde.feederIds = shekarBarde.feederIds || [];
            sallariFeeder.wards = sallariFeeder.wards || [];
            
            // Add Sallari to Shekar Barde's feederIds
            if (!shekarBarde.feederIds.includes(sallariFeeder._id)) {
                await Ward.updateOne(
                    { _id: shekarBarde._id },
                    { $addToSet: { feederIds: sallariFeeder._id } }
                );
                mappingUpdated = true;
            }

            // Add Shekar Barde to Sallari's wards
            if (!sallariFeeder.wards.includes(shekarBarde._id)) {
                await Feeder.updateOne(
                    { _id: sallariFeeder._id },
                    { $addToSet: { wards: shekarBarde._id } }
                );
                mappingUpdated = true;
            }

            if (mappingUpdated) {
                report.feederMappingsUpdated++;
                console.log("Assigned Shekar Barde to Sallari 11kV Feeder.");
            }
        }

        // --- 3. Final Validation ---
        console.log("Running final validation...");
        
        // No duplicate LGAs
        const lgas = await LGA.aggregate([
            { $match: { state: kanoState._id } },
            { $group: { _id: "$name", count: { $sum: 1 } } },
            { $match: { count: { $gt: 1 } } }
        ]);
        if (lgas.length > 0) {
            report.validationIssues.push(`Duplicate LGAs found: ${lgas.map(l => l._id).join(', ')}`);
        }

        // No duplicate Wards
        const duplicateWards = await Ward.aggregate([
            { $group: { _id: { name: "$name", lga: "$lga" }, count: { $sum: 1 } } },
            { $match: { count: { $gt: 1 } } }
        ]);
        if (duplicateWards.length > 0) {
            report.validationIssues.push(`Duplicate Wards found: ${duplicateWards.length}`);
        }

        // Garun Mallam contains its wards
        const gmFinal = await LGA.findOne({ name: "Garun Mallam" });
        if (gmFinal) {
            const gmw = await Ward.find({ lga: gmFinal._id });
            if (gmw.length === 0) {
                report.validationIssues.push("Garun Mallam LGA contains 0 wards!");
            }
        } else {
            report.validationIssues.push("Garun Mallam LGA not found!");
        }

        console.log("\n=============================================");
        console.log("Report:");
        console.log("=============================================");
        console.log(`LGAs corrected: ${report.lgasCorrected}`);
        console.log(`Wards corrected: ${report.wardsCorrected}`);
        console.log(`Feeder mappings updated: ${report.feederMappingsUpdated}`);
        if (report.validationIssues.length > 0) {
            console.log("Remaining validation issues:");
            report.validationIssues.forEach(i => console.log(`- ${i}`));
        } else {
            console.log("All validation checks passed.");
            console.log("Confirmation: All changes are production-ready.");
        }
        console.log("=============================================\n");

        process.exit(0);

    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
};

run();
