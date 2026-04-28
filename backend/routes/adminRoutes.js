
import express from "express";
import mongoose from "mongoose";
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
import { hasFeederAccess } from "../utils/feederAccess.js";
import Feeder from "../models/Location/Feeder.js";
import { notifyArea } from "../utils/notificationHelper.js";
import PowerLog from "../models/PowerLog.js";

const router = express.Router();

// All admin routes are protected
router.use(protect);

router.get("/test", authorize("super-admin", "admin"), adminTest);
router.get("/profile", getProfile);
router.get("/stats", authorize("super-admin", "admin"), getSystemStats);
router.get("/users", authorize("super-admin", "admin"), getAllUsers);
router.get("/admins", authorize("super-admin"), getAllAdmins);
router.get("/all-feeders", authorize("super-admin", "admin"), getAllFeeders);
router.put("/users/:id", authorize("super-admin"), updateUser);
router.put("/assign-feeders/:id", authorize("super-admin"), assignFeedersToAdmin);
router.delete("/users/:id", authorize("super-admin"), deleteUser);
router.post("/create-admin", authorize("super-admin"), createAdmin);

// Route for Admin Dashboard to toggle power status for one or more feeders
router.post("/power-status", authorize("super-admin", "admin"), async (req, res) => {
    const { status, isActive: legacyIsActive, estimatedNextOutage, feederId, feederIds } = req.body;
    
    // Determine the status. Priority: status > legacyIsActive
    let finalStatus = status;
    if (!finalStatus && legacyIsActive !== undefined) {
        finalStatus = legacyIsActive ? "on" : "off";
    }
    
    if (!finalStatus) {
        return res.status(400).json({ message: "Status is required (on, off, or maintenance)" });
    }

    const isActive = finalStatus === "on";

    // Support both single feederId and array feederIds
    const targetFeederIds = feederIds || (feederId ? [feederId] : []);
    
    if (targetFeederIds.length === 0) {
        return res.status(400).json({ message: "At least one Feeder ID is required" });
    }

    if (targetFeederIds.length > 5) {
        return res.status(400).json({ message: "Cannot control more than 5 feeders at once" });
    }

    if (!estimatedNextOutage || estimatedNextOutage.trim() === "") {
        return res.status(400).json({ message: "Estimated Change Time is required" });
    }

    try {
        const results = [];
        
        for (const id of targetFeederIds) {
            // Verify admin has access to this feeder
            const isAuthorized = await hasFeederAccess(req.user, id);
            
            if (!isAuthorized) {
                results.push({ feederId: id, success: false, message: "Not authorized" });
                continue;
            }

            const feeder = await Feeder.findById(id);
            if (!feeder) {
                results.push({ feederId: id, success: false, message: "Feeder not found" });
                continue;
            }

            let statusDoc = await PowerStatus.findOne({ feeder: id });
            if (!statusDoc) {
                statusDoc = new PowerStatus({ 
                    status: finalStatus,
                    isActive, 
                    estimatedNextOutage, 
                    feeder: id,
                    updatedBy: req.user._id 
                });
            } else {
                statusDoc.status = finalStatus;
                statusDoc.isActive = isActive;
                if (estimatedNextOutage !== undefined) statusDoc.estimatedNextOutage = estimatedNextOutage;
                statusDoc.lastUpdated = Date.now();
                statusDoc.updatedBy = req.user._id;
            }
            await statusDoc.save();

            // Record this status change in the power log for history
            const log = new PowerLog({
                feeder: id,
                feederName: feeder.name,
                status: finalStatus,
                updatedBy: req.user._id
            });
            await log.save();

            // Emit real-time update to all connected clients
            if (req.io) {
                req.io.emit("powerStatusUpdated", {
                    feederId: id,
                    feederName: feeder.name,
                    status: finalStatus,
                    isActive,
                    estimatedNextOutage,
                    lastUpdated: statusDoc.lastUpdated
                });
            }

            // Trigger notifications to users in this feeder
            const title = "Power Status Update";
            let message = "";
            
            if (finalStatus === "on") {
                message = `Electricity has been restored in your area (${feeder.name}). Expected until: ${estimatedNextOutage}`;
            } else if (finalStatus === "off") {
                message = `Electricity has been disconnected in your area (${feeder.name}). Expected back: ${estimatedNextOutage}`;
            } else if (finalStatus === "maintenance") {
                message = `Maintenance in progress in your area (${feeder.name}). Engineers are working on the issue. Expected completion: ${estimatedNextOutage}`;
            }

            await notifyArea({
                feeder: id,
                title,
                message,
                io: req.io,
                sender: req.user._id,
                isCustom: false
            });

            results.push({ feederId: id, success: true, status });
        }

        const failed = results.filter(r => !r.success);
        if (failed.length === targetFeederIds.length) {
            return res.status(403).json({ message: "Failed to update any feeders", results });
        }

        res.json({ 
            message: failed.length > 0 ? "Power status partially updated" : "Power status updated successfully", 
            results 
        });
    } catch (error) {
        console.error("Error in update power status:", error);
        res.status(500).json({ message: "Error updating power status", error: error.message });
    }
});

// Route for Admin/Super Admin to send custom notifications
router.post("/send-notification", authorize("super-admin", "admin"), async (req, res) => {
    const { message, state, lga, ward, feeder } = req.body;

    if (!message) {
        return res.status(400).json({ message: "Message is required" });
    }

    try {
        // If it's a regular admin, ensure they are sending to their assigned feeder
        if (req.user.role === "admin") {
            if (!feeder) {
                return res.status(400).json({ message: "Feeder is required for admin notifications" });
            }
            const isAuthorized = await hasFeederAccess(req.user, feeder);
            if (!isAuthorized) {
                return res.status(403).json({ message: "Not authorized to send notifications to this feeder" });
            }
        }

        await notifyArea({
            state,
            lga,
            ward,
            feeder,
            title: "Announcement",
            message,
            io: req.io,
            sender: req.user._id,
            isCustom: true
        });

        res.json({ message: "Notification sent successfully" });
    } catch (error) {
        console.error("Error sending custom notification:", error);
        res.status(500).json({ message: "Error sending notification", error: error.message });
    }
});

export default router;




