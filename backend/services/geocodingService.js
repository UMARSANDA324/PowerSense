const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org/search";
const DEFAULT_USER_AGENT = "LithaGeocoder/1.0 (admin@litha.local)";

export const isValidCoordinate = (latitude, longitude) => {
  if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
    return false;
  }

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  return !Number.isNaN(lat) && !Number.isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
};

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const geocodeWithNominatim = async (query) => {
  if (!query || !String(query).trim()) {
    return null;
  }

  const url = new URL(NOMINATIM_BASE_URL);
  url.searchParams.set("format", "json");
  url.searchParams.set("q", query.trim());
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("countrycodes", "ng");

  const userAgent = process.env.OSM_USER_AGENT || DEFAULT_USER_AGENT;
  const referer = process.env.OSM_REFERER || "https://litha.local";

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "User-Agent": userAgent,
      "Accept-Language": "en",
      "Referer": referer
    }
  });

  if (!response.ok) {
    throw new Error(`Nominatim request failed: ${response.status} ${response.statusText}`);
  }

  const results = await response.json();
  if (!Array.isArray(results) || results.length === 0) {
    return null;
  }

  const location = results[0];
  const latitude = parseFloat(location.lat);
  const longitude = parseFloat(location.lon);

  if (!isValidCoordinate(latitude, longitude)) {
    return null;
  }

  return {
    latitude,
    longitude,
    raw: location
  };
};
