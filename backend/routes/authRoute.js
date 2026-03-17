
import express from "express";
import { registerUser, loginUser, forgotPassword, verifyOTP, resetPassword, getUserProfile, updateUserProfile } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOTP);
router.post("/reset-password", resetPassword);

// Protected routes
router.get("/profile", protect, getUserProfile);
router.put("/profile", protect, updateUserProfile);
router.get("/test-protection", protect, (req, res) => {
    res.json({ message: "Congratulations! You can access this protected route." });
});

export default router;