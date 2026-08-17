const normalizeText = (value) => (typeof value === "string" ? value.trim() : "");

const extractCountries = (records = []) => {
  if (!Array.isArray(records)) return [];

  if (records.every((record) => record && record.name && !record.country && !record.countryName)) {
    return records;
  }

  return records.filter((record) => record && record.name && !record.country && !record.countryName && !(record.state || record.lga || record.ward));
};

const extractStates = (records = []) => {
  if (!Array.isArray(records)) return [];

  if (records.every((record) => record && (record.country || record.countryName || record.countryId))) {
    return records;
  }

  return records.filter((record) => record && (record.country || record.countryName || record.countryId || record.stateId));
};

export const deriveCountryStateSelection = (selection = {}, records = [], providedCountries = []) => {
  const countryName = normalizeText(selection.country);
  const stateName = normalizeText(selection.state);

  const countryList = providedCountries.length > 0 ? providedCountries : extractCountries(records);
  const stateList = providedCountries.length > 0 ? (Array.isArray(records) ? records : []) : extractStates(records);

  const countryRecord = countryList.find((country) => {
    if (!country || !country.name) return false;
    return country.name.toLowerCase() === countryName.toLowerCase() || country.code?.toLowerCase() === countryName.toLowerCase();
  }) || null;

  const stateRecord = stateList.find((state) => {
    if (!state || !state.name) return false;
    const matchesCountry = !countryName || state.countryName === countryName || state.country === countryName || state.country?.name === countryName;
    return matchesCountry && state.name.toLowerCase() === stateName.toLowerCase();
  }) || null;

  return {
    countryName: countryRecord?.name || countryName,
    stateName: stateRecord?.name || stateName,
    selectedCountry: countryRecord,
    selectedState: stateRecord,
    hasCountry: Boolean(countryRecord || countryName),
    hasState: Boolean(stateRecord || stateName)
  };
};

export const validateRegistrationGeography = (selection = {}, records = [], providedCountries = []) => {
  const { countryName, stateName, selectedCountry, selectedState } = deriveCountryStateSelection(selection, records, providedCountries);

  const errors = [];

  if (!countryName) {
    errors.push("Country is required.");
  }

  if (!stateName) {
    errors.push("State is required.");
  }

  const countryList = providedCountries.length > 0 ? providedCountries : extractCountries(records);
  const stateList = providedCountries.length > 0 ? (Array.isArray(records) ? records : []) : extractStates(records);

  const activeCountry = countryList.find((country) => country && country.name && country.name.toLowerCase() === countryName.toLowerCase() && country.isActive !== false);
  if (countryName && !activeCountry) {
    errors.push("Selected country is not active or not configured.");
  }

  const activeState = stateList.find((state) => {
    if (!state || !state.name) return false;
    const matchesCountry = !countryName || state.countryName === countryName || state.country === countryName || state.country?.name === countryName;
    return matchesCountry && state.name.toLowerCase() === stateName.toLowerCase() && state.isActive !== false;
  });

  if (stateName && !activeState) {
    errors.push("Selected state is not active for the chosen country.");
  }

  return {
    valid: errors.length === 0,
    countryName,
    stateName,
    errors,
    selectedCountry: selectedCountry || activeCountry || null,
    selectedState: selectedState || activeState || null
  };
};
