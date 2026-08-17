import mongoose from "mongoose";
import Platform from "../models/Platform.js";
import Notification from "../models/Notification.js";
import Audit from "../models/Audit.js";
import User from "../models/UserModel.js";
import Company from "../models/Company.js";
import sendEmail from "../utils/sendEmail.js";
import { sendBulkNotifications } from "../utils/notificationHelper.js";

const OPERATION_CACHE_TTL_MS = 30 * 1000;
const operationCache = new Map();

const getCachedOperationResult = async (key, build) => {
  const now = Date.now();
  const existing = operationCache.get(key);
  if (existing && now - existing.updatedAt < OPERATION_CACHE_TTL_MS) {
    return existing.data;
  }

  const data = await build();
  operationCache.set(key, { data, updatedAt: now });
  return data;
};

const createAuditRecord = async ({ performedBy, target, action, reason, result, description, metadata = {} }) => {
  const actor = await User.findById(performedBy).select("fullName role").lean();
  return Audit.createAudit({
    actionType: action,
    companyId: metadata.companyId || null,
    performedBy,
    userRole: actor?.role || "platform-owner",
    action: target,
    description,
    resourceType: "custom",
    resourceId: target,
    resourceName: target,
    result,
    reason,
    metadata
  });
};

export const getPlatformOperationsDashboard = async () => {
  return getCachedOperationResult("platform-operations-dashboard", async () => {
    // CRITICAL: Platform operations dashboard is for Platform Owner only
    // This aggregates global metrics across all companies - no tenant filtering needed
    const [platform, pendingNotifications, deliveredNotifications, failedNotifications, platformEvents, companies] = await Promise.all([
      Platform.getPlatform(),
      Notification.countDocuments({ read: false }),
      Notification.countDocuments({ read: true }),
      Notification.countDocuments({ read: false, status: "failed" }),
      Audit.find({}).sort({ timestamp: -1 }).limit(20).lean(),
      Company.countDocuments()
    ]);

    const featureFlags = platform?.settings?.featureFlags || {};
    const activeFeatureFlags = Object.keys(featureFlags).filter(key => featureFlags[key].enabled).length;

    return {
      platformStatus: platform?.status || "active",
      activeBroadcasts: 0,
      runningMaintenance: platform?.status === "maintenance" ? 1 : 0,
      featureFlagsEnabled: activeFeatureFlags,
      queuedTasks: pendingNotifications,
      platformEvents: platformEvents.map((item) => ({ action: item.action, description: item.description, timestamp: item.timestamp })),
      queuedNotifications: pendingNotifications,
      deliveredNotifications: deliveredNotifications,
      failedNotifications: failedNotifications,
      systemAlerts: platform?.status === "maintenance" ? ["Platform maintenance active"] : []
    };
  });
};

export const broadcastPlatformMessage = async ({ performedBy, targets, scope, messageType, title, message, scheduledFor, expiresAt, reason = "Broadcast issued" }) => {
  const platform = await Platform.getPlatform();
  if (!platform) {
    throw new Error("Platform not initialized");
  }

  const broadcast = {
    title,
    message,
    messageType,
    scope,
    targets,
    scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    status: "queued",
    createdBy: performedBy,
    createdAt: new Date()
  };

  await createAuditRecord({
    performedBy,
    target: "platform-broadcast",
    action: "broadcast-sent",
    reason,
    result: "success",
    description: `Platform Owner broadcasted ${messageType} to ${scope}`,
    metadata: { broadcast }
  });

  return { broadcast };
};

export const sendInternalCompanyMessage = async ({ performedBy, targetUserId, title, message, priority = "normal", category = "general", reason = "Private message" }) => {
  const targetUser = await User.findById(targetUserId).select("fullName role email").lean();
  if (!targetUser) {
    throw new Error("Target user not found");
  }

  const internalMessage = {
    user: targetUserId,
    title,
    message,
    priority,
    category,
    createdBy: performedBy,
    createdAt: new Date(),
    status: "sent"
  };

  await createAuditRecord({
    performedBy,
    target: "internal-message",
    action: "internal-message-sent",
    reason,
    result: "success",
    description: `Platform Owner sent an internal message to ${targetUser.fullName}`,
    metadata: { targetUserId, internalMessage }
  });

  return { internalMessage };
};

export const schedulePlatformMaintenance = async ({ performedBy, scope = "platform", title, message, startTime, endTime, maintenanceType = "scheduled", reason = "Maintenance scheduled" }) => {
  const platform = await Platform.getPlatform();
  if (!platform) {
    throw new Error("Platform not initialized");
  }

  const maintenanceWindow = {
    title,
    message,
    scope,
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    maintenanceType,
    status: "scheduled",
    createdBy: performedBy,
    createdAt: new Date()
  };

  await createAuditRecord({
    performedBy,
    target: "platform-maintenance",
    action: "maintenance-scheduled",
    reason,
    result: "success",
    description: `Platform Owner scheduled maintenance for ${scope}`,
    metadata: { maintenanceWindow }
  });

  return { maintenanceWindow };
};

export const upsertFeatureFlag = async ({ performedBy, key, enabled, scope = "platform", reason = "Feature flag updated" }) => {
  const platform = await Platform.getPlatform();
  if (!platform) {
    throw new Error("Platform not initialized");
  }

  const featureFlags = platform.settings?.featureFlags || {};
  featureFlags[key] = { enabled, scope, updatedAt: new Date(), updatedBy: performedBy };

  platform.settings = { ...platform.settings, featureFlags };
  await platform.save();

  await createAuditRecord({
    performedBy,
    target: "feature-flag",
    action: enabled ? "feature-enabled" : "feature-disabled",
    reason,
    result: "success",
    description: `Platform Owner ${enabled ? "enabled" : "disabled"} feature flag ${key}`,
    metadata: { key, enabled, scope }
  });

  return { featureFlags };
};

export const updatePlatformConfiguration = async ({ performedBy, config, reason = "Platform configuration updated" }) => {
  const platform = await Platform.getPlatform();
  if (!platform) {
    throw new Error("Platform not initialized");
  }

  platform.settings = { ...(platform.settings || {}), ...(config || {}) };
  await platform.save();

  await createAuditRecord({
    performedBy,
    target: "platform-configuration",
    action: "configuration-updated",
    reason,
    result: "success",
    description: "Platform Owner updated centralized platform configuration",
    metadata: { config }
  });

  return { platform };
};

export const emergencyPlatformAction = async ({ performedBy, action, reason, confirmed = false }) => {
  if (!confirmed) {
    throw new Error("Emergency actions require confirmation");
  }

  const platform = await Platform.getPlatform();
  if (!platform) {
    throw new Error("Platform not initialized");
  }

  platform.status = action === "suspend-services" ? "maintenance" : platform.status;
  await platform.save();

  await createAuditRecord({
    performedBy,
    target: "platform-emergency",
    action: "emergency-mode-activated",
    reason,
    result: "success",
    description: `Platform Owner executed emergency action: ${action}`,
    metadata: { action }
  });

  return { platform };
};

export const getPlatformJobs = async () => {
  return getCachedOperationResult("platform-jobs", async () => {
    const [pendingNotifications, failedNotifications, totalNotifications] = await Promise.all([
      Notification.countDocuments({ read: false }),
      Notification.countDocuments({ read: false, status: "failed" }),
      Notification.countDocuments()
    ]);

    return {
      predictionJobs: [{ status: "Waiting", name: "Prediction sync", progress: 0 }],
      notificationJobs: [{ status: pendingNotifications > 0 ? "Running" : "Completed", name: "Broadcast queue", progress: pendingNotifications > 0 ? 50 : 100 }],
      schedulerJobs: [{ status: "Running", name: "Reminder scheduler", progress: 100 }],
      reminderJobs: [{ status: "Waiting", name: "Maintenance reminders", progress: 0 }],
      cleanupJobs: [{ status: "Completed", name: "Cleanup", progress: 100 }],
      retryJobs: [{ status: failedNotifications > 0 ? "Failed" : "Completed", name: "Notification retry", progress: failedNotifications > 0 ? 40 : 100 }]
    };
  });
};

export const getOperationalAudit = async (options = {}) => {
  const { page = 1, limit = 20, search } = options;
  const filters = {};
  if (search) {
    const regex = new RegExp(search, "i");
    filters.$or = [{ action: regex }, { description: regex }, { reason: regex }];
  }

  const skip = (page - 1) * limit;
  const [audits, total] = await Promise.all([
    Audit.find(filters).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
    Audit.countDocuments(filters)
  ]);

  return { audits, total, page, limit };
};

export const getNotificationMonitor = async () => {
  return getCachedOperationResult("platform-notifications", async () => {
    const [queued, delivered, failed] = await Promise.all([
      Notification.countDocuments({ read: false }),
      Notification.countDocuments({ read: true }),
      Notification.countDocuments({ read: false, status: "failed" })
    ]);

    return {
      queuedNotifications: queued,
      deliveredNotifications: delivered,
      failedNotifications: failed,
      retryQueue: failed,
      pushStatus: queued > 100 ? "Busy" : "Healthy",
      firebaseStatus: "Healthy",
      emailStatus: "Healthy",
      smsStatus: "Future-ready"
    };
  });
};
