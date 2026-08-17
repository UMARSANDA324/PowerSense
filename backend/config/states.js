/**
 * states.js
 * Single source of truth for Nigerian States in the backend configuration.
 */

export const NIGERIAN_STATES = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "FCT",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara"
];

/**
 * Validates whether a state name is a valid Nigerian state
 * @param {string} stateName - State name to check
 * @returns {boolean}
 */
export const isValidNigerianState = (stateName) => {
  if (!stateName || typeof stateName !== "string") return false;
  return NIGERIAN_STATES.includes(stateName.trim());
};
