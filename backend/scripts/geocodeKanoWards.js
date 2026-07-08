import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import Ward from "../models/Location/Ward.js";
import Feeder from "../models/Location/Feeder.js";
import State from "../models/Location/State.js";
import { geocodeWithNominatim, isValidCoordinate, sleep } from "../services/geocodingService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

const buildSearchQueries = (ward) => {
  const queries = new Set();
  const baseNames = [ward.name, ward.wardName, ...(Array.isArray(ward.aliases) ? ward.aliases : [])]
    .filter(Boolean)
    .map((value) => String(value).trim())
    .filter(Boolean);

  for (const name of baseNames) {
    queries.add(`${name}, ${ward.lgaName || ward.lga?.name || ""}, Kano, Nigeria`.replace(/\s+,/g, ","));
    queries.add(`${name}, Kano, Nigeria`);
    queries.add(`${name}, Nigeria`);
  }

  return [...queries].filter(Boolean);
};

const run = async () => {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("MONGO_URI (or MONGODB_URI) is not defined in .env");
    }

    await mongoose.connect(uri);
    console.log("✓ Connected to MongoDB");

    const kanoState = await State.findOne({ name: "Kano" });
    if (!kanoState) {
      throw new Error("State 'Kano' was not found in the database.");
    }

    const wards = await Ward.find({ state: kanoState._id, isActive: { $ne: false } }).populate("lga");
    if (!wards.length) {
      console.log("No Kano wards were found to geocode.");
      process.exit(0);
    }

    const wardsNeedingGeocode = wards.filter((ward) => {
      return !isValidCoordinate(ward.latitude, ward.longitude) && !isValidCoordinate(ward.coordinates?.latitude, ward.coordinates?.longitude);
    });

    console.log(`Found ${wards.length} active Kano wards; ${wardsNeedingGeocode.length} need geocoding.`);

    const failedWards = [];
    let updatedCount = 0;

    for (const ward of wardsNeedingGeocode) {
      const searchQueries = buildSearchQueries(ward);
      let geocoded = null;

      for (const query of searchQueries) {
        try {
          console.log(`Searching OSM for ward: ${ward.name} (${ward.lgaName || ward.lga?.name || "Unknown LGA"})`);
          geocoded = await geocodeWithNominatim(query);
          if (geocoded) {
            console.log(`  ✓ Found coordinates: ${geocoded.latitude.toFixed(6)}, ${geocoded.longitude.toFixed(6)} (query: ${query})`);
            break;
          }
        } catch (error) {
          console.warn(`  ! Nominatim request failed for query '${query}': ${error.message}`);
        }

        await sleep(1200);
      }

      if (!geocoded) {
        console.warn(`  ✗ Could not resolve ward: ${ward.name} (${ward.lgaName || ward.lga?.name || "Unknown LGA"})`);
        failedWards.push(`${ward.name} (${ward.lgaName || ward.lga?.name || "Unknown LGA"})`);
        continue;
      }

      ward.latitude = geocoded.latitude;
      ward.longitude = geocoded.longitude;
      ward.coordinates = {
        latitude: geocoded.latitude,
        longitude: geocoded.longitude
      };
      await ward.save();
      updatedCount += 1;
      await sleep(1200);
    }

    console.log(`\nGeocoding complete. Updated ${updatedCount} wards.`);
    if (failedWards.length) {
      console.log(`Failed to geocode ${failedWards.length} wards:`);
      failedWards.forEach((name) => console.log(`  - ${name}`));
    }

    const feeders = await Feeder.find({ isActive: { $ne: false } }).populate({
      path: "wards",
      match: { state: kanoState._id },
      select: "latitude longitude coordinates",
    });

    let feederUpdatedCount = 0;
    for (const feeder of feeders) {
      const validWardCoords = feeder.wards
        .map((ward) => {
          const lat = ward.latitude || ward.coordinates?.latitude;
          const lon = ward.longitude || ward.coordinates?.longitude;
          return isValidCoordinate(lat, lon) ? { latitude: lat, longitude: lon } : null;
        })
        .filter(Boolean);

      if (!validWardCoords.length) {
        continue;
      }

      const averageLatitude = validWardCoords.reduce((sum, coord) => sum + coord.latitude, 0) / validWardCoords.length;
      const averageLongitude = validWardCoords.reduce((sum, coord) => sum + coord.longitude, 0) / validWardCoords.length;

      if (!isValidCoordinate(feeder.latitude, feeder.longitude)) {
        feeder.latitude = averageLatitude;
        feeder.longitude = averageLongitude;
        await feeder.save();
        feederUpdatedCount += 1;
      }
    }

    console.log(`Updated ${feederUpdatedCount} feeder records from ward centroid coordinates.`);
    console.log("Done.");
    process.exit(0);
  } catch (error) {
    console.error("✗ Geocoding script failed:", error.message);
    process.exit(1);
  }
};

run();
