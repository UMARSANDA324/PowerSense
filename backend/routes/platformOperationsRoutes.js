import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/rolemiddleware.js";
import {
  getPlatformOperationsDashboardController,
  broadcastPlatformMessageController,
  sendInternalCompanyMessageController,
  schedulePlatformMaintenanceController,
  upsertFeatureFlagController,
  updatePlatformConfigurationController,
  emergencyPlatformActionController,
  getPlatformJobsController,
  getOperationalAuditController,
  getNotificationMonitorController
} from "../controllers/platformOperationsController.js";

const router = express.Router();
const platformOwnerOnly = authorize("platform-owner");

router.get("/dashboard", protect, platformOwnerOnly, getPlatformOperationsDashboardController);
router.post("/broadcast", protect, platformOwnerOnly, broadcastPlatformMessageController);
router.post("/internal-message", protect, platformOwnerOnly, sendInternalCompanyMessageController);
router.post("/maintenance", protect, platformOwnerOnly, schedulePlatformMaintenanceController);
router.post("/feature-flags", protect, platformOwnerOnly, upsertFeatureFlagController);
router.post("/configuration", protect, platformOwnerOnly, updatePlatformConfigurationController);
router.post("/emergency", protect, platformOwnerOnly, emergencyPlatformActionController);
router.get("/jobs", protect, platformOwnerOnly, getPlatformJobsController);
router.get("/audit", protect, platformOwnerOnly, getOperationalAuditController);
router.get("/notifications", protect, platformOwnerOnly, getNotificationMonitorController);

export default router;
