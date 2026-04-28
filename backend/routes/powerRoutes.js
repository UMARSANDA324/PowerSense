import express from "express";
import mongoose from "mongoose";
import PowerStatus from "../models/PowerStatus.js";
import Feeder from "../models/Location/Feeder.js";
import PowerLog from "../models/PowerLog.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Protected route for users to check power status for allowed feeders
router.get("/all-status", protect, async (req, res) => {
    try {
        let allowedFeederIds = [];
        const isSuperAdmin = req.user.role === 'super-admin';

        if (!isSuperAdmin) {
            if (req.user.role === 'admin') {
                allowedFeederIds = req.user.assignedFeeders || [];
            } else {
                // User role: filter by state
                if (!req.user.state) {
                    return res.json([]);
                }
                const StateModel = mongoose.model("State");
                const state = await StateModel.findOne({ name: req.user.state });
                
                if (state) {
                    const LGAModel = mongoose.model("LGA");
                    const lgas = await LGAModel.find({ state: state._id });
                    
                    const WardModel = mongoose.model("Ward");
                    const wards = await WardModel.find({ lga: { $in: lgas.map(l => l._id) } });
                    
                    const FeederModel = mongoose.model("Feeder");
                    const feedersInState = await FeederModel.find({ wards: { $in: wards.map(w => w._id) } });
                    
                    allowedFeederIds = feedersInState.map(f => f._id);
                }
            }
        }

        const query = isSuperAdmin ? {} : { feeder: { $in: allowedFeederIds } };
        const statuses = await PowerStatus.find(query).populate("feeder", "name");
        res.json(statuses);
    } catch (error) {
        res.status(500).json({ message: "Error fetching statuses", error: error.message });
    }
});

// Protected route for users to check power status for a specific feeder
router.get("/status", protect, async (req, res) => {
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
                status: "on",
                isActive: true,
                lastUpdated: "Just Now",
                message: "System initialized",
                estimatedNextOutage: "TBD"
            });
        }

        // Apply filtering logic for the fetched status
        if (req.user.role !== 'super-admin') {
            let isAllowed = false;
            if (req.user.role === 'admin') {
                const assignedStrs = (req.user.assignedFeeders || []).map(id => id.toString());
                isAllowed = assignedStrs.includes(status.feeder.toString());
            } else if (req.user.role === 'user' && req.user.state) {
                const FeederModel = mongoose.model("Feeder");
                const f = await FeederModel.findById(status.feeder).populate({
                    path: 'wards',
                    populate: {
                        path: 'lga',
                        populate: { path: 'state' }
                    }
                });
                
                if (f && f.wards) {
                    isAllowed = f.wards.some(w => w.lga?.state?.name === req.user.state);
                }
            }
            if (!isAllowed) {
                return res.status(403).json({ message: "Access denied to this feeder's status." });
            }
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
