import express from "express";
import mongoose from "mongoose";
import PowerStatus from "../models/PowerStatus.js";
import Feeder from "../models/Location/Feeder.js";
import PowerLog from "../models/PowerLog.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public route for users to check power status for all feeders
router.get("/all-status", async (req, res) => {
    try {
        const statuses = await PowerStatus.find().populate("feeder", "name");
        res.json(statuses);
    } catch (error) {
        res.status(500).json({ message: "Error fetching statuses", error: error.message });
    }
});

// Public route for users to check power status for a specific feeder
router.get("/status", async (req, res) => {
    const { feeder } = req.query;
    try {
        let status;
        if (feeder) {
            let feederId = feeder;
            
            // If it's not a valid ObjectId, assume it's a name and look it up
            if (!mongoose.Types.ObjectId.isValid(feeder)) {
                const foundFeeder = await Feeder.findOne({ name: feeder });
                if (!foundFeeder) {
                    return res.json({
                        isActive: true,
                        lastUpdated: "Just Now",
                        message: `Feeder "${feeder}" not found, showing default status`,
                        estimatedNextOutage: "TBD"
                    });
                }
                feederId = foundFeeder._id;
            }
            
            status = await PowerStatus.findOne({ feeder: feederId });
        } else {
            // Default to first status if no feeder specified (legacy support)
            status = await PowerStatus.findOne();
        }

        if (!status) {
            return res.json({
                isActive: true,
                lastUpdated: "Just Now",
                message: "System initialized",
                estimatedNextOutage: "TBD"
            });
        }
        res.json(status);
    } catch (error) {
        res.status(500).json({ message: "Error fetching status", error: error.message });
    }
});

// GET /api/power/history - returns power logs for current month, filtered by user's feeder
router.get("/history", protect, async (req, res) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        let query = {
            timestamp: { $gte: startOfMonth }
        };

        // Filter based on user role and assigned feeder
        if (req.user.role === "user") {
            if (!req.user.feeder) {
                return res.json([]);
            }
            
            // User.feeder can be a name (string) or ID. 
            // We search for logs by feederName matching user.feeder
            query.$or = [
                { feederName: req.user.feeder },
                { feeder: mongoose.Types.ObjectId.isValid(req.user.feeder) ? req.user.feeder : null }
            ];
        } else if (req.user.role === "admin") {
            if (!req.user.assignedFeeders || req.user.assignedFeeders.length === 0) {
                return res.json([]);
            }
            query.feeder = { $in: req.user.assignedFeeders };
        }
        // Super admin gets all logs by default (no feeder filter)

        const logs = await PowerLog.find(query).sort({ timestamp: -1 });
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: "Error fetching history", error: error.message });
    }
});

export default router;
