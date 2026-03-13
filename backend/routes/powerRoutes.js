import express from "express";
import PowerStatus from "../models/PowerStatus.js";

const router = express.Router();

// Public route for users to check the Admin-controlled power status
router.get("/status", async (req, res) => {
    try {
        const status = await PowerStatus.findOne();
        if (!status) {
            return res.json({ 
                isActive: true, 
                lastUpdated: "Just Now", 
                message: "System initialized" 
            });
        }
        res.json(status);
    } catch (error) {
        res.status(500).json({ message: "Error fetching status", error: error.message });
    }
});

export default router;
