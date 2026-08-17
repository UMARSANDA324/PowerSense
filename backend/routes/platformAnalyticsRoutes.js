import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/rolemiddleware.js";
import {
  getPlatformDashboardController,
  getPlatformDashboardOverviewController,
  getPlatformMetricsController,
  getGlobalRankingController,
  getCoverageMapController,
  getGlobalAiInsightsController,
  getPlatformHealthController,
  getActivityTimelineController,
  getGlobalSearchController,
  getComparisonController,
  getExecutiveKpisController,
  getTrendAnalysisController,
  getExecutiveIntelligenceController,
  getGlobalAnalyticsController,
  trackAnalyticsEventController,
  getReportAnalyticsController,
  getGrowthAnalyticsController
} from "../controllers/platformAnalyticsController.js";

const router = express.Router();
const platformOwnerOnly = authorize("platform-owner");
const analyticsAccessRoles = authorize("platform-owner", "company-super-admin", "super-admin", "admin", "regional-admin");
const growthAccessRoles = authorize("platform-owner", "company-super-admin", "super-admin");

// Product Analytics Event Ingestion (Authenticated Users)
router.post("/events", protect, trackAnalyticsEventController);

// Report Product Analytics Query API (Platform Owner only)
router.get("/reports", protect, platformOwnerOnly, getReportAnalyticsController);

// Product Growth / AARRR Analytics (Platform Owner + Super Admin)
router.get("/growth", protect, growthAccessRoles, getGrowthAnalyticsController);

router.get("/dashboard", protect, platformOwnerOnly, getPlatformDashboardController);
router.get("/dashboard/overview", protect, platformOwnerOnly, getPlatformDashboardOverviewController);
router.get("/metrics", protect, platformOwnerOnly, getPlatformMetricsController);
router.get("/rankings", protect, platformOwnerOnly, getGlobalRankingController);
router.get("/coverage", protect, platformOwnerOnly, getCoverageMapController);
router.get("/ai-insights", protect, platformOwnerOnly, getGlobalAiInsightsController);
router.get("/health", protect, platformOwnerOnly, getPlatformHealthController);
router.get("/timeline", protect, platformOwnerOnly, getActivityTimelineController);
router.get("/search", protect, platformOwnerOnly, getGlobalSearchController);
router.get("/compare", protect, platformOwnerOnly, getComparisonController);
router.get("/kpis", protect, platformOwnerOnly, getExecutiveKpisController);
router.get("/trends", protect, platformOwnerOnly, getTrendAnalysisController);
router.get("/executive-intelligence", protect, platformOwnerOnly, getExecutiveIntelligenceController);
router.get("/global", protect, platformOwnerOnly, getGlobalAnalyticsController);

export default router;
