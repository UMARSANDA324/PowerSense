import express from "express";
import {
    sendNotification,
    getUserNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
} from "../controllers/notificationController.js";
import { protect, admin } from "../verify_protection.js";

const router = express.Router();

router.get("/", protect, getUserNotifications);
router.post("/send", protect, admin, sendNotification);
router.put("/read-all", protect, markAllNotificationsAsRead);
router.put("/:id/read", protect, markNotificationAsRead);

export default router;
