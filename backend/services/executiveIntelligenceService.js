import Company from "../models/Company.js";
import User from "../models/UserModel.js";
import Report from "../models/Report.js";
import Outage from "../models/Outage.js";
import Prediction from "../models/Prediction.js";
import Feeder from "../models/Location/Feeder.js";
import LGA from "../models/Location/LGA.js";
import { getPlatformDashboardMetrics, getPlatformMissionControl, getTrendAnalysis } from "./platformAnalyticsService.js";
import { generateExecutiveNarrative } from "./aiService.js";

const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

const getCached = async (key, build) => {
  const current = cache.get(key);
  if (current?.data && Date.now() - current.updatedAt < CACHE_TTL_MS) return current.data;
  if (current?.promise) return current.promise;

  const promise = build().then((data) => {
    cache.set(key, { data, updatedAt: Date.now(), promise: null });
    return data;
  }).catch((error) => {
    cache.delete(key);
    throw error;
  });
  cache.set(key, { data: current?.data || null, updatedAt: current?.updatedAt || 0, promise });
  return promise;
};

export const invalidateExecutiveIntelligenceCache = () => cache.clear();

const countByCompany = (rows) => new Map(rows.map((row) => [row._id?.toString(), row.count]));

const getCompanyHealth = ({ company, adminCount, userCount, feederCount, lgaCount, reportCount }) => {
  let score = 100;
  const factors = [];
  if (company.status !== "active") { score -= 20; factors.push("inactive company"); }
  if (adminCount === 0) { score -= 25; factors.push("no Super Admin"); }
  if (feederCount === 0) { score -= 20; factors.push("no feeders"); }
  if (lgaCount === 0) { score -= 15; factors.push("no LGAs"); }
  if (userCount === 0) { score -= 10; factors.push("no registered users"); }
  if (reportCount === 0) { score -= 5; factors.push("no recent reports"); }
  return { score: Math.max(0, score), factors };
};

const severityForScore = (score) => score >= 85 ? "low" : score >= 65 ? "medium" : score >= 40 ? "high" : "critical";

export const buildExecutiveFallback = ({ metrics = {}, missionControl = {}, trends = {}, weeklyTrend = {} } = {}) => {
  const safeMetrics = {
    totalCompanies: 0,
    totalUsers: 0,
    totalReports: 0,
    ...metrics
  };
  const safeTrends = {
    companies: { current: 0, previous: 0, direction: "flat" },
    users: { current: 0, previous: 0, direction: "flat" },
    reports: { current: 0, previous: 0, direction: "flat" },
    ...trends
  };
  const riskScore = Math.max(0, Math.min(100, 82 - (safeMetrics.totalReports === 0 ? 8 : 0) - (safeMetrics.totalCompanies === 0 ? 6 : 0)));
  const summary = safeMetrics.totalCompanies || safeMetrics.totalUsers
    ? `Platform intelligence is running with a limited fallback dataset across ${safeMetrics.totalCompanies} companies and ${safeMetrics.totalUsers} users.`
    : "Platform intelligence is running with a limited fallback dataset while analytics refreshes.";

  const insights = [
    safeMetrics.totalReports > 0 ? `The platform currently has ${safeMetrics.totalReports} report${safeMetrics.totalReports === 1 ? "" : "s"} in the dataset.` : "No report activity was available during the fallback refresh.",
    safeMetrics.totalUsers > 0 ? `There are ${safeMetrics.totalUsers} user${safeMetrics.totalUsers === 1 ? "" : "s"} registered across the platform.` : "No user profile data was available during the fallback refresh.",
    "The dashboard is using safe fallback data while the live analytics service refreshes."
  ];

  const recommendations = [
    "Refresh the platform dashboard to retry the live intelligence collection.",
    "Check the platform metrics and scheduler health for any failing background jobs.",
    "Confirm database connectivity if the fallback dataset persists beyond a short refresh cycle."
  ];

  return {
    generatedAt: new Date().toISOString(),
    source: "fallback",
    summary,
    insights: insights.slice(0, 3),
    recommendations: recommendations.slice(0, 3),
    healthScore: {
      score: riskScore,
      deductions: [{ label: "fallback-data", value: Math.max(0, 100 - riskScore) }]
    },
    risks: [{
      id: "fallback-data",
      severity: "medium",
      message: "Executive intelligence is using a reduced fallback dataset.",
      recommendation: "Retry the analytics refresh and confirm the platform monitoring services are healthy."
    }],
    companies: [],
    trends: safeTrends,
    evidence: { weekly: weeklyTrend?.summary || {}, metrics: safeMetrics }
  };
};

const getTrendFacts = async () => {
  const now = new Date();
  const currentStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const previousStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const dateQuery = (start, end) => ({ createdAt: { $gte: start, $lt: end } });
  const [current, previous] = await Promise.all([
    Promise.all([Company.countDocuments(dateQuery(currentStart, now)), User.countDocuments(dateQuery(currentStart, now)), Report.countDocuments(dateQuery(currentStart, now))]),
    Promise.all([Company.countDocuments(dateQuery(previousStart, currentStart)), User.countDocuments(dateQuery(previousStart, currentStart)), Report.countDocuments(dateQuery(previousStart, currentStart))])
  ]);
  const toTrend = (currentValue, previousValue) => ({ current: currentValue, previous: previousValue, direction: currentValue > previousValue ? "up" : currentValue < previousValue ? "down" : "flat" });
  return { companies: toTrend(current[0], previous[0]), users: toTrend(current[1], previous[1]), reports: toTrend(current[2], previous[2]) };
};

const buildHeuristicNarrative = ({ metrics, risks, trends, healthScore }) => {
  const summary = healthScore >= 85
    ? "Platform health is strong, with no material executive risks detected."
    : healthScore >= 65
      ? `Platform health is watch-listed with ${risks.length} issue${risks.length === 1 ? "" : "s"} requiring attention.`
      : `Platform health is under pressure with ${risks.length} operational risk${risks.length === 1 ? "" : "s"} requiring action.`;
  const insights = [];
  if (trends.companies.current > 0) insights.push(`${trends.companies.current} compan${trends.companies.current === 1 ? "y" : "ies"} joined in the last seven days.`);
  if (trends.users.direction === "up") insights.push("User registrations increased compared with the previous seven-day period.");
  if (trends.reports.direction === "up") insights.push("Report activity increased compared with the previous seven-day period.");
  if (!insights.length) insights.push(`The platform currently supports ${metrics.totalCompanies} compan${metrics.totalCompanies === 1 ? "y" : "ies"}.`);

  const recommendations = [...new Set(risks.slice(0, 6).map((risk) => risk.recommendation))];
  return { source: "heuristic", summary, insights, recommendations };
};

export const getExecutiveIntelligence = async () => getCached("platform-executive-intelligence", async () => {
  try {
  const [metricsResult, missionControlResult, trendsResult, weeklyTrendResult, companiesResult, adminCountsResult, userCountsResult, feederCountsResult, lgaCountsResult, reportCountsResult] = await Promise.allSettled([
    getPlatformDashboardMetrics(),
    getPlatformMissionControl(),
    getTrendFacts(),
    getTrendAnalysis({ period: "week" }),
    Company.find({}).select("name code status createdAt").lean(),
    User.aggregate([{ $match: { role: { $in: ["company-super-admin", "super-admin"] } } }, { $group: { _id: "$companyId", count: { $sum: 1 } } }]),
    User.aggregate([{ $group: { _id: "$companyId", count: { $sum: 1 } } }]),
    Feeder.aggregate([{ $group: { _id: "$companyId", count: { $sum: 1 } } }]),
    LGA.aggregate([{ $group: { _id: "$companyId", count: { $sum: 1 } } }]),
    Report.aggregate([{ $group: { _id: "$companyId", count: { $sum: 1 } } }])
  ]);

  const metrics = metricsResult.status === "fulfilled" ? metricsResult.value : {};
  const missionControl = missionControlResult.status === "fulfilled" ? missionControlResult.value : {};
  const trends = trendsResult.status === "fulfilled" ? trendsResult.value : { companies: { current: 0, previous: 0, direction: "flat" }, users: { current: 0, previous: 0, direction: "flat" }, reports: { current: 0, previous: 0, direction: "flat" } };
  const weeklyTrend = weeklyTrendResult.status === "fulfilled" ? weeklyTrendResult.value : { summary: {} };
  const companies = companiesResult.status === "fulfilled" ? companiesResult.value : [];
  const adminCounts = adminCountsResult.status === "fulfilled" ? adminCountsResult.value : [];
  const userCounts = userCountsResult.status === "fulfilled" ? userCountsResult.value : [];
  const feederCounts = feederCountsResult.status === "fulfilled" ? feederCountsResult.value : [];
  const lgaCounts = lgaCountsResult.status === "fulfilled" ? lgaCountsResult.value : [];
  const reportCounts = reportCountsResult.status === "fulfilled" ? reportCountsResult.value : [];

  if (!companies.length && !metrics.totalCompanies && !metrics.totalUsers && !metrics.totalReports) {
    return buildExecutiveFallback({ metrics, missionControl, trends, weeklyTrend });
  }

  const adminMap = countByCompany(adminCounts);
  const userMap = countByCompany(userCounts);
  const feederMap = countByCompany(feederCounts);
  const lgaMap = countByCompany(lgaCounts);
  const reportMap = countByCompany(reportCounts);
  const companyHealth = companies.map((company) => {
    const id = company._id.toString();
    const health = getCompanyHealth({ company, adminCount: adminMap.get(id) || 0, userCount: userMap.get(id) || 0, feederCount: feederMap.get(id) || 0, lgaCount: lgaMap.get(id) || 0, reportCount: reportMap.get(id) || 0 });
    return { companyId: company._id, name: company.name, code: company.code, status: company.status, score: health.score, severity: severityForScore(health.score), factors: health.factors };
  });

  const risks = [];
  companyHealth.forEach((company) => {
    company.factors.forEach((factor) => {
      const severity = company.score < 40 ? "critical" : factor === "no Super Admin" || factor === "inactive company" ? "high" : "medium";
      const action = factor === "no Super Admin" ? `Assign a Super Admin to ${company.name}.` : factor === "no feeders" || factor === "no LGAs" ? `Configure operational resources for ${company.name}.` : factor === "inactive company" ? `Review the inactive status of ${company.name}.` : `Review platform adoption for ${company.name}.`;
      risks.push({ id: `${company.companyId}-${factor}`, severity, companyId: company.companyId, companyName: company.name, message: `${company.name} has ${factor}.`, recommendation: action });
    });
  });
  if (trends.reports.current > trends.reports.previous * 2 && trends.reports.current >= 5) risks.push({ id: "report-spike", severity: "high", message: "Report volume has more than doubled week over week.", recommendation: "Review the companies and feeders contributing to the report spike." });
  if (missionControl.monitoring?.ai?.status !== "Healthy") risks.push({ id: "prediction-engine", severity: "high", message: "Prediction engine or scheduler is not healthy.", recommendation: "Review prediction scheduler status and recent errors." });
  if (missionControl.monitoring?.notifications?.status !== "Healthy") risks.push({ id: "notifications", severity: "medium", message: "Notification service health is degraded.", recommendation: "Review notification delivery configuration and queue status." });

  const deductions = [
    [companyHealth.filter((item) => item.score < 65).length * 4, "company health gaps"],
    [risks.filter((risk) => risk.severity === "high").length * 5, "high-severity risks"],
    [missionControl.monitoring?.summary?.status === "Healthy" ? 0 : 10, "platform monitoring status"]
  ];
  const healthScore = Math.max(0, Math.min(100, 100 - deductions.reduce((sum, [value]) => sum + value, 0)));
  const facts = { metrics, healthScore, risks: risks.slice(0, 12), trends, weeklyTrend: weeklyTrend.summary };
  const heuristic = buildHeuristicNarrative({ metrics, risks, trends, healthScore });
  const narrative = (await generateExecutiveNarrative(facts).catch(() => null)) || heuristic;

  return { generatedAt: new Date().toISOString(), source: narrative.source, summary: narrative.summary, insights: narrative.insights, recommendations: narrative.recommendations, healthScore: { score: healthScore, deductions }, risks: risks.slice(0, 20), companies: companyHealth.sort((a, b) => a.score - b.score).slice(0, 20), trends, evidence: { weekly: weeklyTrend.summary, metrics } };
  } catch (err) {
    console.error("[Executive Intelligence] Unexpected error, returning fallback:", err);
    return buildExecutiveFallback({});
  }
});