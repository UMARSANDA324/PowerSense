
import express from "express";
import {
    adminTest,
    createAdmin,
    getSystemStats,
    getAllUsers,
    updateUser,
    deleteUser,
    getAllAdmins,
    getAllFeeders,
    assignFeedersToAdmin,
    getProfile
} from "../controllers/adminController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/rolemiddleware.js";
import PowerStatus from "../models/PowerStatus.js";

const router = express.Router();

// All admin routes are protected
router.use(protect);

router.get("/test", authorize("super-admin", "admin"), adminTest);
router.get("/profile", protect, getProfile);
router.get("/stats", authorize("super-admin", "admin"), getSystemStats);
router.get("/users", authorize("super-admin", "admin"), getAllUsers);
router.get("/admins", authorize("super-admin"), getAllAdmins);
router.get("/all-feeders", protect, getAllFeeders);
router.put("/users/:id", authorize("super-admin"), updateUser);
router.put("/assign-feeders/:id", authorize("super-admin"), assignFeedersToAdmin);
router.delete("/users/:id", authorize("super-admin"), deleteUser);
router.post("/create-admin", authorize("super-admin"), createAdmin);

// Route for Admin Dashboard to toggle power status
router.post("/power-status", authorize("super-admin", "admin"), async (req, res) => {
    const { isActive, estimatedNextOutage } = req.body;
    try {
        let status = await PowerStatus.findOne();
        if (!status) {
            status = new PowerStatus({ isActive, estimatedNextOutage });
        } else {
            if (isActive !== undefined) status.isActive = isActive;
            if (estimatedNextOutage !== undefined) status.estimatedNextOutage = estimatedNextOutage;
            status.lastUpdated = Date.now();
        }
        await status.save();
        res.json({ message: "Power status updated successfully", status });
    } catch (error) {
        res.status(500).json({ message: "Error updating power status", error: error.message });
    }
});

export default router;




