import mongoose from "mongoose";
import dotenv from "dotenv";
import State from "../models/Location/State.js";
import LGA from "../models/Location/LGA.js";
import { buildLGAStableId, slugify } from "../utils/slugGenerator.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

/**
 * KANO STATE LGAs FOR POWER SENSE LOCATION ENGINE
 * Includes Dala Rural and Danbatta for the Phase 3 import batch.
 */
const KANO_LGAS = [
    "Ajingi",
    "Albasu",
    "Bagwai",
    "Bebeji",
    "Bichi",
    "Bunkure",
    "Dala",
    "Dala Rural",
    "Danbatta",
    "Dawakin Kudu",
    "Dawakin Tofa",
    "Doguwa",
    "Fagge",
    "Gabasawa",
    "Garko",
    "Garum Mallam",
    "Gaya",
    "Gezawa",
    "Gwale",
    "Gwarzo",
    "Kabo",
    "Kano Municipal",
    "Karaye",
    "Kibiya",
    "Kiru",
    "Kumbotso",
    "Kunchi",
    "Kura",
    "Madobi",
    "Makoda",
    "Minjibir",
    "Nasarawa",
    "Rano",
    "Rimin Gado",
    "Rogo",
    "Shanono",
    "Sumaila",
    "Takai",
    "Tarauni",
    "Tofa",
    "Tsanyawa",
    "Tudun Wada",
    "Ungogo",
    "Warawa",
    "Wudil"
];

const seed = async () => {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        if (!uri) throw new Error("MONGO_URI (or MONGODB_URI) is not defined in .env");
        
        await mongoose.connect(uri);
        console.log("✓ Connected to MongoDB");

        // Create or get Kano State
        let kanoState = await State.findOne({ name: "Kano" });
        if (!kanoState) {
            kanoState = await State.create({ name: "Kano", isActive: true });
            console.log("✓ Created State: Kano");
        } else {
            console.log("✓ Kano State already exists");
        }

        // Create all configured LGAs (prevent duplicates)
        let createdCount = 0;
        let skippedCount = 0;
        const lgaMap = {};

        for (const lgaName of KANO_LGAS) {
            const slug = slugify(lgaName);
            const lgaId = buildLGAStableId(kanoState.name, lgaName);
            let lga = await LGA.findOne({ 
                name: lgaName, 
                state: kanoState._id 
            });
            
            if (!lga) {
                lga = await LGA.create({ 
                    name: lgaName,
                    id: lgaId,
                    slug,
                    lgaId,
                    state: kanoState._id,
                    status: "active",
                    isActive: true
                });
                console.log(`  ✓ Created LGA: ${lgaName}`);
                createdCount++;
            } else {
                let updated = false;
                if (!lga.id || lga.id !== lgaId) {
                    lga.id = lgaId;
                    updated = true;
                }
                if (!lga.slug || lga.slug !== slug) {
                    lga.slug = slug;
                    updated = true;
                }
                if (!lga.lgaId || lga.lgaId !== lgaId) {
                    lga.lgaId = lgaId;
                    updated = true;
                }
                if (lga.status !== "active") {
                    lga.status = "active";
                    updated = true;
                }
                if (lga.isActive === false) {
                    lga.isActive = true;
                    updated = true;
                }
                if (updated) {
                    await lga.save();
                }
                console.log(`  ○ LGA already exists: ${lgaName}`);
                skippedCount++;
            }
            
            lgaMap[lgaName] = lga._id;
        }

        console.log("\n" + "=".repeat(60));
        console.log("SEEDING SUMMARY");
        console.log("=".repeat(60));
        console.log(`Total LGAs: ${KANO_LGAS.length}`);
        console.log(`Created: ${createdCount}`);
        console.log(`Already existed: ${skippedCount}`);
        console.log(`State: Kano`);
        console.log("✓ All 44 Kano LGAs are now in the database!");
        console.log("=".repeat(60));

        process.exit(0);

    } catch (error) {
        console.error("✗ Seeding failed:", error.message);
        process.exit(1);
    }
};

seed();
