import FeatureFlag from "../models/FeatureFlag.js";
import Audit from "../models/Audit.js";
import {
  invalidateFeatureFlagCache,
  evaluateAllFlagsService,
  evaluateFlagForUser,
  recordFlagAuditLog
} from "../services/featureFlagService.js";
import mongoose from "mongoose";

/**
 * @desc    Get all feature flags with stats (Platform Owner)
 * @route   GET /api/feature-flags
 * @access  Private/PlatformOwner
 */
export const getAllFeatureFlagsController = async (req, res) => {
  try {
    const isPlatformOwner = req.user?.role === "platform-owner";

    if (!isPlatformOwner) {
      // Super Admin: return company-scoped evaluated flags
      const flags = await FeatureFlag.find({ isEnabled: true }).lean();
      const evaluated = {};
      for (const flag of flags) {
        evaluated[flag.key] = evaluateFlagForUser(flag, req.user);
      }
      return res.status(200).json({ success: true, data: { flags: evaluated } });
    }

    const flags = await FeatureFlag.find({})
      .populate("targetCompanies", "name code")
      .populate("createdBy", "fullName email")
      .populate("updatedBy", "fullName email")
      .sort({ updatedAt: -1 })
      .lean();

    const totalFlags = flags.length;
    const activeFlags = flags.filter(f => f.isEnabled).length;
    const productionFlags = flags.filter(f => f.environment === "production").length;
    const emergencyDisabledFlags = flags.filter(f => !f.isEnabled && f.rolloutPercentage > 0).length;

    res.status(200).json({
      success: true,
      data: {
        flags,
        stats: {
          totalFlags,
          activeFlags,
          productionFlags,
          emergencyDisabledFlags
        }
      }
    });
  } catch (error) {
    console.error("[Feature Flag Controller] Get all error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to fetch feature flags" });
  }
};

/**
 * @desc    Create a new feature flag
 * @route   POST /api/feature-flags
 * @access  Private/PlatformOwner
 */
export const createFeatureFlagController = async (req, res) => {
  try {
    const {
      key,
      displayName,
      description,
      isEnabled,
      environment,
      defaultValue,
      rolloutPercentage,
      targetRoles,
      targetCompanies,
      targetStates,
      reason
    } = req.body;

    if (!key || !displayName) {
      return res.status(400).json({ success: false, message: "Flag key and display name are required." });
    }

    const normalizedKey = key.toLowerCase().trim().replace(/[^a-z0-9_]/g, "_");

    const existing = await FeatureFlag.findOne({ key: normalizedKey });
    if (existing) {
      return res.status(400).json({ success: false, message: `Feature flag '${normalizedKey}' already exists.` });
    }

    const flag = await FeatureFlag.create({
      key: normalizedKey,
      displayName,
      description: description || "",
      isEnabled: Boolean(isEnabled),
      environment: environment || "production",
      defaultValue: Boolean(defaultValue),
      rolloutPercentage: Number(rolloutPercentage) || 0,
      targetRoles: Array.isArray(targetRoles) ? targetRoles : [],
      targetCompanies: Array.isArray(targetCompanies) ? targetCompanies : [],
      targetStates: Array.isArray(targetStates) ? targetStates : [],
      createdBy: req.user._id,
      updatedBy: req.user._id,
      lastAuditReason: reason || "Initial flag creation"
    });

    invalidateFeatureFlagCache();

    await recordFlagAuditLog({
      performedUser: req.user,
      actionType: "feature-flag-created",
      actionDescription: "created feature flag",
      flag,
      changes: { after: flag.toObject() },
      reason: reason || "Created feature flag"
    });

    res.status(201).json({ success: true, message: `Feature flag '${flag.key}' created successfully.`, data: flag });
  } catch (error) {
    console.error("[Feature Flag Controller] Create error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to create feature flag" });
  }
};

/**
 * @desc    Update a feature flag
 * @route   PUT /api/feature-flags/:id
 * @access  Private/PlatformOwner
 */
export const updateFeatureFlagController = async (req, res) => {
  try {
    const flag = await FeatureFlag.findById(req.params.id);
    if (!flag) {
      return res.status(404).json({ success: false, message: "Feature flag not found." });
    }

    const beforeState = flag.toObject();

    const {
      displayName,
      description,
      isEnabled,
      environment,
      defaultValue,
      rolloutPercentage,
      targetRoles,
      targetCompanies,
      targetStates,
      reason
    } = req.body;

    if (displayName !== undefined) flag.displayName = displayName;
    if (description !== undefined) flag.description = description;
    if (isEnabled !== undefined) flag.isEnabled = Boolean(isEnabled);
    if (environment !== undefined) flag.environment = environment;
    if (defaultValue !== undefined) flag.defaultValue = Boolean(defaultValue);
    if (rolloutPercentage !== undefined) flag.rolloutPercentage = Number(rolloutPercentage);
    if (targetRoles !== undefined) flag.targetRoles = Array.isArray(targetRoles) ? targetRoles : [];
    if (targetCompanies !== undefined) flag.targetCompanies = Array.isArray(targetCompanies) ? targetCompanies : [];
    if (targetStates !== undefined) flag.targetStates = Array.isArray(targetStates) ? targetStates : [];

    flag.updatedBy = req.user._id;
    if (reason) flag.lastAuditReason = reason;

    await flag.save();
    invalidateFeatureFlagCache();

    await recordFlagAuditLog({
      performedUser: req.user,
      actionType: "feature-flag-updated",
      actionDescription: `updated flag configuration (rollout: ${flag.rolloutPercentage}%)`,
      flag,
      changes: { before: beforeState, after: flag.toObject() },
      reason: reason || "Updated feature flag configuration"
    });

    res.status(200).json({ success: true, message: `Feature flag '${flag.key}' updated successfully.`, data: flag });
  } catch (error) {
    console.error("[Feature Flag Controller] Update error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to update feature flag" });
  }
};

/**
 * @desc    Toggle feature flag enabled status (Emergency Rollback)
 * @route   PATCH /api/feature-flags/:id/toggle
 * @access  Private/PlatformOwner
 */
export const toggleFeatureFlagController = async (req, res) => {
  try {
    const flag = await FeatureFlag.findById(req.params.id);
    if (!flag) {
      return res.status(404).json({ success: false, message: "Feature flag not found." });
    }

    const beforeState = flag.toObject();
    flag.isEnabled = !flag.isEnabled;
    flag.updatedBy = req.user._id;
    flag.lastAuditReason = req.body.reason || (flag.isEnabled ? "Flag enabled" : "Emergency rollback disabled flag");

    await flag.save();
    invalidateFeatureFlagCache();

    await recordFlagAuditLog({
      performedUser: req.user,
      actionType: flag.isEnabled ? "feature-flag-enabled" : "feature-flag-disabled",
      actionDescription: flag.isEnabled ? "enabled flag" : "EMERGENCY ROLLBACK disabled flag",
      flag,
      changes: { before: beforeState, after: flag.toObject() },
      reason: flag.lastAuditReason
    });

    res.status(200).json({
      success: true,
      message: `Feature flag '${flag.key}' is now ${flag.isEnabled ? "ENABLED" : "DISABLED"}.`,
      data: flag
    });
  } catch (error) {
    console.error("[Feature Flag Controller] Toggle error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to toggle feature flag" });
  }
};

/**
 * @desc    Delete a feature flag
 * @route   DELETE /api/feature-flags/:id
 * @access  Private/PlatformOwner
 */
export const deleteFeatureFlagController = async (req, res) => {
  try {
    const flag = await FeatureFlag.findById(req.params.id);
    if (!flag) {
      return res.status(404).json({ success: false, message: "Feature flag not found." });
    }

    const beforeState = flag.toObject();
    await FeatureFlag.findByIdAndDelete(req.params.id);
    invalidateFeatureFlagCache();

    await recordFlagAuditLog({
      performedUser: req.user,
      actionType: "feature-flag-deleted",
      actionDescription: "deleted feature flag",
      flag: beforeState,
      changes: { before: beforeState, after: {} },
      reason: req.body?.reason || "Flag deleted"
    });

    res.status(200).json({ success: true, message: `Feature flag '${beforeState.key}' deleted.` });
  } catch (error) {
    console.error("[Feature Flag Controller] Delete error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to delete feature flag" });
  }
};

/**
 * @desc    Evaluate all active flags for current user context
 * @route   GET /api/feature-flags/evaluate
 * @access  Private
 */
export const evaluateFeatureFlagsController = async (req, res) => {
  try {
    const flags = await evaluateAllFlagsService(req.user);
    res.status(200).json({ success: true, data: { flags } });
  } catch (error) {
    console.error("[Feature Flag Controller] Evaluate error:", error);
    res.status(200).json({ success: true, data: { flags: {} } });
  }
};

/**
 * @desc    Get Audit History for Feature Flags
 * @route   GET /api/feature-flags/audit-history
 * @access  Private/PlatformOwner
 */
export const getFeatureFlagAuditHistoryController = async (req, res) => {
  try {
    const audits = await Audit.find({ action: { $regex: /flag|rollout/i } })
      .populate("performedBy", "fullName email role")
      .sort({ timestamp: -1 })
      .limit(50)
      .lean();

    res.status(200).json({ success: true, data: audits });
  } catch (error) {
    console.error("[Feature Flag Controller] Audit history error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to fetch audit history" });
  }
};
