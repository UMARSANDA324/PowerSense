import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

import Ward from "../models/Location/Ward.js";
import LGA from "../models/Location/LGA.js";
import State from "../models/Location/State.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

const run = async () => {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        if (!uri) throw new Error("MONGO_URI is not defined in .env");

        await mongoose.connect(uri);
        console.log("Connected to MongoDB.");

        const kanoState = await State.findOne({ name: "Kano" });
        if (!kanoState) throw new Error("State 'Kano' not found.");

        // Step 1: Inspect the database
        const allLGAs = await LGA.find({ state: kanoState._id });
        console.log(`Found ${allLGAs.length} LGAs in Kano state.`);
        
        let targetLga = null;
        let lgaStatus = "created";

        const possibleSpellings = ["garun malam", "garun mallam", "garun-mallam", "garun_mallam"];
        
        for (const lga of allLGAs) {
            const nameLower = lga.name ? lga.name.toLowerCase() : "";
            const slugLower = lga.slug ? lga.slug.toLowerCase() : "";
            if (possibleSpellings.includes(nameLower) || possibleSpellings.includes(slugLower)) {
                targetLga = lga;
                break;
            }
        }

        // Step 2: Create or Normalize
        if (targetLga) {
            console.log(`Found existing LGA: ${targetLga.name} with slug: ${targetLga.slug}. Normalizing...`);
            targetLga.name = "Garun Mallam";
            targetLga.slug = "garun-mallam";
            await targetLga.save();
            lgaStatus = "updated";
        } else {
            console.log(`Garun Mallam not found. Creating new LGA...`);
            const lgaId = crypto.randomUUID();
            targetLga = new LGA({
                name: "Garun Mallam",
                slug: "garun-mallam",
                state: kanoState._id,
                id: lgaId,
                lgaId: `LGA-${crypto.randomUUID().split('-')[0].toUpperCase()}`
            });
            await targetLga.save();
            lgaStatus = "created";
        }

        // Step 3: Insert Wards
        const wardsToInsert = [
            "Agawa",
            "Chiromawa",
            "Dumati",
            "Durawar Sallau",
            "Garun Babba",
            "Garun Mallam",
            "Jobawa",
            "Kuiwe Dan Maura",
            "Yadakwari",
            "Yan Abawa",
            "Zango"
        ];

        let importedCount = 0;
        const generateSlug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        for (let wardName of wardsToInsert) {
            wardName = wardName.trim();
            const wardSlug = generateSlug(wardName);
            const areaId = `${targetLga.slug}-${wardSlug}`;

            const existingWard = await Ward.findOne({
                name: wardName,
                lga: targetLga._id
            });

            if (existingWard) {
                existingWard.wardName = wardName;
                existingWard.slug = wardSlug;
                existingWard.areaId = areaId;
                existingWard.lgaId = targetLga.lgaId;
                existingWard.lgaName = targetLga.name;
                if (!existingWard.id) existingWard.id = crypto.randomUUID();
                if (!existingWard.state) existingWard.state = kanoState._id;
                await existingWard.save();
                importedCount++;
            } else {
                await Ward.findOneAndUpdate(
                    {
                        $or: [
                            { name: wardName, lga: targetLga._id },
                            { areaId: areaId }
                        ]
                    },
                    {
                        $setOnInsert: {
                            id: crypto.randomUUID(),
                            name: wardName,
                            state: kanoState._id,
                        },
                        $set: {
                            wardName: wardName,
                            areaId: areaId,
                            slug: wardSlug,
                            lga: targetLga._id,
                            lgaId: targetLga.lgaId,
                            lgaName: targetLga.name,
                        }
                    },
                    { upsert: true, returnDocument: 'after' }
                );
                importedCount++;
            }
        }

        // Step 4: Validation
        console.log("\n--- Validation ---");
        
        let remainingIssues = [];
        
        // Garun Mallam exists exactly once
        const duplicateLgas = await LGA.find({ state: kanoState._id, name: "Garun Mallam" });
        if (duplicateLgas.length !== 1) {
            remainingIssues.push(`Found ${duplicateLgas.length} LGAs named Garun Mallam (Expected 1)`);
        }

        // All listed locations belong to Garun Mallam & No duplicate records exist
        for (const wardName of wardsToInsert) {
            const dbWards = await Ward.find({ name: wardName, lga: targetLga._id });
            if (dbWards.length > 1) {
                remainingIssues.push(`Duplicate wards found for ${wardName}`);
            } else if (dbWards.length === 0) {
                remainingIssues.push(`Ward ${wardName} not found after import`);
            } else {
                const ward = dbWards[0];
                if (ward.lga.toString() !== targetLga._id.toString()) {
                    remainingIssues.push(`Ward ${wardName} is linked to incorrect LGA`);
                }
            }
        }
        
        // Slugs and IDs unique
        const allImportedWards = await Ward.find({ lga: targetLga._id, name: { $in: wardsToInsert } });
        const slugs = new Set();
        const ids = new Set();
        for (const ward of allImportedWards) {
            if (slugs.has(ward.slug)) {
                remainingIssues.push(`Duplicate slug found: ${ward.slug}`);
            }
            if (ids.has(ward.id)) {
                remainingIssues.push(`Duplicate ID found: ${ward.id}`);
            }
            slugs.add(ward.slug);
            ids.add(ward.id);
        }

        console.log(`\nLGA created or updated: ${lgaStatus} (Garun Mallam)`);
        console.log(`Number of locations imported: ${importedCount}`);
        console.log(`Validation status: ${remainingIssues.length === 0 ? 'SUCCESS' : 'FAILED'}`);
        if (remainingIssues.length > 0) {
            console.log("Remaining issues:");
            remainingIssues.forEach(i => console.log(`- ${i}`));
        } else {
            console.log("No remaining issues.");
        }

        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
};

run();
