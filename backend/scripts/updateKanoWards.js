import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import fs from "fs";

import Ward from "../models/Location/Ward.js";
import LGA from "../models/Location/LGA.js";
import State from "../models/Location/State.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

const lgasAndWards = {
  "Gwale": ["Dorayi", "Galadanchi", "Goron Dutse", "Gwale", "Kabuga", "Mandawari", "Rijiyar Lemo", "Sabon Gari", "Wailari", "Diso"],
  "Gwarzo": ["Gwarzo", "Getso", "Lakwaya", "Kutama", "Jama'a", "Korkari", "Sabon Gari", "Mainika", "Kwami", "Rije"],
  "Kabo": ["Kabo", "Dugabau", "Garo", "Gude", "Hauwade", "Kanwa", "Kanya", "Katsinawa", "Massanawa", "Walawa"],
  "Kano Municipal": ["Kofar Mata", "Kofar Mazugal", "Kofar Wambai", "Kofar Naisa", "Shahuchi", "Jakara", "Gyaranya", "Yakasai", "Zaitawa", "Tudun Nufawa", "Dandago", "Kurmi", "Daneji"],
  "Shanono": ["Shanono", "Alajawa", "Farin Ruwa", "Fagawa", "Goda", "Gunduwawa", "Hauri", "Janja", "Kokiya", "Tsaure"],
  "Sumaila": ["Sumaila", "Gediya", "Gani", "Gajigi", "Kanawa", "Magami", "Rimi", "Sitti", "Rumo", "Masu"],
  "Takai": ["Takai", "Bagwaro", "Falali", "Fajewa", "Gamawa", "Hantsai", "Kachako", "Kuka", "Langwami", "Tudun Wada"],
  "Tofa": ["Tofa", "Doka", "Dokadawa", "Fofa", "Kadawa", "Kwami", "Lambu", "Rinji", "Yango", "Yarimawa"],
  "Tsanyawa": ["Tsanyawa", "Baje", "Dadarawa", "Dakwai", "Dumbulum", "Farsa", "Gozaki", "Gurun", "Kabagiwa", "Runji"],
  "Tudun Wada": ["Tudun Wada", "Baburi", "Burun Burun", "Dalawa", "Gazobi", "Jandutse", "Jangefe", "Kankanu", "Rugurugu", "Sumana"]
};

const generateSlug = (name) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
};

const run = async () => {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        if (!uri) throw new Error("MONGO_URI is not defined in .env");

        await mongoose.connect(uri);
        console.log("Connected to MongoDB.");

        const kanoState = await State.findOne({ name: "Kano" });
        if (!kanoState) throw new Error("State 'Kano' not found.");

        let validationReport = {
            processedWards: 0,
            insertedWards: 0,
            updatedWards: 0,
            errors: []
        };
        let lgaCounts = {};

        for (const [lgaName, wards] of Object.entries(lgasAndWards)) {
            lgaCounts[lgaName] = 0;
            // Find LGA (case-insensitive search)
            const lga = await LGA.findOne({
                name: new RegExp(`^${lgaName}$`, 'i'),
                state: kanoState._id
            });

            if (!lga) {
                console.warn(`LGA ${lgaName} not found in database. Skipping.`);
                validationReport.errors.push(`LGA ${lgaName} not found.`);
                continue;
            }

            for (let wardName of wards) {
                wardName = wardName.trim();
                const wardSlug = generateSlug(wardName);
                const areaId = `${lga.slug}-${wardSlug}`;

                // Deduplicate within the LGA
                const existingWard = await Ward.findOne({
                    name: wardName,
                    lga: lga._id
                });

                if (existingWard) {
                    // Update existing
                    existingWard.wardName = wardName;
                    existingWard.slug = wardSlug;
                    existingWard.areaId = areaId;
                    existingWard.lgaId = lga.lgaId;
                    existingWard.lgaName = lga.name;
                    if (!existingWard.id) existingWard.id = crypto.randomUUID();
                    if (!existingWard.state) existingWard.state = kanoState._id;
                    await existingWard.save();
                    validationReport.updatedWards++;
                    validationReport.processedWards++;
                    lgaCounts[lgaName]++;
                } else {
                    // Upsert by areaId to ensure no duplicates based on areaId
                    const result = await Ward.findOneAndUpdate(
                        {
                            $or: [
                                { name: wardName, lga: lga._id },
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
                                lga: lga._id,
                                lgaId: lga.lgaId,
                                lgaName: lga.name,
                            }
                        },
                        { upsert: true, returnDocument: 'after', rawResult: true }
                    );
                    
                    if (result && result.lastErrorObject && result.lastErrorObject.updatedExisting) {
                        validationReport.updatedWards++;
                    } else {
                        validationReport.insertedWards++;
                    }
                    validationReport.processedWards++;
                    lgaCounts[lgaName]++;
                }
            }
        }

        console.log("Validating and removing duplicate wards...");
        // Validation and duplicate removal
        for (const [lgaName, wards] of Object.entries(lgasAndWards)) {
            const lga = await LGA.findOne({
                name: new RegExp(`^${lgaName}$`, 'i'),
                state: kanoState._id
            });
            
            if(!lga) continue;
            
            for(const wardName of wards) {
                const dbWards = await Ward.find({ name: wardName, lga: lga._id });
                if (dbWards.length > 1) {
                    console.log(`Found duplicate wards for ${wardName} in ${lgaName}. Removing...`);
                    // Keep the first, delete the rest
                    const [keep, ...remove] = dbWards;
                    for (const r of remove) {
                        await Ward.deleteOne({ _id: r._id });
                        lgaCounts[lgaName]--;
                    }
                }
                
                // Validate ward belongs to correct LGA
                const checkWard = await Ward.findOne({ name: wardName, lga: lga._id });
                if (checkWard && checkWard.lga.toString() !== lga._id.toString()) {
                     validationReport.errors.push(`Validation Error: Ward ${wardName} is linked to wrong LGA!`);
                }
            }
        }

        console.log("\n============================================");
        console.log("Import Summary:");
        console.log("============================================");
        for (const [lgaName, count] of Object.entries(lgaCounts)) {
            console.log(`- ${lgaName}: ${count} wards imported`);
        }
        console.log("============================================\n");
        
        if (validationReport.errors.length > 0) {
            console.log("Validation Errors:");
            validationReport.errors.forEach(err => console.log(`- ${err}`));
        } else {
            console.log("No validation errors found.");
        }

        fs.writeFileSync(path.join(__dirname, "ward_import_report2.json"), JSON.stringify(validationReport, null, 2));

        console.log("Done updating Kano wards.");
        process.exit(0);

    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
};

run();
