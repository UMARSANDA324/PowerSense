export const INVALID_KEY_PATTERNS = [
  "YOUR_API_KEY",
  "YOUR_KEY",
  "PLACEHOLDER",
  "REPLACE_ME",
  "NO_KEY",
  "EMPTY_KEY"
];

export const isValidGeminiKey = (key) => {
  const value = String(key || "").trim();
  if (!value) return false;
  if (value.length < 20) return false;

  const normalized = value.toUpperCase();
  return !INVALID_KEY_PATTERNS.some((pattern) => normalized.includes(pattern));
};

export const formatGeminiKeyDebug = (key) => {
  const value = String(key || "").trim();
  return {
    present: Boolean(value),
    preview: value ? `${value.slice(0, 8)}...` : "<missing>",
    length: value.length
  };
};
