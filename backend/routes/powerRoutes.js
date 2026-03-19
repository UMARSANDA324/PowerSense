import express from "express";
import mongoose from "mongoose";
import PowerStatus from "../models/PowerStatus.js";
import Feeder from "../models/Location/Feeder.js";

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

export default router;
