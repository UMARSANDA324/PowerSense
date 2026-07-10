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

/**
 * EXACT 44 KANO STATE LGAs (Official List)
 */
const VALID_KANO_LGAS = [
    "Ajingi", "Albasu", "Bagwai", "Bebeji", "Bichi", "Bunkure", "Dala",
    "Dala Rural", "Danbatta", "Dawakin Kudu", "Dawakin Tofa", "Doguwa", "Fagge",
    "Gabasawa", "Garko", "Garum Mallam", "Gaya", "Gezawa", "Gwale",
    "Gwarzo", "Kabo", "Kano Municipal", "Karaye", "Kibiya", "Kiru",
    "Kumbotso", "Kunchi", "Kura", "Madobi", "Makoda", "Minjibir",
    "Nasarawa", "Rano", "Rimin Gado", "Rogo", "Shanono", "Sumaila",
    "Takai", "Tarauni", "Tofa", "Tsanyawa", "Tudun Wada", "Ungogo",
    "Warawa", "Wudil"
];

const verify = async () => {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        if (!uri) throw new Error("MONGO_URI not defined");
        
        await mongoose.connect(uri);
        console.log("\n" + "=".repeat(70));
        console.log("KANO STATE LOCATION ENGINE VERIFICATION REPORT");
        console.log("=".repeat(70) + "\n");

        // Get Kano State
        const kanoState = await State.findOne({ name: "Kano" });
        if (!kanoState) {
            console.log("✗ ERROR: Kano State not found in database!");
            process.exit(1);
        }

        console.log("1. STATE VERIFICATION");
        console.log("─".repeat(70));
        console.log(`   ✓ Kano State exists`);
        console.log(`   ✓ Active: ${kanoState.isActive}`);
        console.log(`   ✓ Created: ${kanoState.createdAt}\n`);

        // Get all LGAs
        const allLGAs = await LGA.find({ state: kanoState._id }).sort({ name: 1 });
        const activeLGAs = allLGAs.filter(l => l.isActive !== false);
        const inactiveLGAs = allLGAs.filter(l => l.isActive === false);

        console.log("2. LOCAL GOVERNMENT AREAS (LGAs)");
        console.log("─".repeat(70));
        console.log(`   Total LGAs in database: ${allLGAs.length}`);
        console.log(`   Active LGAs: ${activeLGAs.length}`);
        console.log(`   Inactive/Deleted: ${inactiveLGAs.length}\n`);

        // Check for valid LGAs
        const validLGAMap = {};
        const extraLGAs = [];
        
        for (const lga of activeLGAs) {
            if (VALID_KANO_LGAS.includes(lga.name)) {
                validLGAMap[lga.name] = true;
            } else {
                extraLGAs.push(lga.name);
            }
        }

        const foundLGAs = Object.keys(validLGAMap).length;
        const missingLGAs = VALID_KANO_LGAS.filter(name => !validLGAMap[name]);

        console.log(`   ✓ Valid LGAs present: ${foundLGAs}/${VALID_KANO_LGAS.length}\n`);

        if (foundLGAs === VALID_KANO_LGAS.length) {
            console.log(`   ✓ ALL ${VALID_KANO_LGAS.length} OFFICIAL KANO LGAs ARE PRESENT!`);
        } else {
            if (missingLGAs.length > 0) {
                console.log(`   ⚠ MISSING: ${missingLGAs.length} LGAs`);
                missingLGAs.forEach(m => console.log(`     ✗ ${m}`));
                console.log();
            }
        }

        if (extraLGAs.length > 0) {
            console.log(`   ⚠ EXTRA/INVALID: ${extraLGAs.length} LGAs (not in official list)`);
            extraLGAs.forEach(e => console.log(`     ✗ ${e}`));
            console.log();
        }

        // List all valid LGAs
        console.log("   COMPLETE LGA LIST:");
        const sortedValidLGAs = activeLGAs.filter(l => VALID_KANO_LGAS.includes(l.name)).sort((a, b) => a.name.localeCompare(b.name));
        sortedValidLGAs.forEach((lga, idx) => {
            console.log(`     ${String(idx + 1).padStart(2, ' ')}. ${lga.name}`);
        });
        console.log();

        // Check for duplicates
        const lgaNameCounts = {};
        for (const lga of activeLGAs) {
            lgaNameCounts[lga.name] = (lgaNameCounts[lga.name] || 0) + 1;
        }

        const duplicates = Object.entries(lgaNameCounts).filter(([, count]) => count > 1);

        console.log("3. DUPLICATE CHECK");
        console.log("─".repeat(70));
        if (duplicates.length === 0) {
            console.log("   ✓ No duplicate LGAs found\n");
        } else {
            console.log(`   ⚠ DUPLICATES FOUND: ${duplicates.length}`);
            duplicates.forEach(([name, count]) => console.log(`     ✗ ${name}: ${count} copies`));
            console.log();
        }

        // Check wards and feeders
        const wards = await Ward.find({ lga: { $in: activeLGAs.map(l => l._id) } });
        const feeders = await Feeder.find({ isActive: { $ne: false } });

        console.log("4. LOCATION HIERARCHY");
        console.log("─".repeat(70));
        console.log(`   States: 1 (Kano)`);
        console.log(`   LGAs: ${activeLGAs.length}`);
        console.log(`   Wards: ${wards.length}`);
        console.log(`   Feeders: ${feeders.length}\n`);

        // Check for normalized capitalization issues
        console.log("5. DATA NORMALIZATION");
        console.log("─".repeat(70));
        let normalizationIssues = [];
        
        for (const lga of activeLGAs) {
            const proper = VALID_KANO_LGAS.find(n => n.toLowerCase() === lga.name.toLowerCase());
            if (proper && proper !== lga.name) {
                normalizationIssues.push({ current: lga.name, expected: proper });
            }
        }

        if (normalizationIssues.length === 0) {
            console.log("   ✓ All LGA names properly capitalized\n");
        } else {
            console.log(`   ⚠ Capitalization issues found: ${normalizationIssues.length}`);
            normalizationIssues.forEach(issue => {
                console.log(`     ✗ "${issue.current}" → should be "${issue.expected}"`);
            });
            console.log();
        }

        // Final verdict
        console.log("6. OVERALL STATUS");
        console.log("─".repeat(70));
        
        const checks = [
            { name: `All ${VALID_KANO_LGAS.length} LGAs present`, pass: foundLGAs === VALID_KANO_LGAS.length },
            { name: "No extra/invalid LGAs", pass: extraLGAs.length === 0 },
            { name: "No duplicates", pass: duplicates.length === 0 },
            { name: "Proper capitalization", pass: normalizationIssues.length === 0 },
            { name: "Wards exist", pass: wards.length > 0 },
            { name: "Feeders exist", pass: feeders.length > 0 }
        ];

        let allPass = true;
        checks.forEach(check => {
            console.log(`   ${check.pass ? "✓" : "✗"} ${check.name}`);
            if (!check.pass) allPass = false;
        });

        console.log("\n" + "=".repeat(70));
        if (allPass && foundLGAs === VALID_KANO_LGAS.length) {
            console.log("✓ LOCATION ENGINE READY FOR WARD IMPORT!");
        } else {
            console.log("⚠ ACTION REQUIRED - See issues above");
        }
        console.log("=".repeat(70) + "\n");

        process.exit(0);

    } catch (error) {
        console.error("\n✗ Verification failed:", error.message);
        process.exit(1);
    }
};

verify();
