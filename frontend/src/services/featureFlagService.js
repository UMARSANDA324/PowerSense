import api from "./api";

let evaluatedFlagsCache = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 60000; // 1 min client cache

/**
 * Evaluates feature flags for the current user session.
 */
export const evaluateFeatureFlags = async (forceRefresh = false) => {
  const now = Date.now();
  if (!forceRefresh && evaluatedFlagsCache && (now - lastFetchTime < CACHE_TTL_MS)) {
    return evaluatedFlagsCache;
  }

  try {
    const res = await api.get("/feature-flags/evaluate");
    const flags = res.data?.data?.flags || {};
    evaluatedFlagsCache = flags;
    lastFetchTime = now;
    return flags;
  } catch (err) {
    console.warn("[Feature Flag Client] Evaluation fetch failed, using fallback:", err?.message);
    return evaluatedFlagsCache || {};
  }
};

/**
 * Checks if a specific feature flag is enabled for current session context.
 */
export const isFlagActive = async (flagKey, defaultValue = false) => {
  const flags = await evaluateFeatureFlags();
  if (flagKey in flags) {
    return flags[flagKey];
  }
  return defaultValue;
};

/**
 * Management API calls (Platform Owner)
 */
export const fetchAllFlags = async () => {
  const res = await api.get("/feature-flags");
  return res.data?.data || { flags: [], stats: {} };
};

export const createFlag = async (flagData) => {
  const res = await api.post("/feature-flags", flagData);
  evaluatedFlagsCache = null;
  return res.data;
};

export const updateFlag = async (id, flagData) => {
  const res = await api.put(`/feature-flags/${id}`, flagData);
  evaluatedFlagsCache = null;
  return res.data;
};

export const toggleFlag = async (id, reason = "") => {
  const res = await api.patch(`/feature-flags/${id}/toggle`, { reason });
  evaluatedFlagsCache = null;
  return res.data;
};

export const deleteFlag = async (id, reason = "") => {
  const res = await api.delete(`/feature-flags/${id}`, { data: { reason } });
  evaluatedFlagsCache = null;
  return res.data;
};

export const fetchFlagAuditHistory = async () => {
  const res = await api.get("/feature-flags/audit-history");
  return res.data?.data || [];
};
