import assert from "node:assert/strict";
import {
  validateRegistrationGeography,
  deriveCountryStateSelection,
} from "../utils/geographyValidation.js";

const tests = () => {
  const validSelection = deriveCountryStateSelection({
    country: "Nigeria",
    state: "Kano",
  }, [
    { _id: "c1", name: "Nigeria", isActive: true },
    { _id: "s1", name: "Kano", country: "c1", isActive: true },
  ]);

  assert.equal(validSelection.countryName, "Nigeria");
  assert.equal(validSelection.stateName, "Kano");

  const failed = validateRegistrationGeography({
    country: "Nigeria",
    state: "Kano",
  }, [
    { _id: "c1", name: "Nigeria", isActive: true },
    { _id: "s1", name: "Kano", country: "c1", isActive: false },
  ]);

  assert.equal(failed.valid, false);
  assert.equal(failed.errors[0], "Selected state is not active for the chosen country.");

  const noKanoFallback = deriveCountryStateSelection({
    country: "Nigeria",
    state: "",
  }, [
    { _id: "c1", name: "Nigeria", isActive: true },
    { _id: "s1", name: "Jigawa", country: "c1", isActive: true },
  ]);

  assert.equal(noKanoFallback.stateName, "");
  assert.equal(noKanoFallback.countryName, "Nigeria");

  console.log("globalGeography validation checks passed");
};

try {
  tests();
} catch (error) {
  console.error("globalGeography validation checks failed");
  console.error(error);
  process.exit(1);
}
