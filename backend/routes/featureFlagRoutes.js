import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/rolemiddleware.js";
import {
  getAllFeatureFlagsController,
  createFeatureFlagController,
  updateFeatureFlagController,
  toggleFeatureFlagController,
  deleteFeatureFlagController,
  evaluateFeatureFlagsController,
  getFeatureFlagAuditHistoryController
} from "../controllers/featureFlagController.js";

const router = express.Router();
const platformOwnerOnly = authorize("platform-owner");

// Context-aware flag evaluation for client app
router.get("/evaluate", protect, evaluateFeatureFlagsController);

// Audit Trail History
router.get("/audit-history", protect, platformOwnerOnly, getFeatureFlagAuditHistoryController);

// Management Endpoints (Platform Owner Only)
router.get("/", protect, getAllFeatureFlagsController);
router.post("/", protect, platformOwnerOnly, createFeatureFlagController);
router.put("/:id", protect, platformOwnerOnly, updateFeatureFlagController);
router.patch("/:id/toggle", protect, platformOwnerOnly, toggleFeatureFlagController);
router.delete("/:id", protect, platformOwnerOnly, deleteFeatureFlagController);

export default router;
