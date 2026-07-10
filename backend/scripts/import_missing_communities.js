import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

import LGA from "../models/Location/LGA.js";
import Ward from "../models/Location/Ward.js";
import State from "../models/Location/State.js";
import { buildAreaStableId, buildLGAStableId, slugify } from "../utils/slugGenerator.js";

const normalizeLookupKey = (s) => {
    if (!s) return "";
    return String(s)
        .toLowerCase()
        .replace(/['’\u0060\u00b4]/g, "")
        .replace(/[-\s]/g, "")
        .normalize("NFKD")
        .replace(/[^a-z0-9]/g, "");
};

// LGA name mapping correction
const mapLgaName = (name) => {
    const trimmed = name.trim();
    if (trimmed === "Dala Rural") return "Dala";
    if (trimmed === "Garum Mallam") return "Garun Mallam";
    return trimmed;
};

const run = async () => {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    await mongoose.connect(uri);
    console.log("Connected to MongoDB for community lookup generation.");

    const kano = await State.findOne({ name: "Kano" });
    if (!kano) {
        console.error("Kano State not found!");
        process.exit(1);
    }

    // Load all active Kano Wards to memory for fast checking
    console.log("Caching existing Wards in memory...");
    const existingWards = await Ward.find({ state: kano._id });
    
    // Maps key "LGA_ID:normalized_name" to Ward document
    const wardMap = new Map();
    // Set of all ward ids and areaIds for fast checking
    const wardIdSet = new Set();
    const wardAreaIdSet = new Set();

    for (const w of existingWards) {
        const key = `${w.lga.toString()}:${w.name.toLowerCase().trim()}`;
        wardMap.set(key, w);
        if (w.id) wardIdSet.add(w.id.toLowerCase().trim());
        if (w.areaId) wardAreaIdSet.add(w.areaId.toLowerCase().trim());
    }
    console.log(`Cached ${existingWards.length} wards.`);

    // 1. Read kanoCommunities.json
    const sourcePath = path.join(__dirname, "../data/kanoCommunities.json");
    if (!fs.existsSync(sourcePath)) {
        console.error(`Source communities JSON not found at: ${sourcePath}`);
        process.exit(1);
    }
    const sourceData = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
    console.log(`Loaded ${sourceData.lgas.length} LGAs from source JSON.`);

    let insertedCount = 0;

    for (const sourceLga of sourceData.lgas) {
        const rawLgaName = sourceLga.lga_name.trim();
        const mappedLgaName = mapLgaName(rawLgaName);
        
        const dbLga = await LGA.findOne({ name: mappedLgaName, state: kano._id });
        if (!dbLga) {
            console.error(`  ✗ LGA "${mappedLgaName}" (originally "${rawLgaName}") not found in database!`);
            continue;
        }

        const lgaStableId = dbLga.lgaId || buildLGAStableId("Kano", mappedLgaName);

        for (const sourceComm of sourceLga.communities) {
            const commName = sourceComm.name.trim();
            const commSlug = slugify(commName);
            const commAreaId = buildAreaStableId("Kano", mappedLgaName, commName);

            // Check existence using memory cache
            const cacheKey = `${dbLga._id.toString()}:${commName.toLowerCase()}`;
            const areaIdKey = commAreaId.toLowerCase().trim();

            let exists = wardMap.has(cacheKey) || wardAreaIdSet.has(areaIdKey);

            if (!exists) {
                // Determine ID
                const slugToken = commSlug.replace(/-/g, "_");
                const commId = `community_kano_${slugify(mappedLgaName).replace(/-/g, "_")}_${slugToken}`;

                // Create the missing community record as a Ward document
                const newComm = await Ward.create({
                    name: commName,
                    wardName: commName,
                    id: commId,
                    areaId: commAreaId,
                    slug: commSlug,
                    lga: dbLga._id,
                    lgaId: lgaStableId,
                    lgaName: dbLga.name,
                    state: kano._id,
                    country: "Nigeria",
                    aliases: [],
                    latitude: null,
                    longitude: null,
                    coordinates: null,
                    isUrban: true,
                    status: "active",
                    isActive: true,
                    feederIds: []
                });

                insertedCount++;
                // Add to cache
                wardMap.set(cacheKey, newComm);
                wardIdSet.add(commId.toLowerCase().trim());
                wardAreaIdSet.add(areaIdKey);
            }
        }
    }

    console.log(`Inserted ${insertedCount} missing communities into database.`);

    // 2. Generate the sorted communityLookup.json
    console.log("Generating communityLookup.json...");
    const lookup = {};

    const allWards = await Ward.find({ state: kano._id });
    for (const w of allWards) {
        // Collect lookup keys
        const keys = new Set();
        keys.add(normalizeLookupKey(w.name));
        keys.add(normalizeLookupKey(w.slug));
        if (w.aliases && Array.isArray(w.aliases)) {
            w.aliases.forEach(a => keys.add(normalizeLookupKey(a)));
        }

        for (const k of keys) {
            if (!k) continue;
            if (!lookup[k]) {
                lookup[k] = [];
            }
            // Add entry if not already present
            const exists = lookup[k].some(e => e.communityId === w.id);
            if (!exists) {
                lookup[k].push({
                    lga: w.lgaName,
                    communityId: w.id,
                    slug: w.slug
                });
            }
        }
    }

    // Sort lookup keys alphabetically
    const sortedLookup = {};
    Object.keys(lookup).sort().forEach(key => {
        // Sort entries inside each key by LGA name and communityId to be deterministic
        sortedLookup[key] = lookup[key].sort((a, b) => {
            if (a.lga !== b.lga) return a.lga.localeCompare(b.lga);
            return a.communityId.localeCompare(b.communityId);
        });
    });

    const targetDir = path.join(__dirname, "../data");
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }
    const outputPath = path.join(targetDir, "communityLookup.json");
    fs.writeFileSync(outputPath, JSON.stringify(sortedLookup, null, 2), "utf8");
    console.log(`Saved sorted communityLookup.json to: ${outputPath}`);

    // Also copy it to scripts directory just in case other scripts need it
    const scriptsOutputPath = path.join(__dirname, "communityLookup.json");
    fs.writeFileSync(scriptsOutputPath, JSON.stringify(sortedLookup, null, 2), "utf8");
    console.log(`Saved copy to scripts directory: ${scriptsOutputPath}`);

    await mongoose.disconnect();
    process.exit(0);
};

run();
