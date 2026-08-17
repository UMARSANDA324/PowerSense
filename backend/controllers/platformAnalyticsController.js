import { getPlatformDashboardAnalytics, getPlatformDashboardMetrics, getPlatformDashboardOverview, getGlobalCompanyRanking, getPlatformCoverageMap, getGlobalAiInsights, getPlatformHealthSnapshot, getRecentPlatformActivity, getGlobalSearch, getCrossCompanyComparison, getExecutiveKpis, getTrendAnalysis, getGlobalAnalytics } from "../services/platformAnalyticsService.js";
import { getExecutiveIntelligence } from "../services/executiveIntelligenceService.js";
import { trackAnalyticsEvent, getReportAnalyticsService, getGrowthAnalyticsService } from "../services/analyticsTrackingService.js";

export const getGlobalAnalyticsController = async (req, res) => {
  try {
    const data = await getGlobalAnalytics(req.query);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("[Platform Analytics] Global analytics error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to load global analytics" });
  }
};

export const getExecutiveIntelligenceController = async (req, res) => {
  try {
    const data = await getExecutiveIntelligence();
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("[Platform Analytics] Executive intelligence error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to load executive intelligence" });
  }
};

export const getPlatformDashboardOverviewController = async (req, res) => {
  try {
    const data = await getPlatformDashboardOverview();
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("[Platform Analytics] Dashboard overview error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to load platform dashboard overview" });
  }
};

export const getPlatformDashboardController = async (req, res) => {
  try {
    const data = await getPlatformDashboardAnalytics(req.query);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("[Platform Analytics] Dashboard error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to load platform dashboard" });
  }
};

export const getPlatformMetricsController = async (req, res) => {
  try {
    const data = await getPlatformDashboardMetrics();
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("[Platform Analytics] Metrics error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to load platform metrics" });
  }
};

export const getGlobalRankingController = async (req, res) => {
  try {
    const data = await getGlobalCompanyRanking();
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("[Platform Analytics] Ranking error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to load company rankings" });
  }
};

export const getCoverageMapController = async (req, res) => {
  try {
    const data = await getPlatformCoverageMap();
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("[Platform Analytics] Coverage error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to load platform coverage" });
  }
};

export const getGlobalAiInsightsController = async (req, res) => {
  try {
    const data = await getGlobalAiInsights();
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("[Platform Analytics] AI insights error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to load AI insights" });
  }
};

export const getPlatformHealthController = async (req, res) => {
  try {
    const data = await getPlatformHealthSnapshot();
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("[Platform Analytics] Health error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to load platform health" });
  }
};

export const getActivityTimelineController = async (req, res) => {
  try {
    const data = await getRecentPlatformActivity(req.query);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("[Platform Analytics] Timeline error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to load platform activity" });
  }
};

export const getGlobalSearchController = async (req, res) => {
  try {
    const { q } = req.query;
    const data = await getGlobalSearch(q, req.query);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("[Platform Analytics] Search error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to search platform data" });
  }
};

export const getComparisonController = async (req, res) => {
  try {
    const companyIds = (req.query.companyIds || "").split(",").filter(Boolean);
    const data = await getCrossCompanyComparison(companyIds);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("[Platform Analytics] Comparison error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to compare companies" });
  }
};

export const getExecutiveKpisController = async (req, res) => {
  try {
    const data = await getExecutiveKpis();
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("[Platform Analytics] KPI error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to load executive KPIs" });
  }
};

export const getTrendAnalysisController = async (req, res) => {
  try {
    const data = await getTrendAnalysis(req.query);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("[Platform Analytics] Trend analysis error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to load trend analysis" });
  }
};

export const trackAnalyticsEventController = async (req, res) => {
  try {
    const { eventName, feature, sessionId, metadata } = req.body;
    if (!eventName) {
      return res.status(400).json({ success: false, message: "eventName is required" });
    }

    const event = await trackAnalyticsEvent({
      eventName,
      feature: feature || "report",
      userId: req.user?._id || null,
      companyId: req.user?.companyId || null,
      role: req.user?.role || null,
      state: req.user?.state || null,
      sessionId: sessionId || null,
      metadata: metadata || {}
    });

    res.status(200).json({ success: true, eventId: event?._id || null });
  } catch (error) {
    console.error("[Platform Analytics] Event tracking controller error:", error);
    res.status(200).json({ success: false, message: "Event logged with fallback" });
  }
};

export const getReportAnalyticsController = async (req, res) => {
  try {
    const data = await getReportAnalyticsService(req.query, req.user);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("[Platform Analytics] Report analytics error:", error);
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, message: error.message || "Failed to load report analytics" });
  }
};

export const getGrowthAnalyticsController = async (req, res) => {
  try {
    const data = await getGrowthAnalyticsService(req.query, req.user);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("[Platform Analytics] Growth analytics error:", error);
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, message: error.message || "Failed to load growth analytics" });
  }
};
