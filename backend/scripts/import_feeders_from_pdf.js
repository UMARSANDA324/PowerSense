import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import InjectionSubstation from "../models/Location/InjectionSubstation.js";
import Feeder from "../models/Location/Feeder.js";
import State from "../models/Location/State.js";
import { geocodeWithNominatim, sleep } from "../services/geocodingService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const createSlug = (name) => {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
};

const run = async () => {
  try {
    console.log("🔌 Connecting to database...");
    await connectDB();

    // Read and parse extracted PDF text
    const textPath = path.join(__dirname, "../docs/extracted_pdf.txt");
    const content = fs.readFileSync(textPath, "utf8");
    const lines = content.split("\n").filter(line => line.trim());

    // Get all substations from DB for matching
    const substations = await InjectionSubstation.find();
    const substationMap = new Map();
    substations.forEach(sub => {
      const normalizedName = sub.name.toLowerCase().replace(/\s+/g, '');
      substationMap.set(normalizedName, sub);
      
      // Also add partial matches like "club" for "club injection substation"
      if (normalizedName.includes("injection")) {
        const shortName = normalizedName.replace("injection", "").replace("substation", "").trim();
        if (shortName) {
          substationMap.set(shortName, sub);
        }
      }
      if (normalizedName.includes("ts")) {
        const shortName = normalizedName.replace("ts", "").trim();
        if (shortName) {
          substationMap.set(shortName, sub);
        }
      }
    });

    console.log("\n📥 Parsing feeders from PDF...");
    const feeders = [];
    const BANNED_AREAS = ['KATSINA', 'JIGAWA', 'DAURA', 'FUNTUA', 'MUSAWA', 'KAZAURE', 'KANKIA', 'DUTSE', 'HADEJIA', 'BIRNIN KUDU', 'MALUMFASHI'];

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();

      // Skip lines that are page markers or headers
      if (line.startsWith("--") || line.includes("Service Band") || line.includes("Supplementary Order")) continue;

      // Try to match lines that have feeder info (starts with number, band, etc.)
      const match = line.match(/^(\d+)\s+([ABCDE])\s+(11KV|33KV)?\s*([\w\s]+?)\s+([\w\s]+?(?:INJECTION SUBSTATION|SUSTATION|SUB STATION|TS))?\s*([\w\s]*?)\s*(\d+)?$/i);

      if (match) {
        const [, , band, voltageStr, feederName, substationName, location] = match;

        // Skip non-Kano feeders
        const isNonKano = BANNED_AREAS.some(area => line.toUpperCase().includes(area));
        if (isNonKano) continue;

        // Clean up feeder name
        let cleanFeederName = feederName.trim();
        if (!cleanFeederName) continue;

        // Determine voltage
        let voltage = voltageStr || null;
        if (!voltage && cleanFeederName.includes("11KV")) voltage = "11KV";
        if (!voltage && cleanFeederName.includes("33KV")) voltage = "33KV";

        // Try to find matching substation
        let substationId = null;
        if (substationName) {
          const normalizedSubName = substationName.toLowerCase().replace(/\s+/g, '');
          let foundSub = substationMap.get(normalizedSubName);
          
          // If not found, try to match parts
          if (!foundSub) {
            for (const [key, sub] of substationMap) {
              if (normalizedSubName.includes(key) || key.includes(normalizedSubName)) {
                foundSub = sub;
                break;
              }
            }
          }
          
          if (foundSub) {
            substationId = foundSub._id;
          }
        }

        feeders.push({
          name: cleanFeederName,
          slug: createSlug(cleanFeederName),
          band,
          voltageLevel: voltage,
          substationName: substationName?.trim() || null,
          injectionSubstationId: substationId,
          status: "active"
        });
      }
    }

    console.log(`✅ Found ${feeders.length} feeders in PDF`);

    // Deduplicate feeders
    const uniqueFeeders = [];
    const seenSlugs = new Set();
    let duplicates = 0;

    for (const feeder of feeders) {
      if (!seenSlugs.has(feeder.slug)) {
        uniqueFeeders.push(feeder);
        seenSlugs.add(feeder.slug);
      } else {
        duplicates++;
      }
    }

    console.log(`✂️ Deduplicated: ${duplicates} duplicates removed`);
    console.log(`📋 Unique feeders to import: ${uniqueFeeders.length}`);

    // Import each feeder
    let imported = 0;
    let updated = 0;
    let withoutSubstation = 0;
    let missingBand = 0;
    let geocoded = 0;

    for (let i = 0; i < uniqueFeeders.length; i++) {
      const feederData = uniqueFeeders[i];
      console.log(`\nProcessing ${i + 1}/${uniqueFeeders.length}: ${feederData.name}`);

      // Check if it exists
      let existingFeeder = await Feeder.findOne({ slug: feederData.slug });
      
      if (!existingFeeder) {
        console.log(`  Creating new feeder...`);
        existingFeeder = new Feeder({
          name: feederData.name,
          slug: feederData.slug,
          band: feederData.band,
          voltageLevel: feederData.voltageLevel,
          injectionSubstationId: feederData.injectionSubstationId,
          injectionSubstation: feederData.substationName,
          status: "active",
          isActive: true
        });
        imported++;
      } else {
        console.log(`  Updating existing feeder...`);
        existingFeeder.band = feederData.band || existingFeeder.band;
        existingFeeder.voltageLevel = feederData.voltageLevel || existingFeeder.voltageLevel;
        existingFeeder.injectionSubstationId = feederData.injectionSubstationId || existingFeeder.injectionSubstationId;
        existingFeeder.updatedAt = new Date();
        updated++;
      }

      // Check for missing data
      if (!existingFeeder.injectionSubstationId) withoutSubstation++;
      if (!existingFeeder.band) missingBand++;

      // Try to geocode if no coordinates
      if (!existingFeeder.coordinates || !existingFeeder.coordinates.latitude) {
        console.log(`  Attempting to geocode...`);
        try {
          const query = `${feederData.name}, Kano, Nigeria`;
          const location = await geocodeWithNominatim(query);
          
          if (location) {
            existingFeeder.coordinates = {
              latitude: location.latitude,
              longitude: location.longitude
            };
            geocoded++;
            console.log(`  ✅ Geocoded: (${location.latitude}, ${location.longitude})`);
          } else {
            console.log(`  ⚠️ Geocoding failed, leaving coordinates empty`);
          }
        } catch (error) {
          console.log(`  ❌ Error geocoding: ${error.message}`);
        }

        // Sleep to respect rate limits
        await sleep(1100);
      }

      await existingFeeder.save();
      console.log(`  ✅ Saved successfully`);
    }

    console.log("\n🎉 Feeder import complete!");
    console.log(`  Imported: ${imported}`);
    console.log(`  Updated: ${updated}`);
    console.log(`  Geocoded: ${geocoded}`);
    console.log(`\n📊 Validation Results:`);
    console.log(`  ✔ Total Feeders: ${await Feeder.countDocuments()}`);
    console.log(`  ✔ Feeders without Substation: ${withoutSubstation}`);
    console.log(`  ✔ Duplicate Feeders: ${duplicates}`);
    console.log(`  ✔ Missing Band: ${missingBand}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

run();
