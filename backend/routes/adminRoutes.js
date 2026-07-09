
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
    getProfile,
    getInjectionSubstations
} from "../controllers/adminController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/rolemiddleware.js";
import PowerStatus from "../models/PowerStatus.js";
import { hasFeederAccess } from "../utils/feederAccess.js";
import Feeder from "../models/Location/Feeder.js";
import { notifyArea } from "../utils/notificationHelper.js";
import PowerLog from "../models/PowerLog.js";
import Reminder from "../models/Reminder.js";

const router = express.Router();

// All admin routes are protected
router.use(protect);

router.get("/test", authorize("super-admin", "admin"), adminTest);
router.get("/profile", getProfile);
router.get("/injection-substations", authorize("super-admin", "admin"), getInjectionSubstations);
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
    const {
        status,
        isActive: legacyIsActive,
        estimatedNextOutage,
        expectedOutageTime,
        expectedRestoreTime,
        maintenanceStart,
        maintenanceEnd,
        reason,
        maintenanceReason,
        feederId,
        feederIds
    } = req.body;

    const parseDate = (value) => {
        if (!value) return null;
        const date = new Date(value);
        return isNaN(date.getTime()) ? null : date;
    };

    // Determine the status. Priority: status > legacyIsActive
    let finalStatus = status;
    if (!finalStatus && legacyIsActive !== undefined) {
        finalStatus = legacyIsActive ? "on" : "off";
    }

    if (!finalStatus) {
        return res.status(400).json({ message: "Status is required (on, off, or maintenance)" });
    }

    const isActive = finalStatus === "on";
    const parsedOutageTime = parseDate(expectedOutageTime || estimatedNextOutage);
    const parsedRestoreTime = parseDate(expectedRestoreTime || estimatedNextOutage);
    const parsedMaintenanceStart = parseDate(maintenanceStart);
    const parsedMaintenanceEnd = parseDate(maintenanceEnd);
    const scheduleReason = reason || maintenanceReason || "Scheduled maintenance";

    if ((finalStatus === "off" || finalStatus === "maintenance") && !parsedRestoreTime) {
        return res.status(400).json({ message: "Expected restoration or completion time is required for outages and maintenance." });
    }

    const targetFeederIds = feederIds || (feederId ? [feederId] : []);
    if (targetFeederIds.length === 0) {
        return res.status(400).json({ message: "At least one Feeder ID is required" });
    }

    if (targetFeederIds.length > 5) {
        return res.status(400).json({ message: "Cannot control more than 5 feeders at once" });
    }

    try {
        const results = [];

        for (const id of targetFeederIds) {
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
                    feeder: id,
                    updatedBy: req.user._id,
                    reason: scheduleReason,
                    expectedOutageTime: parsedOutageTime,
                    expectedRestoreTime: parsedRestoreTime,
                    maintenanceStart: parsedMaintenanceStart || (finalStatus === "maintenance" ? new Date() : null),
                    maintenanceEnd: parsedMaintenanceEnd || (finalStatus === "maintenance" ? parsedRestoreTime : null),
                    estimatedNextOutage: parsedRestoreTime || parsedOutageTime || null,
                    maintenanceReason: scheduleReason
                });
            } else {
                statusDoc.status = finalStatus;
                statusDoc.isActive = isActive;
                statusDoc.reason = scheduleReason;
                statusDoc.expectedOutageTime = parsedOutageTime;
                statusDoc.expectedRestoreTime = parsedRestoreTime;
                statusDoc.maintenanceStart = parsedMaintenanceStart || (finalStatus === "maintenance" ? statusDoc.maintenanceStart || new Date() : null);
                statusDoc.maintenanceEnd = parsedMaintenanceEnd || (finalStatus === "maintenance" ? parsedRestoreTime : null);
                statusDoc.estimatedNextOutage = parsedRestoreTime || parsedOutageTime || null;
                statusDoc.maintenanceReason = scheduleReason;
                statusDoc.lastUpdated = Date.now();
                statusDoc.updatedBy = req.user._id;
            }

            await statusDoc.save();

            // Cancel any existing pending reminders for this feeder
            await Reminder.updateMany(
                { feeder: id, isSent: false, isCancelled: false },
                { isCancelled: true }
            );

            // Schedule new reminders for upcoming events
            const remindersToCreate = [];

            // Schedule power off reminder if expectedOutageTime exists (10 mins before)
            if (parsedOutageTime) {
                const reminderTime = new Date(parsedOutageTime.getTime() - 10 * 60 * 1000);
                if (reminderTime > new Date()) {
                    remindersToCreate.push({
                        feeder: id,
                        feederName: feeder.name,
                        reminderType: "power_off",
                        scheduledTime: reminderTime,
                        reason: scheduleReason
                    });
                }
            }

            // Schedule power on reminder if expectedRestoreTime exists (10 mins before)
            if (parsedRestoreTime) {
                const reminderTime = new Date(parsedRestoreTime.getTime() - 10 * 60 * 1000);
                if (reminderTime > new Date()) {
                    remindersToCreate.push({
                        feeder: id,
                        feederName: feeder.name,
                        reminderType: "power_on",
                        scheduledTime: reminderTime,
                        reason: scheduleReason
                    });
                }
            }

            // Schedule maintenance start/end reminders if applicable
            if (finalStatus === "maintenance") {
                if (parsedMaintenanceStart) {
                    const startReminderTime = new Date(parsedMaintenanceStart.getTime() - 10 * 60 * 1000);
                    if (startReminderTime > new Date()) {
                        remindersToCreate.push({
                            feeder: id,
                            feederName: feeder.name,
                            reminderType: "maintenance_start",
                            scheduledTime: startReminderTime,
                            reason: scheduleReason
                        });
                    }
                }
                if (parsedMaintenanceEnd) {
                    const endReminderTime = new Date(parsedMaintenanceEnd.getTime() - 10 * 60 * 1000);
                    if (endReminderTime > new Date()) {
                        remindersToCreate.push({
                            feeder: id,
                            feederName: feeder.name,
                            reminderType: "maintenance_end",
                            scheduledTime: endReminderTime,
                            reason: scheduleReason
                        });
                    }
                }
            }

            if (remindersToCreate.length > 0) {
                await Reminder.insertMany(remindersToCreate);
                console.log(`[Admin] Scheduled ${remindersToCreate.length} reminder(s) for feeder ${feeder.name}`);
            }

            // Determine event type based on status and reason
            let eventType = null;
            if (finalStatus === "on") {
                eventType = "power_restored";
            } else if (finalStatus === "off") {
                eventType = "power_outage";
            } else if (finalStatus === "maintenance") {
                // Check reason to determine scheduled vs emergency
                if (scheduleReason && (scheduleReason.toLowerCase().includes("emergency") || scheduleReason.toLowerCase().includes("urgent"))) {
                    eventType = "emergency_maintenance";
                } else {
                    eventType = "scheduled_maintenance";
                }
            }

            const log = new PowerLog({
                feeder: id,
                feederName: feeder.name,
                status: finalStatus,
                eventType,
                reason: scheduleReason,
                updatedBy: req.user._id
            });
            await log.save();

            if (req.io) {
                req.io.emit("powerStatusUpdated", {
                    feederId: id,
                    feederName: feeder.name,
                    status: finalStatus,
                    isActive,
                    expectedOutageTime: statusDoc.expectedOutageTime,
                    expectedRestoreTime: statusDoc.expectedRestoreTime,
                    maintenanceStart: statusDoc.maintenanceStart,
                    maintenanceEnd: statusDoc.maintenanceEnd,
                    reason: statusDoc.reason,
                    updatedBy: statusDoc.updatedBy,
                    lastUpdated: statusDoc.lastUpdated
                });
            }

            const title = "Power Status Update";
            let message = "";
            if (finalStatus === "on") {
                message = `Electricity is available in your area (${feeder.name}). Next outage scheduled for: ${parsedOutageTime ? parsedOutageTime.toISOString() : "TBD"}`;
            } else if (finalStatus === "off") {
                message = `Electricity is disrupted in your area (${feeder.name}). Expected restoration: ${parsedRestoreTime.toISOString()}`;
            } else if (finalStatus === "maintenance") {
                message = `Maintenance is in progress in your area (${feeder.name}). Expected completion: ${parsedRestoreTime.toISOString()}`;
            }

            await notifyArea({
                feeder: id,
                title,
                message,
                io: req.io,
                sender: req.user._id,
                isCustom: false
            });

            results.push({ feederId: id, success: true, status: finalStatus });
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




