import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import axios from "axios";

// Models
import Ward from "../models/Location/Ward.js";
import State from "../models/Location/State.js";
import LGA from "../models/Location/LGA.js";
import Coordinates from "../models/Location/Coordinates.js";

// Services
import { updateCoordinate, validateCoordinate } from "../services/coordinatesService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const API_KEY = process.env.GEOAPIFY_API_KEY || "4cef79973dc34d4b98967b7e7bf70578";
const GEOAPIFY_URL = "https://api.geoapify.com/v1/geocode/search";

// Helper for waiting
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Perform a geocoding request to Geoapify with retries & exponential backoff.
 * @param {string} text - Search query
 * @param {number} attempt - Current retry attempt
 * @returns {Promise<Object|null>} - Geocoding result with { latitude, longitude, accuracy } or null if ZERO_RESULTS
 */
const geocodeRequest = async (text, attempt = 1) => {
  const maxRetries = 5;
  const baseDelay = 1000; // 1 second base delay

  try {
    // Basic rate limit protection between queries: 350ms delay
    await sleep(350);

    const response = await axios.get(GEOAPIFY_URL, {
      params: {
        text,
        format: "json",
        apiKey: API_KEY
      },
      timeout: 10000
    });

    const data = response.data;
    if (!data || !data.results || data.results.length === 0) {
      return null;
    }

    const firstResult = data.results[0];
    const lat = firstResult.lat;
    const lon = firstResult.lon;

    if (!validateCoordinate(lat, lon)) {
      console.warn(`[VALIDATION WARNING] Invalid coordinates returned for "${text}": lat=${lat}, lon=${lon}`);
      return null;
    }

    // Determine accuracy based on rank confidence or rank match type
    let accuracy = "low";
    if (firstResult.rank) {
      if (firstResult.rank.confidence > 0.8) {
        accuracy = "high";
      } else if (firstResult.rank.confidence > 0.5) {
        accuracy = "medium";
      }
    }

    return {
      latitude: lat,
      longitude: lon,
      accuracy
    };

  } catch (error) {
    const status = error.response ? error.response.status : null;
    console.error(`Error geocoding query "${text}" (Attempt ${attempt}/${maxRetries}): Code ${status || 'Network/Timeout'}. ${error.message}`);

    if ((status === 429 || (status >= 500 && status < 600)) && attempt < maxRetries) {
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`[RATE LIMIT/SERVER ERROR] Retrying in ${delay}ms...`);
      await sleep(delay);
      return await geocodeRequest(text, attempt + 1);
    }

    // For other errors or max retries exceeded, return null
    return null;
  }
};

/**
 * Main geocoding runner
 */
const run = async () => {
  const startTime = Date.now();
  console.log("Starting geocoding process...");

  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MongoDB URI is not defined in environment variables");
    }

    await mongoose.connect(mongoUri);
    console.log("✓ Connected to MongoDB");

    // Fetch Kano state
    const stateDoc = await State.findOne({ name: "Kano" });
    if (!stateDoc) {
      throw new Error("Kano State not found in database. Seed or import locations first.");
    }

    // Fetch all communities (represented by Ward documents) in Kano State
    const communities = await Ward.find({ state: stateDoc._id, isActive: { $ne: false } }).populate("lga");
    const totalCommunities = communities.length;
    console.log(`Total active Kano communities found: ${totalCommunities}`);

    // Create reports directory if it doesn't exist
    const reportsDir = path.join(__dirname, "../reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Load existing coordinates to check what can be skipped
    const existingCoords = await Coordinates.find({}, "communityId");
    const geocodedCommunityIds = new Set(existingCoords.map(c => c.communityId));

    console.log(`Skipped: ${geocodedCommunityIds.size} communities already geocoded.`);

    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    const failedList = [];

    for (let i = 0; i < communities.length; i++) {
      const comm = communities[i];
      const communityId = comm.id;
      const communityName = comm.name;
      const wardName = comm.wardName || "";
      const lgaName = comm.lgaName || (comm.lga ? comm.lga.name : "");

      // Check if already geocoded
      if (geocodedCommunityIds.has(communityId)) {
        skippedCount++;
        continue;
      }

      console.log(`\n[${i + 1}/${totalCommunities}] Geocoding community: "${communityName}" (LGA: ${lgaName})`);

      // Query Builder
      // Example target format: "Shekar Barde, Kumbotso Ward, Kumbotso LGA, Kano State, Nigeria"
      const queries = [
        // Initial query: Community, Ward, LGA, Kano State, Nigeria
        `${communityName}, ${wardName ? wardName + ' Ward, ' : ''}${lgaName ? lgaName + ' LGA, ' : ''}Kano State, Nigeria`.replace(/\s+,/g, ","),
        
        // Attempt 1: Community + Ward + LGA
        `${communityName}, ${wardName ? wardName + ' Ward, ' : ''}${lgaName ? lgaName + ' LGA, ' : ''}Nigeria`.replace(/\s+,/g, ","),
        
        // Attempt 2: Ward + LGA
        `${wardName ? wardName + ' Ward, ' : ''}${lgaName ? lgaName + ' LGA, ' : ''}Nigeria`.replace(/\s+,/g, ","),
        
        // Attempt 3: Community + Kano State
        `${communityName}, Kano State, Nigeria`.replace(/\s+,/g, ","),
        
        // Attempt 4: LGA + Kano State
        `${lgaName ? lgaName + ' LGA, ' : ''}Kano State, Nigeria`.replace(/\s+,/g, ",")
      ];

      let coordinateResult = null;
      let finalQueryUsed = "";

      for (let attemptIdx = 0; attemptIdx < queries.length; attemptIdx++) {
        const queryText = queries[attemptIdx];
        if (attemptIdx > 0) {
          console.log(`  -> Fallback Attempt ${attemptIdx}: "${queryText}"`);
        } else {
          console.log(`  Query: "${queryText}"`);
        }

        const res = await geocodeRequest(queryText);
        if (res) {
          coordinateResult = res;
          finalQueryUsed = queryText;
          break;
        }
      }

      if (coordinateResult) {
        console.log(`  ✓ Success: Found coordinates [${coordinateResult.latitude}, ${coordinateResult.longitude}] using query: "${finalQueryUsed}"`);
        
        // Save to Coordinates collection using service
        await updateCoordinate(communityId, {
          country: comm.country || "Nigeria",
          state: "Kano",
          lgaId: comm.lgaId,
          wardId: comm.areaId || comm.id,
          communityId: communityId,
          communityName: communityName,
          latitude: coordinateResult.latitude,
          longitude: coordinateResult.longitude,
          source: "Geoapify Geocoding API",
          accuracy: coordinateResult.accuracy,
          verified: true
        });

        // Link back to community/ward document (keep coordinates properties in sync for backward compatibility)
        comm.latitude = coordinateResult.latitude;
        comm.longitude = coordinateResult.longitude;
        comm.coordinates = {
          latitude: coordinateResult.latitude,
          longitude: coordinateResult.longitude
        };
        await comm.save();

        successCount++;
      } else {
        console.warn(`  ✗ Failed: No coordinates found for "${communityName}" after all fallbacks.`);
        failedCount++;
        failedList.push({
          communityId,
          communityName,
          wardName,
          lgaName
        });
      }
    }

    const executionTimeMs = Date.now() - startTime;
    const executionTimeSec = (executionTimeMs / 1000).toFixed(2);
    
    // Remaining count
    const remainingCount = totalCommunities - (successCount + skippedCount + failedCount);

    const report = {
      totalCommunities,
      success: successCount,
      skipped: skippedCount,
      failed: failedCount,
      remaining: remainingCount,
      executionTime: `${executionTimeSec}s`,
      failedCommunities: failedList
    };

    fs.writeFileSync(
      path.join(reportsDir, "geocode-report.json"),
      JSON.stringify(report, null, 2)
    );
    console.log(`\n✓ Geocoding report generated at backend/reports/geocode-report.json`);

    // ==========================================
    // VALIDATION REPORT GENERATION
    // ==========================================
    console.log("\nGenerating validation report...");
    const missingCoordsCommunities = await Ward.find({
      state: stateDoc._id,
      isActive: { $ne: false },
      $or: [
        { latitude: null },
        { longitude: null },
        { coordinates: null }
      ]
    }).populate("lga");

    // Also check the Coordinates collection to verify everything
    const coordinatesCount = await Coordinates.countDocuments({ state: "Kano" });

    const validationReport = {
      timestamp: new Date().toISOString(),
      validationPassed: missingCoordsCommunities.length === 0,
      totalCommunities,
      communitiesWithCoordinatesInCollection: coordinatesCount,
      communitiesMissingCoordinatesInWardDocument: missingCoordsCommunities.length,
      missingCommunitiesDetails: missingCoordsCommunities.map(c => ({
        id: c.id,
        name: c.name,
        lgaName: c.lgaName || (c.lga ? c.lga.name : "")
      }))
    };

    fs.writeFileSync(
      path.join(reportsDir, "geocode-validation-report.json"),
      JSON.stringify(validationReport, null, 2)
    );
    console.log(`✓ Validation report generated at backend/reports/geocode-validation-report.json`);

    console.log("Process complete.");
    process.exit(0);
  } catch (error) {
    console.error("✗ Fatal error running geocoding script:", error);
    process.exit(1);
  }
};

run();
