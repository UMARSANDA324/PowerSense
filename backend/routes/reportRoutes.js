import express from "express";
import { createReport, getAllReports, getMyReports, updateReportStatus } from "../controllers/reportController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/rolemiddleware.js";
import Report from "../models/Report.js";

const router = express.Router();

// DEV ONLY: List all reports without auth for testing
router.get("/dev-list/all", async (req, res) => {
    try {
        const allReports = await Report.find().sort({ createdAt: -1 }).limit(20);
        res.json({ count: allReports.length, reports: allReports });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Public — anyone can submit a report
router.post("/", createReport);

// Private — logged-in user's own reports
router.get("/my", protect, getMyReports);

// Admin — get all reports
router.get("/", protect, authorize("admin", "super-admin"), getAllReports);

// Admin — update status
router.put("/:id/status", protect, authorize("admin", "super-admin"), updateReportStatus);

export default router;
