import express from "express";
import { protect, softProtect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/rolemiddleware.js";
import { assistant, analyzeReport, getAnalytics } from "../controllers/aiController.js";

const router = express.Router();

// Protected routes — require login
router.post("/assistant", softProtect, assistant);
router.post("/analyze-report/:id", protect, analyzeReport);
router.get("/analytics", protect, getAnalytics);

export default router;
