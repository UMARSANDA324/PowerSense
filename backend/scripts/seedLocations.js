
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

const areaFeederMapping = {
    "Challawa": "33kV Challawa Water Works",
    "Chiranchi": "Chiranchi 11kV",
    "Danbare": "BUK 33kV",
    "Danmaliki": "Danmaliki 11kV",
    "Guringawa": "Guringawa 11kV",
    "Kumbotso": "Kumbotso 33kV",
    "Kureken Sani": "Kureken Sani 11kV",
    "Mariri": "Mariri 33kV",
    "Na'ibawa": "Na'ibawa 11kV",
    "Panshekara": "33kV Challawa Water Works",
    "Sheka": "Sheka 11kV",
    "Tudun Maliki": "Tudun Maliki 11kV",
    "Unguwar Rimi": "Unguwar Rimi 11kV",
    "Sheka Gabas": "Sheka 11kV",
    "Sheka Gidan Kaji": "Sheka 11kV",
    "Sallari": "Na'ibawa 11kV",
    "Sheka Gidan Leda": "Sheka 11kV",
    "Sheka Sabuwar Abuja": "Sheka 11kV"
};

const KANO_LGAS = [
  "Ajinkyira", "Albasu", "Alludden", "Tarauni", "Bello", "Bebeji", "Bunkure", 
  "Dala", "Dambatta", "Dawakin Kudu", "Dawakin Tofa", "Doguwa", "Fagge", 
  "Fijai", "Gabasawa", "Garko", "Garun Mallam", "Gaya", "Gidan Lada", 
  "Gilani", "Gumel", "Guri", "Gwarzo", "Kabo", "Kachako", "Kachako Kano", 
  "Kajiji", "Kando", "Karaye", "Karfi", "Katsina", "Kauran Namoda", 
  "Kawaji", "Kibiya", "Kiru", "Kofa", "Kofar Mata", "Kumbotso", "Kunchi", 
  "Kurkur", "Kura", "Kware", "Madobi", "Makoda"
];

const seed = async () => {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        if (!uri) throw new Error("MONGO_URI (or MONGODB_URI) is not defined in .env");
        
        await mongoose.connect(uri);
        console.log("Connected to MongoDB...");

        // 1. Create State
        let kanoState = await State.findOne({ name: "Kano" });
        if (!kanoState) {
            kanoState = await State.create({ name: "Kano" });
            console.log("Created State: Kano");
        }

        // 2. Create LGAs
        const lgaMap = {};
        for (const lgaName of KANO_LGAS) {
            let lga = await LGA.findOne({ name: lgaName, state: kanoState._id });
            if (!lga) {
                lga = await LGA.create({ name: lgaName, state: kanoState._id });
                console.log(`Created LGA: ${lgaName}`);
            }
            lgaMap[lgaName] = lga;
        }

        // 3. Create Wards and Feeders
        // We'll map most wards to Kumbotso for now as it's the primary area in the app
        const defaultLGA = lgaMap["Kumbotso"];

        for (const [wardName, feederName] of Object.entries(areaFeederMapping)) {
            // Determine LGA (heuristics or default)
            let targetLGA = defaultLGA;
            if (wardName === "Na'ibawa" || wardName === "Sallari") targetLGA = lgaMap["Tarauni"] || defaultLGA;
            if (wardName === "Chiranchi") targetLGA = lgaMap["Dala"] || defaultLGA;
            if (wardName === "Unguwar Rimi") targetLGA = lgaMap["Tarauni"] || defaultLGA;

            // Create Ward
            let ward = await Ward.findOne({ name: wardName, lga: targetLGA._id });
            if (!ward) {
                ward = await Ward.create({ name: wardName, lga: targetLGA._id });
                console.log(`Created Ward: ${wardName} in ${targetLGA.name}`);
            }

            // Create or Update Feeder
            let feeder = await Feeder.findOne({ name: feederName });
            if (!feeder) {
                feeder = await Feeder.create({ name: feederName, wards: [ward._id] });
                console.log(`Created Feeder: ${feederName} linked to ${wardName}`);
            } else {
                // If feeder exists, add this ward if not already present
                if (!feeder.wards.includes(ward._id)) {
                    feeder.wards.push(ward._id);
                    await feeder.save();
                    console.log(`Updated Feeder: ${feederName} added ${wardName}`);
                }
            }
        }

        console.log("Seeding completed successfully!");
        process.exit();

    } catch (error) {
        console.error("Seeding failed:", error);
        process.exit(1);
    }
};

seed();
