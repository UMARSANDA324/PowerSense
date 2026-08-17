import express from "express";
import { resolveCode, getMyReferralInfo } from "../controllers/referralController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public route to resolve a code (used when clicking a link)
router.get("/resolve/:code", resolveCode);

// Protected route to get the logged-in user's referral info
router.get("/me", protect, getMyReferralInfo);

export default router;
