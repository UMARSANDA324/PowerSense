import express from "express";
import {
    sendNotification,
    getUserNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
} from "../controllers/notificationController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/rolemiddleware.js";

const router = express.Router();

router.get("/", protect, getUserNotifications);
router.post("/send", protect, authorize("admin", "super-admin"), sendNotification);
router.put("/read-all", protect, markAllNotificationsAsRead);
router.put("/:id/read", protect, markNotificationAsRead);

export default router;
