import crypto from "crypto";
import FeatureFlag from "../models/FeatureFlag.js";
import Audit from "../models/Audit.js";
import { trackAnalyticsEvent } from "./analyticsTrackingService.js";
import mongoose from "mongoose";

// In-memory cache for performant flag evaluation
let flagCache = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 30000; // 30s TTL

/**
 * Invalidates the in-memory feature flag cache upon configuration updates.
 */
export const invalidateFeatureFlagCache = () => {
  flagCache = null;
  lastCacheTime = 0;
};

/**
 * Deterministic cohort hashing algorithm.
 * Converts flagKey + identifier into a consistent bucket integer (0..99).
 */
export const hashUserToBucket = (flagKey, identifier) => {
  if (!identifier) return 99;
  const hash = crypto.createHash("sha256").update(`${flagKey}:${identifier.toString()}`).digest("hex");
  const subHash = hash.substring(0, 8);
  const intVal = parseInt(subHash, 16);
  return intVal % 100;
};

/**
 * Evaluates a single feature flag deterministically against user context.
 *
 * Evaluation Precedence:
 * 1. Global isEnabled check (If false -> return false)
 * 2. Environment check
 * 3. Target Companies check
 * 4. Target States check
 * 5. Target Roles check
 * 6. Percentage Rollout check (Bucket < rolloutPercentage)
 * 7. Default Fallback Value
 */
export const evaluateFlagForUser = (flag, userContext = {}) => {
  if (!flag) return false;

  // 1. Is Flag Enabled globally?
  if (!flag.isEnabled) {
    return false;
  }

  // 2. Environment Match
  const currentEnv = process.env.NODE_ENV === "development" ? "development" : (process.env.FLAG_ENV || "production");
  if (flag.environment && flag.environment !== currentEnv && currentEnv === "production" && flag.environment !== "production") {
    return flag.defaultValue || false;
  }

  // 3. Target Companies Filtering
  if (Array.isArray(flag.targetCompanies) && flag.targetCompanies.length > 0) {
    if (!userContext.companyId) return false;
    const userCompanyStr = userContext.companyId.toString();
    const isCompanyMatched = flag.targetCompanies.some(c => (c._id || c).toString() === userCompanyStr);
    if (!isCompanyMatched) return false;
  }

  // 4. Target States Filtering
  if (Array.isArray(flag.targetStates) && flag.targetStates.length > 0) {
    if (!userContext.state) return false;
    const isStateMatched = flag.targetStates.some(s => s.toLowerCase() === userContext.state.toLowerCase());
    if (!isStateMatched) return false;
  }

  // 5. Target Roles Filtering
  if (Array.isArray(flag.targetRoles) && flag.targetRoles.length > 0) {
    if (!userContext.role) return false;
    const isRoleMatched = flag.targetRoles.includes(userContext.role);
    if (!isRoleMatched) return false;
  }

  // 6. Rollout Percentage Check
  const rolloutPct = Number(flag.rolloutPercentage) || 0;
  if (rolloutPct >= 100) return true;
  if (rolloutPct <= 0) return false;

  const identifier = userContext._id || userContext.userId || userContext.sessionId || "anonymous";
  const bucket = hashUserToBucket(flag.key, identifier);

  return bucket < rolloutPct;
};

/**
 * Loads all feature flags from DB with cache fallback.
 */
const getAllFlagsCached = async () => {
  const now = Date.now();
  if (flagCache && (now - lastCacheTime < CACHE_TTL_MS)) {
    return flagCache;
  }

  try {
    const flags = await FeatureFlag.find({}).populate("targetCompanies", "name code").lean();
    flagCache = flags;
    lastCacheTime = now;
    return flags;
  } catch (err) {
    console.error("[Feature Flag Service] DB read error:", err.message);
    return flagCache || [];
  }
};

/**
 * Evaluates all active feature flags for a given user context.
 */
export const evaluateAllFlagsService = async (userContext = {}) => {
  try {
    const flags = await getAllFlagsCached();
    const evaluated = {};

    for (const flag of flags) {
      evaluated[flag.key] = evaluateFlagForUser(flag, userContext);
    }

    return evaluated;
  } catch (err) {
    console.error("[Feature Flag Service] Evaluate all error:", err.message);
    return {};
  }
};

/**
 * Public developer interface for backend feature flag evaluation.
 * Usage: const enabled = await isFeatureEnabled("ai_outage_prediction", req.user);
 */
export const isFeatureEnabled = async (featureKey, userContext = {}, fallbackDefault = false) => {
  try {
    if (!featureKey) return fallbackDefault;
    const flags = await getAllFlagsCached();
    const flag = flags.find(f => f.key === featureKey.toLowerCase());
    if (!flag) return fallbackDefault;

    const result = evaluateFlagForUser(flag, userContext);

    // Record exposure event asynchronously (fail-soft)
    if (result && userContext._id) {
      trackAnalyticsEvent({
        eventName: "feature_exposed",
        feature: "rollout",
        userId: userContext._id,
        companyId: userContext.companyId,
        role: userContext.role,
        state: userContext.state,
        metadata: { featureKey, rolloutPercentage: flag.rolloutPercentage }
      });
    }

    return result;
  } catch (err) {
    console.error(`[Feature Flag Service] Error evaluating flag '${featureKey}':`, err.message);
    return fallbackDefault;
  }
};

/**
 * Helper to record audit log entries for flag changes.
 */
export const recordFlagAuditLog = async ({ performedUser, actionType, actionDescription, flag, changes = {}, reason = "" }) => {
  try {
    const auditData = {
      auditId: `AUD-FLAG-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`.toUpperCase(),
      actionType: "custom",
      companyId: performedUser?.companyId || flag?.createdBy || new mongoose.Types.ObjectId(),
      performedBy: performedUser?._id,
      userRole: performedUser?.role || "platform-owner",
      action: actionDescription,
      description: `Feature flag '${flag?.key}' ${actionDescription}`,
      resourceType: "custom",
      resourceId: flag?._id || new mongoose.Types.ObjectId(),
      resourceName: flag?.key,
      result: "success",
      reason: reason || flag?.lastAuditReason || "Configuration change",
      changes: {
        before: changes.before || {},
        after: changes.after || {}
      },
      timestamp: new Date()
    };

    await Audit.create(auditData);
  } catch (err) {
    console.error("[Feature Flag Service] Non-blocking audit log error:", err.message);
  }
};
