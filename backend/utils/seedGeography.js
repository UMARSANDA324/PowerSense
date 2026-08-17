import Country from "../models/Location/Country.js";
import State from "../models/Location/State.js";
import { NIGERIAN_STATES } from "../config/states.js";

export const seedDefaultGeography = async () => {
  try {
    const countryCount = await Country.countDocuments();
    if (countryCount === 0) {
      console.log("[Seed Geography] No countries found. Skipping default geography seeding.");
      return { country: null, created: false };
    }
    console.log(`[Seed Geography] Database has ${countryCount} country/countries. Skipping seeder.`);
    return { country: null, created: false };
  } catch (error) {
    console.error("[Seed Geography] Error checking geography:", error.message);
    return { country: null, created: false };
  }
};
