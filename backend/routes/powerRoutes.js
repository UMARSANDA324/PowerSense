import express from "express";
import mongoose from "mongoose";
import PowerStatus from "../models/PowerStatus.js";
import Feeder from "../models/Location/Feeder.js";
import PowerLog from "../models/PowerLog.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Protected route for users to check power status for allowed feeders
// Cache for state to feeder IDs mapping to prevent slow DB lookups on every request
const stateFeedersCache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

async function getFeedersForState(stateName) {
    const now = Date.now();
    const cached = stateFeedersCache.get(stateName);
    if (cached && now < cached.expiry) {
        return cached.feederIds;
    }

    const StateModel = mongoose.model("State");
    const state = await StateModel.findOne({ name: stateName }).lean();
    if (!state) return [];

    const LGAModel = mongoose.model("LGA");
    const lgas = await LGAModel.find({ state: state._id }).select("_id").lean();
    const lgaIds = lgas.map(l => l._id);

    const WardModel = mongoose.model("Ward");
    const wards = await WardModel.find({ lga: { $in: lgaIds } }).select("_id").lean();
    const wardIds = wards.map(w => w._id);

    const FeederModel = mongoose.model("Feeder");
    const feedersInState = await FeederModel.find({ wards: { $in: wardIds } }).select("_id").lean();
    const feederIds = feedersInState.map(f => f._id);

    stateFeedersCache.set(stateName, {
        feederIds,
        expiry: now + CACHE_TTL_MS
    });

    return feederIds;
}

// Protected route for users to check power status for allowed feeders
router.get("/all-status", protect, async (req, res) => {
    try {
        let query = {};
        const isSuperAdmin = req.user.role === 'super-admin';

        if (!isSuperAdmin) {
            if (req.user.role === 'admin') {
                query = { feeder: { $in: req.user.assignedFeeders || [] } };
            } else {
                // User role: filter by state
                if (!req.user.state) {
                    return res.json([]);
                }
                const feederIds = await getFeedersForState(req.user.state);
                query = { feeder: { $in: feederIds } };
            }
        }

        const statuses = await PowerStatus.find(query)
            .select('feeder status isActive lastUpdated updatedAt updatedBy')
            .populate("feeder", "name latitude longitude") // Include lat/long for map
            .populate("updatedBy", "fullName")
            .lean(); // Lean for faster queries
        
        res.json(statuses);
    } catch (error) {
        console.error("Error fetching all-status:", error);
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
            
            status = await PowerStatus.findOne({ feeder: feederId })
                .populate("feeder", "name latitude longitude")
                .populate("updatedBy", "fullName");
        } else {
            // Find a default feeder the user is allowed to see
            let allowedFeederIds = [];
            if (req.user && req.user.role === 'admin') {
                allowedFeederIds = req.user.assignedFeeders || [];
            } else if (req.user && req.user.role === 'user' && req.user.state) {
                allowedFeederIds = await getFeedersForState(req.user.state);
            }

            const query = (req.user && req.user.role === 'super-admin') 
                ? {} 
                : (allowedFeederIds.length > 0 ? { feeder: { $in: allowedFeederIds } } : null);
            
            if (query) {
                status = await PowerStatus.findOne(query)
                    .populate("feeder", "name latitude longitude")
                    .populate("updatedBy", "fullName");
            }
        }

        if (!status) {
            return res.json({
                status: "on",
                expectedOutageTime: null,
                expectedRestoreTime: null,
                maintenanceStart: null,
                maintenanceEnd: null,
                reason: null,
                nextScheduledOutage: null,
                estimatedNextOutage: null,
                maintenanceReason: null,
                updatedBy: null,
                isActive: true,
                lastUpdated: "Just Now",
                message: "System initialized"
            });
        }

        // Apply filtering logic for the fetched status
        if (req.user.role !== 'super-admin') {
            let isAllowed = false;
            const feederIdStr = status.feeder ? (status.feeder._id ? status.feeder._id.toString() : status.feeder.toString()) : null;

            if (req.user.role === 'admin') {
                const assignedStrs = (req.user.assignedFeeders || []).map(id => id.toString());
                isAllowed = feederIdStr && assignedStrs.includes(feederIdStr);
            } else if (req.user.role === 'user' && req.user.state) {
                const allowedFeederIds = await getFeedersForState(req.user.state);
                const allowedStrs = allowedFeederIds.map(id => id.toString());
                isAllowed = feederIdStr && allowedStrs.includes(feederIdStr);
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
