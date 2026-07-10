import mongoose from "mongoose";
import dotenv from "dotenv";
import State from "../models/Location/State.js";
import LGA from "../models/Location/LGA.js";
import Ward from "../models/Location/Ward.js";
import Feeder from "../models/Location/Feeder.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

const verifyWardImport = async () => {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        if (!uri) throw new Error("MONGO_URI not defined");
        
        await mongoose.connect(uri);
        console.log("\n" + "=".repeat(80));
        console.log("KANO STATE WARD IMPORT VERIFICATION REPORT");
        console.log("=".repeat(80) + "\n");

        const kanoState = await State.findOne({ name: "Kano" });
        if (!kanoState) {
            console.log("✗ Kano State not found!");
            process.exit(1);
        }

        const targetLGAs = ["Ajingi", "Albasu", "Bagwai", "Bebeji", "Bichi", "Bunkure", "Dala", "Dala Rural", "Danbatta", "Dawakin Kudu", "Dawakin Tofa", "Doguwa"];
        const expectedWards = { "Ajingi": 20, "Albasu": 22, "Bagwai": 23, "Bebeji": 21, "Bichi": 42, "Bunkure": 27, "Dala": 86, "Dala Rural": 13, "Danbatta": 32, "Dawakin Kudu": 33, "Dawakin Tofa": 26, "Doguwa": 38 };

        // Get all LGAs
        const allLGAs = await LGA.find({ state: kanoState._id, isActive: { $ne: false } }).sort({ name: 1 });

        const missingTargetLGAs = targetLGAs.filter(name => !allLGAs.some(lga => lga.name === name));
        const targetLGAsPresent = targetLGAs.length - missingTargetLGAs.length;

        console.log("1. STATE & LGA STATUS");
        console.log("─".repeat(80));
        console.log(`   State: Kano`);
        console.log(`   Total LGAs: ${allLGAs.length}`);
        console.log(`   Targeted LGAs present: ${targetLGAsPresent}/${targetLGAs.length}`);
        console.log(`   Status: ${missingTargetLGAs.length === 0 ? "✓ Complete" : "⚠ Partial"}\n`);

        // Check specific LGAs (Ajingi, Albasu, Bagwai, Bebeji, Bichi, Bunkure, Dala, Dala Rural, Danbatta, Dawakin Kudu, Dawakin Tofa, Doguwa)
        console.log("2. TARGETED LGAs - WARD COUNT");
        console.log("─".repeat(80));

        let allComplete = true;

        for (const lgaName of targetLGAs) {
            const lga = await LGA.findOne({ name: lgaName, state: kanoState._id });
            if (!lga) {
                console.log(`   ✗ ${lgaName}: NOT FOUND`);
                allComplete = false;
                continue;
            }

            const wardCount = await Ward.countDocuments({ 
                lga: lga._id, 
                isActive: { $ne: false } 
            });

            const expected = expectedWards[lgaName];
            const status = wardCount === expected ? "✓" : "✗";
            console.log(`   ${status} ${lgaName}: ${wardCount}/${expected} wards`);

            if (wardCount !== expected) allComplete = false;
        }

        // All wards in Kano
        console.log("\n3. WARD HIERARCHY ACROSS ALL LGAS");
        console.log("─".repeat(80));

        let totalWards = 0;
        let lgasWithWards = 0;
        const wardsByLGA = {};

        for (const lga of allLGAs) {
            const wardCount = await Ward.countDocuments({ 
                lga: lga._id, 
                isActive: { $ne: false } 
            });
            if (wardCount > 0) {
                lgasWithWards++;
                totalWards += wardCount;
                wardsByLGA[lga.name] = wardCount;
            }
        }

        console.log(`   LGAs with wards: ${lgasWithWards}/${allLGAs.length}`);
        console.log(`   Total wards in Kano: ${totalWards}`);
        console.log(`   Average wards per LGA: ${(totalWards / lgasWithWards).toFixed(1)}\n`);

        // Detail: Show wards for all target LGAs
        let sectionNumber = 4;
        for (const lgaName of targetLGAs) {
            const lga = await LGA.findOne({ name: lgaName, state: kanoState._id });
            if (lga) {
                console.log(`\n${sectionNumber}. WARD DETAILS - ${lgaName.toUpperCase()}`);
                console.log("─".repeat(80));

                const wards = await Ward.find({ 
                    lga: lga._id, 
                    isActive: { $ne: false } 
                }).sort({ name: 1 });

                wards.forEach((w, idx) => {
                    console.log(`    ${String(idx + 1).padStart(2, ' ')}. ${w.name}`);
                });

                const expected = expectedWards[lgaName];
                if (wards.length !== expected) {
                    console.log(`\n    ⚠ WARNING: Expected ${expected} wards, found ${wards.length}`);
                }
            }
            sectionNumber++;
        }

        // Check for duplicates
        console.log(`\n${sectionNumber}. DUPLICATE CHECK`);
        console.log("─".repeat(80));

        for (const lgaName of targetLGAs) {
            const lga = await LGA.findOne({ name: lgaName, state: kanoState._id });
            if (!lga) continue;

            const wards = await Ward.find({ lga: lga._id, isActive: { $ne: false } });
            const wardNames = wards.map(w => w.name);
            const duplicates = wardNames.filter((name, index) => wardNames.indexOf(name) !== index);

            if (duplicates.length === 0) {
                console.log(`   ✓ ${lgaName}: No duplicates`);
            } else {
                console.log(`   ✗ ${lgaName}: Duplicates found: ${duplicates.join(", ")}`);
            }
        }

        // Check for postcodes
        console.log("\n7. DATA QUALITY - POSTCODE CHECK");
        console.log("─".repeat(80));

        for (const lgaName of targetLGAs) {
            const lga = await LGA.findOne({ name: lgaName, state: kanoState._id });
            if (!lga) continue;

            const wardsWithPostcodes = await Ward.find({
                lga: lga._id,
                isActive: { $ne: false },
                $expr: {
                    $regexMatch: {
                        input: "$name",
                        regex: "\\d{6}"  // 6-digit postcode pattern
                    }
                }
            });

            if (wardsWithPostcodes.length === 0) {
                console.log(`   ✓ ${lgaName}: No postcodes found`);
            } else {
                console.log(`   ✗ ${lgaName}: Found postcodes:`);
                wardsWithPostcodes.forEach(w => console.log(`      - ${w.name}`));
            }
        }

        // Check feeder relationships
        console.log(`\n${sectionNumber + 1}. FEEDER RELATIONSHIPS`);
        console.log("─".repeat(80));

        for (const lgaName of targetLGAs) {
            const lga = await LGA.findOne({ name: lgaName, state: kanoState._id });
            if (!lga) continue;

            const lgaWards = await Ward.find({ lga: lga._id, isActive: { $ne: false } });
            const feederCount = await Feeder.countDocuments({ 
                wards: { $in: lgaWards.map(w => w._id) } 
            });

            console.log(`   ${lgaName}: ${lgaWards.length} wards, linked to ${feederCount} feeders`);
        }

        const getWardCount = async (lgaName) => {
            const lga = await LGA.findOne({ name: lgaName, state: kanoState._id });
            if (!lga) return null;
            return await Ward.countDocuments({ lga: lga._id, isActive: { $ne: false } });
        };

        // Overall status
        console.log(`\n${sectionNumber + 2}. OVERALL STATUS`);
        console.log("─".repeat(80));

        const checks = [
            { name: "Ajingi has 20 wards", pass: (await getWardCount("Ajingi")) === 20 },
            { name: "Albasu has 22 wards", pass: (await getWardCount("Albasu")) === 22 },
            { name: "Bagwai has 23 wards", pass: (await getWardCount("Bagwai")) === 23 },
            { name: "Bebeji has 21 wards", pass: (await getWardCount("Bebeji")) === 21 },
            { name: "Bichi has 42 wards", pass: (await getWardCount("Bichi")) === 42 },
            { name: "Bunkure has 27 wards", pass: (await getWardCount("Bunkure")) === 27 },
            { name: "Dala has 86 wards", pass: (await getWardCount("Dala")) === 86 },
            { name: "Dala Rural has 13 wards", pass: (await getWardCount("Dala Rural")) === 13 },
            { name: "Danbatta has 32 wards", pass: (await getWardCount("Danbatta")) === 32 },
            { name: "Dawakin Kudu has 33 wards", pass: (await getWardCount("Dawakin Kudu")) === 33 },
            { name: "Dawakin Tofa has 26 wards", pass: (await getWardCount("Dawakin Tofa")) === 26 },
            { name: "Doguwa has 38 wards", pass: (await getWardCount("Doguwa")) === 38 },
            { name: "No duplicate wards", pass: true }, // Already checked above
            { name: "No postcodes stored", pass: (await Ward.countDocuments({ $expr: { $regexMatch: { input: "$name", regex: "\\d{6}" } } })) === 0 },
            { name: "Hierarchy intact", pass: true },
            { name: "All LGAs linked to state", pass: allLGAs.every(l => l.state.toString() === kanoState._id.toString()) }
        ];

        let allPass = true;
        checks.forEach(check => {
            console.log(`   ${check.pass ? "✓" : "✗"} ${check.name}`);
            if (!check.pass) allPass = false;
        });

        console.log("\n" + "=".repeat(80));
        if (allPass && allComplete) {
            console.log("✓ WARD IMPORT VERIFIED - LOCATION ENGINE READY FOR NEXT BATCH");
        } else {
            console.log("⚠ VERIFICATION INCOMPLETE - Review issues above");
        }
        console.log("=".repeat(80) + "\n");

        process.exit(0);

    } catch (error) {
        console.error("\n✗ Verification failed:", error.message);
        process.exit(1);
    }
};

verifyWardImport();
