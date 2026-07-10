import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/rolemiddleware.js";
import { runPredictions, listPredictions } from "../controllers/predictionController.js";

const router = express.Router();

router.get("/", protect, listPredictions);
// Ensure role string matches User model enum: "super-admin"
router.post("/run", protect, authorize("admin", "super-admin"), runPredictions);

export default router;
