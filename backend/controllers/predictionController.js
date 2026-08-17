import asyncHandler from "express-async-handler";
import Prediction from "../models/Prediction.js";
import predictionService from "../services/predictionService.js";

// @desc    Run predictions immediately
// @route   POST /api/predictions/run
// @access  Admin/SuperAdmin
export const runPredictions = asyncHandler(async (req, res) => {
  const results = await predictionService.generatePredictions({ limit: 20 });

  // Emit via socket if available
  if (req.io) {
    req.io.emit("predictions:updated", results);
  }

  res.status(201).json({ success: true, results });
});

// @desc    Get latest predictions
// @route   GET /api/predictions
// @access  Protected
export const listPredictions = asyncHandler(async (req, res) => {
  // CRITICAL: Apply tenant filtering to prevent cross-tenant data leakage
  const companyId = req.user?.companyId || null;
  const filter = companyId ? { companyId } : {};
  
  // Platform owners can see all predictions, others only their company's
  if (req.user?.role !== 'platform-owner') {
    if (!companyId) {
      return res.json({ success: true, items: [] });
    }
  }
  
  const items = await Prediction.find(filter).sort({ generatedAt: -1 }).limit(100);
  res.json({ success: true, items });
});

export default { runPredictions, listPredictions };
