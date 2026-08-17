import Report from "../models/Report.js";
import Notification from "../models/Notification.js";
import User from "../models/UserModel.js";
import Feeder from "../models/Location/Feeder.js";
import { hasFeederAccess, getAccessibleFeeders, getFeederQuery } from "../utils/feederAccess.js";
import { sendBulkNotifications } from "../utils/notificationHelper.js";
import { analyzeReportWithAI } from "../services/aiService.js";
import { resolveTenantIdFromUser, getDefaultCompany } from "../services/tenantResolver.js";
import { publishPlatformEvent } from "../services/platformEventDispatcher.js";
import { trackAnalyticsEvent } from "../services/analyticsTrackingService.js";

// Helper function to get company ID from request
async function getCompanyIdFromRequest(req) {
  // If user is platform-owner, return null (no filter)
  if (req.user && req.user.role === "platform-owner") {
    return null;
  }
  // Try req.user.companyId first
  if (req.user && req.user.companyId) {
    return req.user.companyId;
  }
  // Fallback to resolveTenantIdFromUser
  if (req.user && req.user._id) {
    return await resolveTenantIdFromUser(req.user._id);
  }
  // CRITICAL: Do NOT fall back to default company - this causes cross-tenant data leakage
  return null;
}

// Helper function to build tenant query filter
async function buildTenantQuery(req) {
  const companyId = await getCompanyIdFromRequest(req);
  if (companyId) {
    return { companyId };
  }
    return { companyId: null };
}

// @desc    Submit a new report
// @route   POST /api/reports
// @access  Private
export const createReport = async (req, res) => {
    const { fullName, phone, area, feeder, issueType, description } = req.body;

    if (!fullName || !phone || !area || !feeder || !issueType || !description) {
        trackAnalyticsEvent({
            eventName: "report_submission_failed",
            feature: "report",
            userId: req.user?._id || null,
            companyId: req.user?.companyId || null,
            role: req.user?.role || null,
            state: req.user?.state || null,
            metadata: { error: "Validation failed - missing required fields" }
        });
        return res.status(400).json({ message: "All fields are required." });
    }

    try {
        const companyId = req.user?.role === "platform-owner"
            ? req.body.companyId
            : await getCompanyIdFromRequest(req);
        if (!companyId) {
            trackAnalyticsEvent({
                eventName: "report_submission_failed",
                feature: "report",
                userId: req.user?._id || null,
                role: req.user?.role || null,
                state: req.user?.state || null,
                metadata: { error: "Missing company context" }
            });
            return res.status(400).json({ message: "Company context is required." });
        }
        const report = await Report.create({
            fullName,
            phone,
            area,
            feeder,
            issueType,
            description,
            user: req.user?._id || null,
            companyId
        });

        // --- AUTOMATED AI REPORT ANALYSIS ---
        try {
            await analyzeReportWithAI(report._id);
        } catch (aiErr) {
            console.error("[Report Controller] Auto AI Analysis error:", aiErr.message);
        }

        // Re-fetch the report to obtain AI-populated fields
        const populatedReport = await Report.findById(report._id);

        publishPlatformEvent({
            type: "report.created",
            companyId: populatedReport.companyId,
            data: { report: { _id: populatedReport._id, issueType: populatedReport.issueType, status: populatedReport.status, severity: populatedReport.severity } }
        });

        // --- PRODUCT ANALYTICS EVENT TRACKING ---
        trackAnalyticsEvent({
            eventName: "report_created",
            feature: "report",
            userId: req.user?._id || null,
            companyId: populatedReport.companyId,
            role: req.user?.role || null,
            state: req.user?.state || null,
            metadata: { reportId: populatedReport._id, issueType: populatedReport.issueType }
        });

        // --- REAL-TIME EMISSION TO ADMINS ---
        if (req.io) {
            req.io.emit("newReport", populatedReport);
            req.io.emit("reportAnalyzed", populatedReport);
        }

        // --- REAL-TIME NOTIFICATIONS TO ADMIN & SUPER ADMIN ---
        
        // 1. Find the feeder object to get its ID if we only have the name
        const feederObj = await Feeder.findOne({ name: feeder });
        const feederId = feederObj ? feederObj._id : null;

        // 2. Find the Admin(s) for this feeder and all Super Admins
        // CRITICAL: Apply tenant filtering to prevent cross-tenant notifications
        const baseFilter = {
            $or: [
                { role: "super-admin" },
                { role: "company-super-admin" },
                { role: "admin", assignedFeeders: feederId }
            ],
            notificationPreference: { $ne: "off" }
        };
        
        // Only filter by companyId if user is not platform owner
        if (req.user?.role !== 'platform-owner') {
            if (req.user?.companyId) {
                baseFilter.companyId = req.user.companyId;
            } else {
                // If no companyId and not platform owner, find no one
                baseFilter.companyId = null;
            }
        }
        
        const admins = await User.find(baseFilter).select("_id notificationPreference email phone");

        if (admins.length > 0) {
            const adminIds = admins.map(a => a._id);
            const title = `New ${populatedReport.severity?.toUpperCase() || "Incident"} Report 🚨`;
            const message = `Issue: ${populatedReport.aiClassification || issueType} in ${area} (${feeder}). AI Summary: ${populatedReport.aiSummary || description}`;
            
            await sendBulkNotifications({
                userIds: adminIds,
                title,
                message,
                io: req.io,
                sender: req.user?._id || null,
                targetArea: { feeder: feederId, ward: area },
                isCustom: false
            });
        }

        res.status(201).json({ message: "Report submitted successfully.", report: populatedReport });
    } catch (error) {
        console.error("Error in createReport:", error);
        trackAnalyticsEvent({
            eventName: "report_submission_failed",
            feature: "report",
            userId: req.user?._id || null,
            companyId: req.user?.companyId || null,
            role: req.user?.role || null,
            state: req.user?.state || null,
            metadata: { error: error.message }
        });
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all reports
// @route   GET /api/reports
// @access  Private/Admin
export const getAllReports = async (req, res) => {
    try {
        const feederQuery = await getFeederQuery(req.user);
        const tenantQuery = await buildTenantQuery(req);
        const reports = await Report.find({ ...feederQuery, ...tenantQuery }).sort({ createdAt: -1 });
        res.json(reports);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get logged-in user's reports
// @route   GET /api/reports/my
// @access  Private
export const getMyReports = async (req, res) => {
    try {
        const reports = await Report.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.json(reports);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update report status (Admin only)
// @route   PUT /api/reports/:id/status
// @access  Private/Admin
export const updateReportStatus = async (req, res) => {
    const { status } = req.body;
    try {
        const report = await Report.findById(req.params.id);
        if (!report) return res.status(404).json({ message: "Report not found." });

        // Verify admin has access to this feeder
        const hasAccess = await hasFeederAccess(req.user, report.feeder);
        if (!hasAccess) {
            return res.status(403).json({ message: "You don't have access to this feeder." });
        }

        const oldStatus = report.status;
        report.status = status;
        await report.save();

        // If status is changed to Resolved, notify the user
        if (status === "Resolved" && oldStatus !== "Resolved" && report.user) {
            const user = await User.findById(report.user);
            if (user && user.notificationPreference !== "off") {
                await Notification.create({
                    user: user._id,
                    title: "Issue Resolved ✅",
                    message: `Your report regarding "${report.issueType}" in ${report.area} has been marked as resolved. Thank you for your patience!`,
                    method: user.notificationPreference,
                    companyId: report.companyId,
                });
            }
        }

        res.json({ message: "Report status updated.", report });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
