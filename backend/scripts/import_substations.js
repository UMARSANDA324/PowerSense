import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import State from "../models/Location/State.js";
import InjectionSubstation from "../models/Location/InjectionSubstation.js";
import { geocodeWithNominatim, sleep } from "../services/geocodingService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

// Substations list from the KEDCO PDF
const KANO_SUBSTATIONS = [
  "11KV GWARZO ROAD",
  "33KV GASKIYA",
  "33KV SARKIN YAKI",
  "ABATTOIR INJECTION SUBSTATION",
  "ADO BAYERO INJECTION SUBSTATION",
  "BICHI INJECTION SUBSTATION",
  "BICHI TS",
  "BRISCOE INJECTION SUBSTATION",
  "BUK INJECTION SUBSTATION",
  "BUKAVU INJECTION SUBSTATION",
  "CHALAWA INJECTION SUBSTATION",
  "CHALLAWA INJECTION SUBSTATION",
  "CLUB INJECTION SUBSTATION",
  "DAKATA TS",
  "DAN AGUNDI INJECTION SUBSTATION",
  "DAN AGUNDI TS",
  "DANGORA TS",
  "FARM CENTER INJECTION SUBSTATION",
  "GONGONI INJECTION SUBSTATION",
  "GUMEL INJECTION SUBSTATION",
  "IBB WAY INJECTION SUBSTATION",
  "IBB WAY NIPP INJECTION SUBSTATION",
  "IDH INJECTION SUBSTATION",
  "JOGANA INJECTION SUBSTATION",
  "KAWAJI INJECTION SUBSTATION",
  "KUMBOTSO TS",
  "LAW SCHOOL INJECTION SUBSTATION",
  "MALAN MADORI INJECTION SUBSTATION",
  "MARIRI INJECTION SUBSTATION",
  "NAIBAWA INJECTION SUBSTATION",
  "PRP INJECTION SUBSTATION",
  "RADIO HOUSE INJECTION SUBSTATION",
  "SHARADA INJECTION SUBSTATION",
  "SMALL SCALE INJECTION SUBSTATION",
  "TAMBURAWA INJECTION SUBSTATION",
  "TAMBURAWA TS",
  "WUDIL INJECTION SUBSTATION",
  "WUDIL TS",
  "WUDL TS",
  "ZARIA ROAD INJECTION SUBSTATION"
];

const createSlug = (name) => {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
};

const run = async () => {
  try {
    console.log("🔌 Connecting to database...");
    await connectDB();

    console.log("🌍 Finding or creating Kano State...");
    let kanoState = await State.findOne({ name: "Kano" });
    if (!kanoState) {
      kanoState = await State.create({ name: "Kano" });
      console.log("✅ Created Kano State");
    } else {
      console.log("✅ Found Kano State");
    }

    console.log("\n📥 Importing substations...");
    let imported = 0;
    let updated = 0;
    let geocoded = 0;

    for (let i = 0; i < KANO_SUBSTATIONS.length; i++) {
      const substationName = KANO_SUBSTATIONS[i];
      const slug = createSlug(substationName);

      console.log(`\nProcessing ${i + 1}/${KANO_SUBSTATIONS.length}: ${substationName}`);

      // Determine voltage
      let voltage = null;
      if (substationName.includes("11KV")) {
        voltage = "11KV";
      } else if (substationName.includes("33KV")) {
        voltage = "33KV";
      }

      // Check if it exists
      let substation = await InjectionSubstation.findOne({ slug });
      
      if (!substation) {
        console.log(`  Creating new substation...`);
        substation = new InjectionSubstation({
          name: substationName,
          slug,
          voltage,
          stateId: kanoState._id,
          status: "active"
        });
        imported++;
      } else {
        console.log(`  Updating existing substation...`);
        substation.voltage = voltage;
        substation.stateId = kanoState._id;
        substation.updatedAt = new Date();
        updated++;
      }

      // Try to geocode if not already geocoded
      if (!substation.latitude || !substation.longitude) {
        console.log(`  Attempting to geocode...`);
        try {
          const query = `${substationName}, Kano, Nigeria`;
          const location = await geocodeWithNominatim(query);
          
          if (location) {
            substation.latitude = location.latitude;
            substation.longitude = location.longitude;
            geocoded++;
            console.log(`  ✅ Geocoded: (${location.latitude}, ${location.longitude})`);
          } else {
            console.log(`  ⚠️ Geocoding failed, setting default Kano coordinates`);
            // Default to Kano city center
            substation.latitude = 12.0022;
            substation.longitude = 8.5919;
          }
        } catch (error) {
          console.log(`  ❌ Error geocoding: ${error.message}`);
          // Use default coordinates
          substation.latitude = 12.0022;
          substation.longitude = 8.5919;
        }

        // Sleep to respect Nominatim's rate limit (1 request per second)
        await sleep(1200);
      }

      await substation.save();
      console.log(`  ✅ Saved successfully`);
    }

    console.log("\n🎉 Import complete!");
    console.log(`  Imported: ${imported}`);
    console.log(`  Updated: ${updated}`);
    console.log(`  Geocoded: ${geocoded}`);
    console.log(`  Total: ${await InjectionSubstation.countDocuments()}`);

    // Disconnect from DB
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

run();
