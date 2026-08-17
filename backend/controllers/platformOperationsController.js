import {
  getPlatformOperationsDashboard,
  broadcastPlatformMessage,
  sendInternalCompanyMessage,
  schedulePlatformMaintenance,
  upsertFeatureFlag,
  updatePlatformConfiguration,
  emergencyPlatformAction,
  getPlatformJobs,
  getOperationalAudit,
  getNotificationMonitor
} from "../services/platformOperationsService.js";

export const getPlatformOperationsDashboardController = async (req, res) => {
  try {
    const data = await getPlatformOperationsDashboard();
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("[Platform Operations] Dashboard error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to load platform operations dashboard" });
  }
};

export const broadcastPlatformMessageController = async (req, res) => {
  try {
    const data = await broadcastPlatformMessage({ performedBy: req.user._id, ...req.body });
    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error("[Platform Operations] Broadcast error:", error);
    res.status(400).json({ success: false, message: error.message || "Failed to broadcast message" });
  }
};

export const sendInternalCompanyMessageController = async (req, res) => {
  try {
    const data = await sendInternalCompanyMessage({ performedBy: req.user._id, ...req.body });
    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error("[Platform Operations] Internal message error:", error);
    res.status(400).json({ success: false, message: error.message || "Failed to send internal message" });
  }
};

export const schedulePlatformMaintenanceController = async (req, res) => {
  try {
    const data = await schedulePlatformMaintenance({ performedBy: req.user._id, ...req.body });
    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error("[Platform Operations] Maintenance error:", error);
    res.status(400).json({ success: false, message: error.message || "Failed to schedule maintenance" });
  }
};

export const upsertFeatureFlagController = async (req, res) => {
  try {
    const data = await upsertFeatureFlag({ performedBy: req.user._id, ...req.body });
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("[Platform Operations] Feature flag error:", error);
    res.status(400).json({ success: false, message: error.message || "Failed to update feature flag" });
  }
};

export const updatePlatformConfigurationController = async (req, res) => {
  try {
    const data = await updatePlatformConfiguration({ performedBy: req.user._id, ...req.body });
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("[Platform Operations] Configuration error:", error);
    res.status(400).json({ success: false, message: error.message || "Failed to update platform configuration" });
  }
};

export const emergencyPlatformActionController = async (req, res) => {
  try {
    const data = await emergencyPlatformAction({ performedBy: req.user._id, ...req.body });
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("[Platform Operations] Emergency action error:", error);
    res.status(400).json({ success: false, message: error.message || "Failed to execute emergency action" });
  }
};

export const getPlatformJobsController = async (req, res) => {
  try {
    const data = await getPlatformJobs();
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("[Platform Operations] Jobs error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to load platform jobs" });
  }
};

export const getOperationalAuditController = async (req, res) => {
  try {
    const data = await getOperationalAudit(req.query);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("[Platform Operations] Audit error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to load operational audit" });
  }
};

export const getNotificationMonitorController = async (req, res) => {
  try {
    const data = await getNotificationMonitor();
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("[Platform Operations] Notification monitor error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to load notification monitor" });
  }
};
