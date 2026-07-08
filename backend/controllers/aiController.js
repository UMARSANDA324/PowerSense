import asyncHandler from "express-async-handler";
import { analyzeReportWithAI, chatAssistant, getAnalyticsDashboardData } from "../services/aiService.js";

// @desc Analyze a report using AI
// @route POST /api/ai/analyze-report/:id
// @access Protected
export const analyzeReport = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await analyzeReportWithAI(id);
  res.json({ success: true, result });
});

// @desc Chat assistant
// @route POST /api/ai/assistant
// @access Protected (optional)
export const assistant = asyncHandler(async (req, res) => {
  const { question } = req.body;
  const context = req.body.context || {};
  const result = await chatAssistant({ userQuery: question, context, user: req.user });
  res.json({ success: true, result });
});

// @desc Get AI Analytics Dashboard Data
// @route GET /api/ai/analytics
// @access Protected
export const getAnalytics = asyncHandler(async (req, res) => {
  // Optional query range: today | week | month (defaults to last 7 days)
  const range = req.query.range || "week";
  const data = await getAnalyticsDashboardData({ range, user: req.user });
  res.json({ success: true, data });
});

export default { analyzeReport, assistant, getAnalytics };
