import express from "express";
import mongoose from "mongoose";
import axios from "axios";
import PowerStatus from "../models/PowerStatus.js";
import Feeder from "../models/Location/Feeder.js";
import PowerLog from "../models/PowerLog.js";
import Outage from "../models/Outage.js";
import Report from "../models/Report.js";
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
// Roles with company-wide or global access — no feeder ownership filter needed
const ELEVATED_ROLES = new Set(['super-admin', 'company-super-admin', 'regional-admin', 'platform-owner']);

router.get("/all-status", protect, async (req, res) => {
    try {
        let query = {};

        if (!ELEVATED_ROLES.has(req.user.role)) {
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
            .populate("feeder", "name latitude longitude")
            .populate("updatedBy", "fullName")
            .lean();
        
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
                    lastUpdated: new Date().toISOString(),
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
                lastUpdated: new Date().toISOString(),
                message: "System initialized"
            });
        }

        // Apply filtering logic for the fetched status.
        // Elevated roles (platform-owner, super-admin, company-super-admin, regional-admin) have full access.
        if (!ELEVATED_ROLES.has(req.user.role)) {
            let isAllowed = false;
            const feederIdStr = status.feeder
                ? (status.feeder._id ? status.feeder._id.toString() : status.feeder.toString())
                : null;

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
            // assignedFeeders are ObjectIds, PowerLog.feeder is also ObjectId - this should work
            query.feeder = { $in: req.user.assignedFeeders };
        }
        // Super admin gets all logs by default (no feeder filter)

        const logs = await PowerLog.find(query).sort({ timestamp: -1 });
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: "Error fetching history", error: error.message });
    }
});

// Cache for feeder ranking to avoid repetitive AI calls and heavy DB aggregation
const rankingCache = new Map();
const RANKING_CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache duration for more dynamic updates
const GEMINI_KEY = process.env.GEMINI_API_KEY;

// Cache for previous rankings to calculate movement
const previousRankingsCache = new Map();
const PREVIOUS_RANKING_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days to store previous rankings

router.get("/feeder-ranking", protect, async (req, res) => {
    try {
        const user = req.user;
        const assignedFeederId = Array.isArray(user.assignedFeeders) && user.assignedFeeders.length > 0
            ? user.assignedFeeders[0]
            : null;

        let userFeederObj = null;
        if (assignedFeederId && mongoose.Types.ObjectId.isValid(assignedFeederId)) {
            userFeederObj = await Feeder.findById(assignedFeederId).lean();
        }

        if (!userFeederObj && user.feeder) {
            // Fall back to the legacy string field for regular users and older admin records.
            userFeederObj = await Feeder.findOne({
                $or: [
                    { name: user.feeder },
                    { name: { $regex: new RegExp(`^${user.feeder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } },
                    { _id: mongoose.Types.ObjectId.isValid(user.feeder) ? user.feeder : null }
                ]
            }).lean();
        }

        if (!userFeederObj || !userFeederObj.band) {
            return res.json({ success: true, insufficientData: true });
        }

        const band = userFeederObj.band;
        const cacheKey = `${userFeederObj._id}:${band}`;
        const cachedResult = rankingCache.get(cacheKey);
        const nowTime = Date.now();

        // 1. Fetch same band feeders
        const sameBandFeeders = await Feeder.find({ band, isActive: { $ne: false } }).lean();
        if (sameBandFeeders.length === 0) {
            return res.json({ success: true, insufficientData: true });
        }

        const feederIds = sameBandFeeders.map(f => f._id);
        const start = new Date();
        start.setDate(start.getDate() - 30); // 30 days ago
        const end = new Date();

        // Check if user's feeder has logs in last 30 days.
        const userFeederLogsCount = await PowerLog.countDocuments({
            feeder: userFeederObj._id,
            timestamp: { $gte: start, $lte: end }
        });

        if (userFeederLogsCount < 2) {
            return res.json({ success: true, insufficientData: true });
        }

        // Fetch logs, outages, reports, and power status for all same-band feeders
        const [allLogs, allOutages, allReports, allPowerStatus] = await Promise.all([
            PowerLog.find({
                feeder: { $in: feederIds },
                timestamp: { $gte: start, $lte: end }
            }).sort({ timestamp: 1 }).lean(),
            Outage.find({
                feeder: { $in: feederIds },
                createdAt: { $gte: start, $lte: end }
            }).lean(),
            Report.find({
                feeder: { $in: feederIds.map(id => id.toString()) },
                createdAt: { $gte: start, $lte: end }
            }).lean(),
            PowerStatus.find({
                feeder: { $in: feederIds },
                lastUpdated: { $gte: start, $lte: end }
            }).lean()
        ]);

        // Helper to compute uptime
        const computeUptime = (logs, periodStart, periodEnd) => {
            if (!logs || logs.length === 0) return 0;
            let uptimeMs = 0;
            for (let i = 0; i < logs.length; i++) {
                const curr = logs[i];
                const nextTime = (i + 1 < logs.length) ? new Date(logs[i + 1].timestamp) : periodEnd;
                const currTime = new Date(curr.timestamp) < periodStart ? periodStart : new Date(curr.timestamp);
                const dt = Math.max(0, nextTime - currTime);
                if (curr.status === 'on') uptimeMs += dt;
            }
            const totalMs = periodEnd - periodStart;
            return Math.max(0, Math.min(100, Math.round((uptimeMs / totalMs) * 10000) / 100));
        };

        // Group by feeder
        const logsByFeeder = {};
        allLogs.forEach(l => {
            const fid = l.feeder?.toString();
            if (fid) {
                logsByFeeder[fid] = logsByFeeder[fid] || [];
                logsByFeeder[fid].push(l);
            }
        });

        const outagesByFeeder = {};
        allOutages.forEach(o => {
            const fid = o.feeder?.toString();
            if (fid) {
                outagesByFeeder[fid] = outagesByFeeder[fid] || [];
                outagesByFeeder[fid].push(o);
            }
        });

        const reportsByFeeder = {};
        allReports.forEach(r => {
            const feederKey = r.feeder || "unknown";
            reportsByFeeder[feederKey] = reportsByFeeder[feederKey] || [];
            reportsByFeeder[feederKey].push(r);
        });

        const powerStatusByFeeder = {};
        allPowerStatus.forEach(ps => {
            const fid = ps.feeder?.toString();
            if (fid) {
                powerStatusByFeeder[fid] = powerStatusByFeeder[fid] || [];
                powerStatusByFeeder[fid].push(ps);
            }
        });

        // Compute metrics for all feeders in band with weighted scoring
        const feedersWithMetrics = sameBandFeeders.map(feeder => {
            const fidStr = feeder._id.toString();
            const feederLogs = logsByFeeder[fidStr] || [];
            const feederOutages = outagesByFeeder[fidStr] || [];
            const feederReports = reportsByFeeder[feeder.name] || reportsByFeeder[fidStr] || [];
            const feederPowerStatus = powerStatusByFeeder[fidStr] || [];

            const uptimePercent = computeUptime(feederLogs, start, end);
            const outagesCount = feederOutages.length;
            
            const restoreTimes = feederOutages
                .filter(o => o.estimatedRestoreTime && o.createdAt)
                .map(o => Math.abs(new Date(o.estimatedRestoreTime) - new Date(o.createdAt)) / 60000);
            const avgRestoreMinutes = restoreTimes.length
                ? Math.round(restoreTimes.reduce((sum, val) => sum + val, 0) / restoreTimes.length)
                : 0;

            // Count maintenance events and duration
            const maintenanceEvents = feederPowerStatus.filter(ps => ps.status === 'maintenance');
            const maintenanceCount = maintenanceEvents.length;
            const maintenanceDuration = maintenanceEvents.reduce((total, ps) => {
                if (ps.maintenanceStart && ps.maintenanceEnd) {
                    return total + (new Date(ps.maintenanceEnd) - new Date(ps.maintenanceStart)) / 60000;
                }
                return total;
            }, 0);

            // Calculate stability trend (status changes)
            let statusChanges = 0;
            for (let i = 1; i < feederLogs.length; i++) {
                if (feederLogs[i].status !== feederLogs[i-1].status) statusChanges++;
            }
            const stabilityTrend = feederLogs.length > 0 ? (statusChanges / feederLogs.length) : 0;

            // Calculate consecutive days without outage
            let maxConsecutiveDaysOn = 0;
            let currentConsecutiveDays = 0;
            const today = new Date();
            for (let i = feederLogs.length - 1; i >= 0; i--) {
                if (feederLogs[i].status === 'on') {
                    currentConsecutiveDays++;
                    if (currentConsecutiveDays > maxConsecutiveDaysOn) {
                        maxConsecutiveDaysOn = currentConsecutiveDays;
                    }
                } else {
                    currentConsecutiveDays = 0;
                }
            }

            // Current operational health (based on latest power status)
            const currentHealth = feederPowerStatus.length > 0 
                ? (feederPowerStatus[feederPowerStatus.length - 1].status === 'on' ? 100 : 0)
                : 50;

            // Dynamic Performance Score Calculation (weighted)
            // Higher uptime = higher score (weight: 40%)
            const uptimeScore = uptimePercent * 0.4;
            
            // More outages = lower score (weight: 25%)
            const outageScore = Math.max(0, 100 - (outagesCount * 15)) * 0.25;
            
            // Long restoration = lower score (weight: 15%)
            const restoreScore = Math.max(0, 100 - Math.min(avgRestoreMinutes, 300) / 3) * 0.15;
            
            // Frequent maintenance = lower score (weight: 10%)
            const maintenanceScore = Math.max(0, 100 - (maintenanceCount * 10) - (maintenanceDuration / 60)) * 0.1;
            
            // Stable operation = higher score (weight: 5%)
            const stabilityScore = Math.max(0, 100 - (stabilityTrend * 100)) * 0.05;
            
            // Consecutive days without outage = higher score (weight: 3%)
            const consecutiveScore = Math.min(100, maxConsecutiveDaysOn * 5) * 0.03;
            
            // Current operational health = higher score (weight: 2%)
            const healthScore = currentHealth * 0.02;

            const dynamicPerformanceScore = Math.round(
                uptimeScore + outageScore + restoreScore + maintenanceScore + 
                stabilityScore + consecutiveScore + healthScore
            );

            return {
                feederId: fidStr,
                name: feeder.name,
                uptimePercent,
                outagesCount,
                avgRestoreMinutes,
                maintenanceCount,
                maintenanceDuration: Math.round(maintenanceDuration),
                stabilityTrend: Math.round(stabilityTrend * 100),
                maxConsecutiveDaysOn,
                currentHealth,
                dynamicPerformanceScore
            };
        });

        // Sort feeders by dynamic performance score (higher is better)
        feedersWithMetrics.sort((a, b) => {
            if (b.dynamicPerformanceScore !== a.dynamicPerformanceScore) {
                return b.dynamicPerformanceScore - a.dynamicPerformanceScore;
            }
            // Tiebreaker: higher uptime wins
            if (b.uptimePercent !== a.uptimePercent) {
                return b.uptimePercent - a.uptimePercent;
            }
            // Tiebreaker: fewer outages wins
            if (a.outagesCount !== b.outagesCount) {
                return a.outagesCount - b.outagesCount;
            }
            // Tiebreaker: faster restoration wins
            return a.avgRestoreMinutes - b.avgRestoreMinutes;
        });

        // Assign ranks (1-based index)
        feedersWithMetrics.forEach((f, idx) => {
            f.rank = idx + 1;
        });

        // Find user's feeder in the ranked list
        const userFeederIndex = feedersWithMetrics.findIndex(f => f.feederId === userFeederObj._id.toString());
        if (userFeederIndex === -1) {
            return res.json({ success: true, insufficientData: true });
        }

        const userFeederMetrics = feedersWithMetrics[userFeederIndex];
        const rank = userFeederMetrics.rank;
        const totalFeeders = feedersWithMetrics.length;

        const percentile = totalFeeders > 1
            ? Math.round(((totalFeeders - rank) / (totalFeeders - 1)) * 100)
            : 100;

        const leaderboard = feedersWithMetrics.map(f => ({
            feederId: f.feederId,
            name: f.name,
            rank: f.rank,
            reliabilityScore: f.dynamicPerformanceScore
        }));

        // Calculate ranking movement from previous period
        const previousRankingsKey = `${band}`;
        const previousRankings = previousRankingsCache.get(previousRankingsKey);
        const currentRankingsMap = new Map(feedersWithMetrics.map(f => [f.feederId, f.rank]));
        
        const leaderboardWithMovement = feedersWithMetrics.map(f => {
            const previousRank = previousRankings?.rankings?.get(f.feederId);
            let movement = null;
            if (previousRank !== undefined && previousRank !== f.rank) {
                movement = previousRank - f.rank; // Positive = moved up, Negative = moved down
            }
            return {
                feederId: f.feederId,
                name: f.name,
                rank: f.rank,
                reliabilityScore: f.dynamicPerformanceScore,
                movement
            };
        });

        // Store current rankings for next comparison
        previousRankingsCache.set(previousRankingsKey, {
            rankings: currentRankingsMap,
            updatedAt: nowTime
        });

        // Check if we can return a cached response.
        if (cachedResult && (nowTime - cachedResult.updatedAt < RANKING_CACHE_TTL)) {
            const match = cachedResult.rank === rank &&
                          cachedResult.totalFeeders === totalFeeders &&
                          cachedResult.uptimePercent === userFeederMetrics.uptimePercent &&
                          cachedResult.outagesCount === userFeederMetrics.outagesCount &&
                          cachedResult.avgRestoreMinutes === userFeederMetrics.avgRestoreMinutes &&
                          cachedResult.dynamicPerformanceScore === userFeederMetrics.dynamicPerformanceScore;
            if (match) {
                return res.json({
                    success: true,
                    insufficientData: false,
                    rank,
                    totalFeeders,
                    percentile,
                    band,
                    feederId: userFeederMetrics.feederId,
                    feederName: userFeederMetrics.name,
                    metrics: {
                        uptimePercent: userFeederMetrics.uptimePercent,
                        outagesCount: userFeederMetrics.outagesCount,
                        avgRestoreMinutes: userFeederMetrics.avgRestoreMinutes,
                        dynamicPerformanceScore: userFeederMetrics.dynamicPerformanceScore,
                        maintenanceCount: userFeederMetrics.maintenanceCount,
                        stabilityTrend: userFeederMetrics.stabilityTrend,
                        maxConsecutiveDaysOn: userFeederMetrics.maxConsecutiveDaysOn
                    },
                    aiInsight: cachedResult.aiInsight,
                    leaderboard: leaderboardWithMovement
                });
            }
        }

        // Generate AI analysis via Gemini
        let aiInsight = "";
        const averageUptime = Math.round(feedersWithMetrics.reduce((sum, f) => sum + f.uptimePercent, 0) / feedersWithMetrics.length);
        const averageOutages = Math.round(feedersWithMetrics.reduce((sum, f) => sum + f.outagesCount, 0) / feedersWithMetrics.length);
        const averagePerformanceScore = Math.round(feedersWithMetrics.reduce((sum, f) => sum + f.dynamicPerformanceScore, 0) / feedersWithMetrics.length);

        if (GEMINI_KEY && GEMINI_KEY !== "YOUR_GEMINI_API_KEY") {
            try {
                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;
                const promptText = `You are the Nikola Grid Intelligence Assistant.
Analyze and explain the following ranking of a power feeder among other feeders in the same KEDCO Band ${band}.
Create a concise, user-friendly, 1-2 sentence insight about its performance. Do not use markdown tags, formatting, or bullet points.
Explain WHY the feeder achieved its current position based on the calculated metrics.

Feeder Name: ${userFeederMetrics.name}
Band: ${band}
Rank: #${rank} out of ${totalFeeders} feeders
Percentile: ${percentile}th percentile
Dynamic Performance Score: ${userFeederMetrics.dynamicPerformanceScore}/100 (Band Average: ${averagePerformanceScore})
Uptime: ${userFeederMetrics.uptimePercent}% (Band Average Uptime: ${averageUptime}%)
Outages: ${userFeederMetrics.outagesCount} outages (Band Average Outages: ${averageOutages})
Average Restoration Time: ${userFeederMetrics.avgRestoreMinutes} minutes
Maintenance Events: ${userFeederMetrics.maintenanceCount}
Stability Trend: ${userFeederMetrics.stabilityTrend}%
Consecutive Days Without Outage: ${userFeederMetrics.maxConsecutiveDaysOn}

Example Output:
"${userFeederMetrics.name} currently ranks #${rank} among Band ${band} feeders because it achieved a dynamic performance score of ${userFeederMetrics.dynamicPerformanceScore}, driven by ${userFeederMetrics.uptimePercent}% uptime and only ${userFeederMetrics.outagesCount} outages this month."`;

                const response = await axios.post(geminiUrl, {
                    contents: [
                        {
                            parts: [
                                { text: promptText }
                            ]
                        }
                    ]
                }, {
                    headers: { "Content-Type": "application/json" },
                    timeout: 8000
                });

                const text = response?.data?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                    aiInsight = text.replace(/\"/g, "").trim();
                }
            } catch (err) {
                console.error("[AI Service] Gemini ranking explanation failed:", err.message);
            }
        }

        // Fallback heuristic explanation if Gemini fails or key is missing
        if (!aiInsight) {
            if (rank === 1) {
                aiInsight = `${userFeederMetrics.name} is currently the top-performing feeder in Band ${band}, achieving a dynamic performance score of ${userFeederMetrics.dynamicPerformanceScore} with ${userFeederMetrics.uptimePercent}% uptime and only ${userFeederMetrics.outagesCount} outages.`;
            } else if (rank <= Math.ceil(totalFeeders * 0.25)) {
                aiInsight = `${userFeederMetrics.name} ranks #${rank} among Band ${band} feeders, performing in the top quartile with a dynamic performance score of ${userFeederMetrics.dynamicPerformanceScore} and above-average uptime.`;
            } else if (rank > Math.ceil(totalFeeders * 0.75)) {
                aiInsight = `${userFeederMetrics.name} currently ranks in the lower quartile (#${rank} of ${totalFeeders}) for Band ${band} with a dynamic performance score of ${userFeederMetrics.dynamicPerformanceScore} due to higher outage frequency.`;
            } else {
                aiInsight = `${userFeederMetrics.name} currently ranks #${rank} among Band ${band} feeders with a dynamic performance score of ${userFeederMetrics.dynamicPerformanceScore}, maintaining steady grid stability this month.`;
            }
        }

        // Cache the result
        rankingCache.set(cacheKey, {
            rank,
            totalFeeders,
            uptimePercent: userFeederMetrics.uptimePercent,
            outagesCount: userFeederMetrics.outagesCount,
            avgRestoreMinutes: userFeederMetrics.avgRestoreMinutes,
            dynamicPerformanceScore: userFeederMetrics.dynamicPerformanceScore,
            aiInsight,
            updatedAt: nowTime
        });

        res.json({
            success: true,
            insufficientData: false,
            rank,
            totalFeeders,
            percentile,
            band,
            feederId: userFeederMetrics.feederId,
            feederName: userFeederMetrics.name,
            metrics: {
                uptimePercent: userFeederMetrics.uptimePercent,
                outagesCount: userFeederMetrics.outagesCount,
                avgRestoreMinutes: userFeederMetrics.avgRestoreMinutes,
                dynamicPerformanceScore: userFeederMetrics.dynamicPerformanceScore,
                maintenanceCount: userFeederMetrics.maintenanceCount,
                stabilityTrend: userFeederMetrics.stabilityTrend,
                maxConsecutiveDaysOn: userFeederMetrics.maxConsecutiveDaysOn
            },
            aiInsight,
            leaderboard: leaderboardWithMovement
        });

    } catch (error) {
        console.error("Error generating feeder ranking:", error);
        res.status(500).json({ message: "Error generating feeder ranking", error: error.message });
    }
});

export default router;
