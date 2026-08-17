import asyncHandler from 'express-async-handler';
import {
  getExecutiveDashboard,
  getExecutiveAssistantInsights,
  getPredictivePlatformAnalytics,
  getAutomationBlueprint,
  getEnterpriseReportBundle,
  getExpansionReadiness,
  getApiCenterOverview,
  getPlatformIntelligenceScore,
  getDecisionCenter,
  getFutureIntegrationBlueprint
} from '../services/enterpriseIntelligenceService.js';

export const getExecutiveDashboardController = asyncHandler(async (req, res) => {
  const dashboard = await getExecutiveDashboard();
  res.json({ success: true, data: dashboard });
});

export const getExecutiveAssistantController = asyncHandler(async (req, res) => {
  const query = req.query.q || '';
  const assistant = await getExecutiveAssistantInsights(query);
  res.json({ success: true, data: assistant });
});

export const getPredictiveAnalyticsController = asyncHandler(async (req, res) => {
  const analytics = await getPredictivePlatformAnalytics();
  res.json({ success: true, data: analytics });
});

export const getAutomationController = asyncHandler(async (req, res) => {
  const automation = await getAutomationBlueprint();
  res.json({ success: true, data: automation });
});

export const getReportsController = asyncHandler(async (req, res) => {
  const bundle = await getEnterpriseReportBundle();
  res.json({ success: true, data: bundle });
});

export const getExpansionController = asyncHandler(async (req, res) => {
  const readiness = await getExpansionReadiness();
  res.json({ success: true, data: readiness });
});

export const getApiCenterController = asyncHandler(async (req, res) => {
  const overview = await getApiCenterOverview();
  res.json({ success: true, data: overview });
});

export const getIntelligenceScoreController = asyncHandler(async (req, res) => {
  const score = await getPlatformIntelligenceScore();
  res.json({ success: true, data: score });
});

export const getDecisionCenterController = asyncHandler(async (req, res) => {
  const center = await getDecisionCenter();
  res.json({ success: true, data: center });
});

export const getFutureIntegrationsController = asyncHandler(async (req, res) => {
  const blueprint = await getFutureIntegrationBlueprint();
  res.json({ success: true, data: blueprint });
});
