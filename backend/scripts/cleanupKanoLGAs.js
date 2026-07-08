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

const cleanup = async () => {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        if (!uri) throw new Error("MONGO_URI not defined");
        
        await mongoose.connect(uri);
        console.log("✓ Connected to MongoDB\n");

        const kanoState = await State.findOne({ name: "Kano" });
        if (!kanoState) {
            console.log("✗ Kano State not found!");
            process.exit(1);
        }

        console.log("PHASE 1: REMOVE INVALID/DUPLICATE LGAs");
        console.log("=".repeat(60));

        // Get all LGAs for Kano
        const allKanoLGAs = await LGA.find({ state: kanoState._id });
        console.log(`Found ${allKanoLGAs.length} total LGAs for Kano State\n`);

        let removedCount = 0;
        let invalidLGAs = [];

        for (const lga of allKanoLGAs) {
            if (!VALID_KANO_LGAS.includes(lga.name)) {
                console.log(`  ✗ INVALID LGA FOUND: "${lga.name}" (not in official list)`);
                invalidLGAs.push(lga);
                removedCount++;
            }
        }

        if (invalidLGAs.length > 0) {
            console.log(`\n  → Removing ${invalidLGAs.length} invalid LGAs..`);
            
            for (const lga of invalidLGAs) {
                // Check for linked wards/feeders before deletion
                const linkedWards = await Ward.find({ lga: lga._id });
                if (linkedWards.length > 0) {
                    console.log(`    → Removing ${linkedWards.length} wards from "${lga.name}"`);
                    for (const ward of linkedWards) {
                        await Feeder.updateMany(
                            { wards: ward._id },
                            { $pull: { wards: ward._id } }
                        );
                    }
                    await Ward.deleteMany({ lga: lga._id });
                }
                
                // Mark as inactive instead of deleting
                lga.isActive = false;
                await lga.save();
                console.log(`    ✓ Deactivated: ${lga.name}`);
            }
        } else {
            console.log("  ✓ No invalid LGAs found!");
        }

        console.log("\nPHASE 2: CHECK FOR DUPLICATE LGA NAMES");
        console.log("=".repeat(60));

        const validLGAs = await LGA.find({ 
            state: kanoState._id, 
            isActive: { $ne: false }
        });

        const lgaNames = {};
        let duplicateCount = 0;

        for (const lga of validLGAs) {
            if (lgaNames[lga.name]) {
                console.log(`  ⚠ DUPLICATE FOUND: "${lga.name}"`);
                console.log(`    ID 1: ${lgaNames[lga.name]}`);
                console.log(`    ID 2: ${lga._id}`);
                
                // Keep the first one, deactivate the duplicate
                lga.isActive = false;
                await lga.save();
                console.log(`    → Deactivated duplicate`);
                duplicateCount++;
            } else {
                lgaNames[lga.name] = lga._id;
            }
        }

        if (duplicateCount > 0) {
            console.log(`\n  ✓ Removed ${duplicateCount} duplicates`);
        } else {
            console.log(`\n  ✓ No duplicates found!`);
        }

        console.log("\nPHASE 3: VERIFY ALL 44 LGAs PRESENT");
        console.log("=".repeat(60));

        const activeKanoLGAs = await LGA.find({ 
            state: kanoState._id, 
            isActive: { $ne: false }
        }).sort({ name: 1 });

        console.log(`Active LGAs: ${activeKanoLGAs.length}/44\n`);

        if (activeKanoLGAs.length === 44) {
            console.log("✓ ALL 44 LGAs VERIFIED!");
            activeKanoLGAs.forEach(lga => console.log(`  ✓ ${lga.name}`));
        } else {
            console.log("⚠ WARNING: Not all 44 LGAs found!");
            const foundNames = activeKanoLGAs.map(l => l.name);
            const missing = VALID_KANO_LGAS.filter(n => !foundNames.includes(n));
            if (missing.length > 0) {
                console.log("\nMissing LGAs:");
                missing.forEach(m => console.log(`  ✗ ${m}`));
            }
        }

        console.log("\n" + "=".repeat(60));
        console.log("CLEANUP SUMMARY");
        console.log("=".repeat(60));
        console.log(`Invalid LGAs deactivated: ${invalidLGAs.length}`);
        console.log(`Duplicates removed: ${duplicateCount}`);
        console.log(`Active LGAs now: ${activeKanoLGAs.length}`);
        console.log("✓ Cleanup complete!");

        process.exit(0);

    } catch (error) {
        console.error("✗ Cleanup failed:", error.message);
        process.exit(1);
    }
};

cleanup();
