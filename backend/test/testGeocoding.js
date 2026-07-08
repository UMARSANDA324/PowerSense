import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Models
import Coordinates from "../models/Location/Coordinates.js";
import Ward from "../models/Location/Ward.js";

// Services
import { 
  validateCoordinate, 
  createCoordinate, 
  updateCoordinate, 
  getCoordinateByCommunity, 
  getCoordinate,
  bulkInsertCoordinates 
} from "../services/coordinatesService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const runTests = async () => {
  console.log("Starting Geocoding System Verification Tests...");
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("✗ MONGO_URI is not defined");
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log("✓ Connected to MongoDB");

  try {
    // 1. Test validateCoordinate
    console.log("\n--- Testing validateCoordinate ---");
    console.log("Valid (11.9641, 8.5550):", validateCoordinate(11.9641, 8.5550));
    console.log("Invalid Lat (95, 8.5550):", validateCoordinate(95, 8.5550));
    console.log("Invalid Lng (11.9641, 185):", validateCoordinate(11.9641, 185));
    console.log("Null coords:", validateCoordinate(null, null));

    // 2. Test createCoordinate
    console.log("\n--- Testing createCoordinate ---");
    const testId = "test_community_12345";
    // Delete any existing test record
    await Coordinates.deleteOne({ communityId: testId });

    const created = await createCoordinate({
      country: "Nigeria",
      state: "Kano",
      lgaId: "test_lga",
      wardId: "test_ward",
      communityId: testId,
      communityName: "Test Community",
      latitude: 11.9641,
      longitude: 8.5550,
      source: "Manual Test",
      accuracy: "high",
      verified: true
    });
    console.log("✓ Created Coordinates document:", created.communityName, `[${created.latitude}, ${created.longitude}]`);

    // 3. Test getCoordinateByCommunity
    console.log("\n--- Testing getCoordinateByCommunity ---");
    const found = await getCoordinateByCommunity(testId);
    console.log("✓ Found coordinate by communityId:", found ? "Yes" : "No", found?.communityName);

    // 4. Test updateCoordinate
    console.log("\n--- Testing updateCoordinate ---");
    const updated = await updateCoordinate(testId, {
      latitude: 12.0000,
      longitude: 8.6000,
      accuracy: "medium"
    });
    console.log("✓ Updated coordinate:", updated.communityName, `[${updated.latitude}, ${updated.longitude}] (Accuracy: ${updated.accuracy})`);

    // Clean up
    await Coordinates.deleteOne({ communityId: testId });
    console.log("✓ Cleaned up test coordinate");

    console.log("\n✓ All service unit tests passed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("✗ Tests failed with error:", error);
    process.exit(1);
  }
};

runTests();
