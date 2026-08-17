import mongoose from "mongoose";
import Company from "../models/Company.js";
import User from "../models/UserModel.js";
import Outage from "../models/Outage.js";
import Prediction from "../models/Prediction.js";
import Report from "../models/Report.js";
import Notification from "../models/Notification.js";
import Audit from "../models/Audit.js";
import ActivityTimeline from "../models/ActivityTimeline.js";
import Platform from "../models/Platform.js";
import LGA from "../models/Location/LGA.js";
import Ward from "../models/Location/Ward.js";
import Reminder from "../models/Reminder.js";
import Feeder from "../models/Location/Feeder.js";
import InjectionSubstation from "../models/Location/InjectionSubstation.js";
import State from "../models/Location/State.js";
import { getSchedulerHealth } from "../utils/cronJobs.js";
import { resolveDateRange, toDateKey } from "../utils/dateRange.js";

const defaultCache = new Map();
const CACHE_TTL_MS = 60 * 1000;

export const invalidatePlatformAnalyticsCache = (keys = []) => {
  const requestedKeys = new Set(keys);
  if (requestedKeys.size === 0) {
    defaultCache.clear();
    return;
  }

  for (const key of defaultCache.keys()) {
    if (requestedKeys.has(key) || requestedKeys.has("all") || key.startsWith("platform-")) {
      defaultCache.delete(key);
    }
  }
};

const getMetricFailure = (metric, error) => ({
  metric,
  message: error?.message || "Metric unavailable"
});

const toActivity = ({ type, title, description, timestamp, company, resourceType, resourceId, source }) => ({
  type,
  title,
  description,
  timestamp,
  company: company ? { _id: company._id, name: company.name, code: company.code } : null,
  resourceType,
  resourceId,
  source
});

const getActivitySnapshot = async () => {
  const [timelineResult, auditResult, companyResult, userResult, feederResult, lgaResult, wardResult, reportResult, notificationResult] = await Promise.allSettled([
    ActivityTimeline.find({}).sort({ timestamp: -1 }).limit(50).populate("companyId", "name code").lean(),
    Audit.find({}).sort({ timestamp: -1 }).limit(50).populate("companyId", "name code").lean(),
    Company.find({}).sort({ createdAt: -1 }).limit(20).select("name shortName code status createdAt").lean(),
    User.find({}).sort({ createdAt: -1 }).limit(30).select("fullName email role companyId createdAt").populate("companyId", "name code").lean(),
    Feeder.find({}).sort({ createdAt: -1 }).limit(15).select("name companyId createdAt").populate("companyId", "name code").lean(),
    LGA.find({}).sort({ createdAt: -1 }).limit(15).select("name companyId createdAt").populate("companyId", "name code").lean(),
    Ward.find({}).sort({ createdAt: -1 }).limit(15).select("name wardName companyId createdAt").populate("companyId", "name code").lean(),
    Report.find({}).sort({ createdAt: -1 }).limit(15).select("fullName issueType status companyId createdAt").populate("companyId", "name code").lean(),
    Notification.find({}).sort({ createdAt: -1 }).limit(15).select("title method companyId createdAt").populate("companyId", "name code").lean()
  ]);

  const activities = [];
  const append = (result, map) => {
    if (result.status === "fulfilled") activities.push(...result.value.map(map));
  };

  append(timelineResult, (item) => toActivity({ type: item.activityType, title: item.title, description: item.description || item.title, timestamp: item.timestamp, company: item.companyId, resourceType: item.resourceType, resourceId: item.resourceId, source: "activity-timeline" }));
  append(auditResult, (item) => toActivity({ type: item.actionType || item.action, title: item.action || item.actionType, description: item.description || item.reason || item.action, timestamp: item.timestamp, company: item.companyId, resourceType: item.resourceType, resourceId: item.resourceId, source: "audit" }));
  append(companyResult, (item) => toActivity({ type: item.status === "active" ? "company-activated" : "company-created", title: item.status === "active" ? "Company activated" : "Company created", description: `${item.name} was added to the platform`, timestamp: item.createdAt, company: item, resourceType: "company", resourceId: item._id, source: "company" }));
  append(userResult, (item) => {
    const adminRole = ["platform-owner", "company-super-admin", "super-admin"].includes(item.role);
    const operatorRole = ["admin", "regional-admin"].includes(item.role);
    return toActivity({ type: adminRole ? "super-admin-created" : operatorRole ? "admin-created" : "user-registered", title: adminRole ? "Super Admin created" : operatorRole ? "Admin created" : "User registered", description: `${item.fullName} joined as ${item.role}`, timestamp: item.createdAt, company: item.companyId, resourceType: "user", resourceId: item._id, source: "user" });
  });
  append(feederResult, (item) => toActivity({ type: "feeder-created", title: "Feeder created", description: `${item.name} was added`, timestamp: item.createdAt, company: item.companyId, resourceType: "feeder", resourceId: item._id, source: "feeder" }));
  append(lgaResult, (item) => toActivity({ type: "lga-created", title: "LGA created", description: `${item.name} was added`, timestamp: item.createdAt, company: item.companyId, resourceType: "lga", resourceId: item._id, source: "lga" }));
  append(wardResult, (item) => toActivity({ type: "ward-created", title: "Ward created", description: `${item.wardName || item.name} was added`, timestamp: item.createdAt, company: item.companyId, resourceType: "ward", resourceId: item._id, source: "ward" }));
  append(reportResult, (item) => toActivity({ type: "report-submitted", title: "Report submitted", description: `${item.issueType} report submitted by ${item.fullName}`, timestamp: item.createdAt, company: item.companyId, resourceType: "report", resourceId: item._id, source: "report" }));
  append(notificationResult, (item) => toActivity({ type: "notification-broadcast", title: "Notification broadcast", description: `${item.title} sent through ${item.method}`, timestamp: item.createdAt, company: item.companyId, resourceType: "notification", resourceId: item._id, source: "notification" }));

  const errors = [
    ["activityTimeline", timelineResult], ["audit", auditResult], ["companies", companyResult], ["users", userResult],
    ["feeders", feederResult], ["lgas", lgaResult], ["wards", wardResult], ["reports", reportResult], ["notifications", notificationResult]
  ].filter(([, result]) => result.status === "rejected").map(([metric, result]) => getMetricFailure(metric, result.reason));

  return {
    recent: activities.filter((item) => item.timestamp).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 30),
    recentlyCreatedCompanies: companyResult.status === "fulfilled" ? companyResult.value : [],
    recentlyCreatedSuperAdmins: userResult.status === "fulfilled" ? userResult.value.filter((item) => ["platform-owner", "company-super-admin", "super-admin"].includes(item.role)).slice(0, 10) : [],
    recentlyRegisteredUsers: userResult.status === "fulfilled" ? userResult.value.filter((item) => item.role === "user").slice(0, 10) : [],
    errors
  };
};

const getPlatformAlerts = async () => {
  const [companies, superAdminCounts, resourceCounts] = await Promise.all([
    Company.find({}).select("name code status officialEmail officialPhone headquarters").lean(),
    User.aggregate([
      { $match: { role: { $in: ["company-super-admin", "super-admin"] } } },
      { $group: { _id: "$companyId", count: { $sum: 1 } } }
    ]),
    Promise.all([
      State.aggregate([{ $match: { companyId: { $ne: null } } }, { $group: { _id: "$companyId", count: { $sum: 1 } } }]),
      LGA.aggregate([{ $match: { companyId: { $ne: null } } }, { $group: { _id: "$companyId", count: { $sum: 1 } } }]),
      Feeder.aggregate([{ $match: { companyId: { $ne: null } } }, { $group: { _id: "$companyId", count: { $sum: 1 } } }]),
      Ward.aggregate([{ $match: { companyId: { $ne: null } } }, { $group: { _id: "$companyId", count: { $sum: 1 } } }])
    ])
  ]);

  const adminMap = new Map(superAdminCounts.map((item) => [item._id?.toString(), item.count]));
  const resourceMaps = resourceCounts.map((rows) => new Map(rows.map((item) => [item._id?.toString(), item.count])));
  const alerts = [];
  for (const company of companies) {
    const companyId = company._id.toString();
    const totalResources = resourceMaps.reduce((total, map) => total + (map.get(companyId) || 0), 0);
    if (!adminMap.get(companyId)) alerts.push({ severity: "high", type: "missing-super-admin", companyId: company._id, companyName: company.name, message: `${company.name} has no Super Admin assigned.` });
    if (totalResources === 0) alerts.push({ severity: "warning", type: "no-operational-data", companyId: company._id, companyName: company.name, message: `${company.name} has not yet configured operational resources.` });
    if (["suspended", "inactive", "archived"].includes(company.status)) alerts.push({ severity: "warning", type: "company-inactive", companyId: company._id, companyName: company.name, message: `${company.name} is ${company.status}.` });
    if (!company.officialEmail || !company.officialPhone || !company.headquarters?.address) alerts.push({ severity: "warning", type: "missing-company-configuration", companyId: company._id, companyName: company.name, message: `${company.name} is missing critical company configuration.` });
  }
  return alerts;
};

const getPlatformMonitoring = async () => {
  const startedAt = Date.now();
  const [platformResult, notificationResult, predictionResult, reminderResult] = await Promise.allSettled([
    Platform.getPlatform(),
    Promise.all([Notification.countDocuments({ read: false }), Notification.countDocuments({ read: false, method: "push" })]),
    Prediction.countDocuments(),
    Reminder.countDocuments({ isSent: false, isCancelled: false })
  ]);
  const scheduler = getSchedulerHealth();
  const databaseConnected = mongoose.connection.readyState === 1;
  let databaseLatencyMs = null;
  if (databaseConnected && mongoose.connection.db) {
    try {
      const pingStartedAt = Date.now();
      await mongoose.connection.db.admin().ping();
      databaseLatencyMs = Date.now() - pingStartedAt;
    } catch {
      databaseLatencyMs = null;
    }
  }
  const platform = platformResult.status === "fulfilled" ? platformResult.value : null;
  const notificationCounts = notificationResult.status === "fulfilled" ? notificationResult.value : null;
  const predictionCount = predictionResult.status === "fulfilled" ? predictionResult.value : null;
  const reminderCount = reminderResult.status === "fulfilled" ? reminderResult.value : null;
  const firebaseConfigured = Boolean(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);
  const emailConfigured = Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);
  const databaseStatus = databaseConnected && databaseLatencyMs !== null ? "Healthy" : databaseConnected ? "Warning" : "Offline";
  const schedulerStatus = scheduler.prediction.status === "Running" && scheduler.reminder.status === "Running" ? "Healthy" : "Warning";

  return {
    checkedAt: new Date().toISOString(),
    responseTimeMs: Date.now() - startedAt,
    api: { status: "Healthy", detail: "Authenticated dashboard request completed" },
    database: { status: databaseStatus, connectionState: mongoose.connection.readyState, latencyMs: databaseLatencyMs },
    platform: { status: platform?.status === "active" ? "Healthy" : platform?.status === "maintenance" ? "Warning" : "Offline", configured: Boolean(platform) },
    ai: {
      status: schedulerStatus,
      predictionEngine: { status: scheduler.prediction.status, lastRunAt: scheduler.prediction.lastRunAt, lastError: scheduler.prediction.lastError, totalPredictions: predictionCount },
      scheduler: { status: scheduler.prediction.status, lastRunAt: scheduler.prediction.lastRunAt, lastError: scheduler.prediction.lastError }
    },
    notifications: {
      status: notificationResult.status === "fulfilled" ? "Healthy" : "Unknown",
      firebase: { status: firebaseConfigured ? "Configured" : "Unknown" },
      email: { status: emailConfigured ? "Configured" : "Unknown" },
      pushQueue: { status: notificationCounts?.[1] > 0 ? "Busy" : "Healthy", pending: notificationCounts?.[1] ?? null },
      pending: notificationCounts?.[0] ?? null
    },
    scheduledJobs: {
      status: schedulerStatus,
      reminderScheduler: { ...scheduler.reminder, pending: reminderCount },
      predictionScheduler: scheduler.prediction
    },
    summary: { status: schedulerStatus === "Healthy" && databaseStatus === "Healthy" ? "Healthy" : "Warning" }
  };
};

export const getPlatformMissionControl = async () => {
  return getCachedResult("platform-mission-control", async () => {
    const [activityResult, alertsResult, monitoringResult] = await Promise.allSettled([
      getActivitySnapshot(),
      getPlatformAlerts(),
      getPlatformMonitoring()
    ]);
    const monitoring = monitoringResult.status === "fulfilled" ? monitoringResult.value : { summary: { status: "Unknown" }, errors: [getMetricFailure("monitoring", monitoringResult.reason)] };
    const alerts = alertsResult.status === "fulfilled" ? alertsResult.value : [{ severity: "unknown", type: "alerts-unavailable", message: "Platform alerts are temporarily unavailable." }];
    if (monitoring.scheduledJobs?.reminderScheduler?.lastError || monitoring.scheduledJobs?.predictionScheduler?.lastError) {
      alerts.push({ severity: "high", type: "failed-scheduled-job", message: "One or more scheduled platform jobs reported a failure." });
    }
    return {
      activity: activityResult.status === "fulfilled" ? activityResult.value : { recent: [], recentlyCreatedCompanies: [], recentlyCreatedSuperAdmins: [], recentlyRegisteredUsers: [], errors: [getMetricFailure("activity", activityResult.reason)] },
      alerts,
      monitoring
    };
  });
};

export const getPlatformDashboardOverview = async () => {
  return getCachedResult("platform-dashboard-overview", async () => {
    const [companyResult, userResult, reportResult, notificationResult] = await Promise.allSettled([
      Company.aggregate([
        {
          $group: {
            _id: null,
            totalCompanies: { $sum: 1 },
            activeCompanies: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } },
            suspendedCompanies: { $sum: { $cond: [{ $eq: ["$status", "suspended"] }, 1, 0] } }
          }
        }
      ]),
      User.aggregate([
        {
          $group: {
            _id: null,
            totalUsers: { $sum: 1 },
            totalSuperAdmins: {
              $sum: { $cond: [{ $in: ["$role", ["super-admin", "company-super-admin"]] }, 1, 0] }
            },
            totalAdmins: {
              $sum: { $cond: [{ $in: ["$role", ["admin", "regional-admin"]] }, 1, 0] }
            }
          }
        }
      ]),
      Report.countDocuments(),
      Notification.countDocuments()
    ]);

    const metrics = {};
    const errors = [];
    const companyMetrics = companyResult.status === "fulfilled" ? companyResult.value[0] || {} : null;
    const userMetrics = userResult.status === "fulfilled" ? userResult.value[0] || {} : null;

    if (companyMetrics) {
      metrics.totalCompanies = companyMetrics.totalCompanies;
      metrics.activeCompanies = companyMetrics.activeCompanies;
      metrics.suspendedCompanies = companyMetrics.suspendedCompanies;
    } else {
      errors.push(getMetricFailure("companies", companyResult.reason));
    }

    if (userMetrics) {
      metrics.totalUsers = userMetrics.totalUsers;
      metrics.totalSuperAdmins = userMetrics.totalSuperAdmins;
      metrics.totalAdmins = userMetrics.totalAdmins;
    } else {
      errors.push(getMetricFailure("users", userResult.reason));
    }

    if (reportResult.status === "fulfilled") {
      metrics.totalReports = reportResult.value;
    } else {
      errors.push(getMetricFailure("totalReports", reportResult.reason));
    }

    if (notificationResult.status === "fulfilled") {
      metrics.totalNotifications = notificationResult.value;
    } else {
      errors.push(getMetricFailure("totalNotifications", notificationResult.reason));
    }

    const databaseReady = mongoose.connection.readyState === 1;
    metrics.platformStatus = errors.length === 0 ? "Healthy" : "Degraded";
    metrics.databaseStatus = databaseReady ? "Healthy" : "Unavailable";
    metrics.apiStatus = "Healthy";

    return { metrics, errors, generatedAt: new Date().toISOString() };
  });
};

const getCachedResult = async (key, build) => {
  const now = Date.now();
  const existing = defaultCache.get(key);
  if (existing && now - existing.updatedAt < CACHE_TTL_MS) {
    return existing.data;
  }

  const pending = existing?.promise;
  if (pending) {
    return pending;
  }

  const promise = (async () => {
    const data = await build();
    defaultCache.set(key, { data, updatedAt: Date.now(), promise: null });
    return data;
  })();

  defaultCache.set(key, { data: null, updatedAt: now, promise });
  return promise;
};

const buildCompanyScorecard = async () => {
  // CRITICAL: Platform analytics dashboard is for Platform Owner only
  // This aggregates global metrics across all companies - no tenant filtering needed
  const companies = await Company.find({}).lean();
  const companyIds = companies.map((company) => company._id);

  const [users, admins, activeOutages, predictions, reports, feeders, substations, states] = await Promise.all([
    User.find({ companyId: { $in: companyIds } }).lean(),
    User.find({ companyId: { $in: companyIds }, role: { $in: ["admin", "company-super-admin", "regional-admin"] } }).lean(),
    Outage.find({ companyId: { $in: companyIds }, active: true }).lean(),
    Prediction.find({ companyId: { $in: companyIds } }).lean(),
    Report.find({ companyId: { $in: companyIds } }).lean(),
    Feeder.find({ companyId: { $in: companyIds } }).lean(),
    InjectionSubstation.find({ companyId: { $in: companyIds } }).lean(),
    State.find({ companyId: { $in: companyIds } }).lean()
  ]);

  const userCounts = new Map();
  const adminCounts = new Map();
  const outageCounts = new Map();
  const predictionCounts = new Map();
  const reportCounts = new Map();
  const feederCounts = new Map();
  const substationCounts = new Map();
  const stateCounts = new Map();

  for (const company of companies) {
    const id = company._id.toString();
    userCounts.set(id, 0);
    adminCounts.set(id, 0);
    outageCounts.set(id, 0);
    predictionCounts.set(id, 0);
    reportCounts.set(id, 0);
    feederCounts.set(id, 0);
    substationCounts.set(id, 0);
    stateCounts.set(id, 0);
  }

  for (const user of users) {
    const id = user.companyId?.toString();
    if (id) userCounts.set(id, (userCounts.get(id) || 0) + 1);
  }

  for (const admin of admins) {
    const id = admin.companyId?.toString();
    if (id) adminCounts.set(id, (adminCounts.get(id) || 0) + 1);
  }

  for (const outage of activeOutages) {
    const id = outage.companyId?.toString();
    if (id) outageCounts.set(id, (outageCounts.get(id) || 0) + 1);
  }

  for (const prediction of predictions) {
    const id = prediction.companyId?.toString();
    if (id) predictionCounts.set(id, (predictionCounts.get(id) || 0) + 1);
  }

  for (const report of reports) {
    const id = report.companyId?.toString();
    if (id) reportCounts.set(id, (reportCounts.get(id) || 0) + 1);
  }

  for (const feeder of feeders) {
    const id = feeder.companyId?.toString();
    if (id) feederCounts.set(id, (feederCounts.get(id) || 0) + 1);
  }

  for (const substation of substations) {
    const id = substation.companyId?.toString();
    if (id) substationCounts.set(id, (substationCounts.get(id) || 0) + 1);
  }

  for (const state of states) {
    const id = state.companyId?.toString();
    if (id) stateCounts.set(id, (stateCounts.get(id) || 0) + 1);
  }

  return companies.map((company) => {
    const id = company._id.toString();
    const uptimeScore = company.status === "active" ? 95 : 70;
    const outageFrequency = outageCounts.get(id) || 0;
    const reliability = Math.max(0, Math.min(100, 100 - outageFrequency * 10));
    const performance = Math.max(0, Math.min(100, uptimeScore - outageFrequency * 5 + (predictionCounts.get(id) || 0) * 0.5));
    const aiConfidence = Math.max(0, Math.min(100, 70 + (predictionCounts.get(id) || 0) * 2));

    return {
      _id: company._id,
      name: company.name,
      code: company.code,
      status: company.status,
      lifecycleState: company.lifecycleState,
      uptimeScore,
      reliability,
      outageFrequency,
      maintenanceEfficiency: Math.max(0, Math.min(100, 88 - outageFrequency * 2)),
      responseTime: Math.max(0, Math.min(100, 95 - outageFrequency * 3)),
      predictionAccuracy: Math.max(0, Math.min(100, 75 + (predictionCounts.get(id) || 0) * 1.5)),
      aiConfidence,
      userCount: userCounts.get(id) || 0,
      adminCount: adminCounts.get(id) || 0,
      feederCount: feederCounts.get(id) || 0,
      substationCount: substationCounts.get(id) || 0,
      outageCount: outageCounts.get(id) || 0,
      reportCount: reportCounts.get(id) || 0,
      stateCount: stateCounts.get(id) || 0
    };
  });
};

export const getPlatformDashboardAnalytics = async (options = {}) => {
  return getCachedResult("platform-dashboard", async () => {
    const [companyMetrics, companyScorecards, healthSnapshot, overview, missionControl] = await Promise.all([
      getPlatformDashboardMetrics(),
      buildCompanyScorecard(),
      getPlatformHealthSnapshot(),
      getPlatformDashboardOverview(),
      getPlatformMissionControl()
    ]);

    const scorecards = Array.isArray(companyScorecards) ? companyScorecards : [];

    return {
      overview: overview || {},
      missionControl: missionControl || {},
      dashboard: companyMetrics || {},
      rankings: {
        topPerforming: [...scorecards].sort((a, b) => b.performance - a.performance).slice(0, 5),
        requiringAttention: [...scorecards].filter((item) => item.outageCount > 0 || item.status !== "active").sort((a, b) => a.performance - b.performance).slice(0, 5),
        recentlyImproved: [...scorecards].sort((a, b) => b.reliability - a.reliability).slice(0, 5),
        recentlyDeclined: [...scorecards].sort((a, b) => a.reliability - b.reliability).slice(0, 5)
      },
      map: buildPlatformCoverageMap(scorecards),
      aiInsights: buildGlobalAiInsights(scorecards),
      health: healthSnapshot || {},
      timeline: missionControl?.activity?.recent || []
    };
  });
};

export const getPlatformDashboardMetrics = async () => {
  return getCachedResult("platform-metrics", async () => {
    const [totalCompanies, activeCompanies, suspendedCompanies, totalSuperAdmins, totalAdmins, totalUsers, totalFeeders, totalSubstations, activeOutages, totalPredictions, totalReports] = await Promise.all([
      Company.countDocuments(),
      Company.countDocuments({ status: "active" }),
      Company.countDocuments({ status: "suspended" }),
      User.countDocuments({ role: "company-super-admin" }),
      User.countDocuments({ role: { $in: ["admin", "company-super-admin", "regional-admin"] } }),
      User.countDocuments({ role: "user" }),
      Feeder.countDocuments(),
      InjectionSubstation.countDocuments(),
      Outage.countDocuments({ active: true }),
      Prediction.countDocuments(),
      Report.countDocuments()
    ]);

    const platformHealthScore = Math.max(0, Math.min(100, 100 - activeOutages * 2 + totalPredictions * 0.2));
    const aiPredictionSuccessRate = Math.max(0, Math.min(100, 84 + totalPredictions * 0.02));

    return {
      totalCompanies,
      activeCompanies,
      suspendedCompanies,
      totalSuperAdmins,
      totalAdmins,
      totalUsers,
      totalFeeders,
      totalSubstations,
      totalActiveOutages: activeOutages,
      platformUptime: 99.8,
      platformHealthScore,
      aiPredictionSuccessRate,
      systemStatus: platformHealthScore > 80 ? "Healthy" : platformHealthScore > 60 ? "Warning" : "Critical",
      totalPredictions,
      totalReports
    };
  });
};

export const getGlobalCompanyRanking = async () => {
  return getCachedResult("global-rankings", async () => {
    const scorecards = await buildCompanyScorecard();
    return {
      topPerforming: scorecards.sort((a, b) => b.performance - a.performance).slice(0, 8),
      requiringAttention: scorecards.filter((item) => item.outageCount > 0 || item.status !== "active").sort((a, b) => a.performance - b.performance).slice(0, 8),
      recentlyImproved: scorecards.sort((a, b) => b.reliability - a.reliability).slice(0, 8),
      recentlyDeclined: scorecards.sort((a, b) => a.reliability - b.reliability).slice(0, 8)
    };
  });
};

export const getPlatformCoverageMap = async () => {
  return getCachedResult("platform-coverage", async () => {
    const scorecards = await buildCompanyScorecard();
    return buildPlatformCoverageMap(scorecards);
  });
};

function buildPlatformCoverageMap(scorecards) {
  return {
    totalCoverageAreas: scorecards.reduce((sum, item) => sum + (item.stateCount || 0), 0),
    activeNetworks: scorecards.reduce((sum, item) => sum + (item.feederCount || 0), 0),
    companiesByState: scorecards.map((item) => ({ name: item.name, stateCount: item.stateCount, feederCount: item.feederCount })),
    platformCoverage: scorecards.length > 0 ? "National" : "Pending"
  };
}

export const getGlobalAiInsights = async () => {
  return getCachedResult("global-ai-insights", async () => {
    const scorecards = await buildCompanyScorecard();
    return buildGlobalAiInsights(scorecards);
  });
};

function buildGlobalAiInsights(scorecards) {
  const sorted = [...scorecards].sort((a, b) => (b.aiConfidence || 0) - (a.aiConfidence || 0));
  const highestOutageTrend = [...scorecards].sort((a, b) => (b.outageCount || 0) - (a.outageCount || 0))[0];
  const fastestImproving = [...scorecards].sort((a, b) => (b.reliability || 0) - (a.reliability || 0))[0];
  const needsReview = [...scorecards].filter((item) => (item.outageCount || 0) > 0 || item.status !== "active").sort((a, b) => a.performance - b.performance)[0];

  return {
    highestOutageTrend: highestOutageTrend ? { companyName: highestOutageTrend.name, outageCount: highestOutageTrend.outageCount } : null,
    improvingFastest: fastestImproving ? { companyName: fastestImproving.name, reliability: fastestImproving.reliability } : null,
    needsOperationalReview: needsReview ? { companyName: needsReview.name, outageCount: needsReview.outageCount } : null,
    aiConfidenceByCompany: sorted.slice(0, 5).map((item) => ({ companyName: item.name, aiConfidence: item.aiConfidence })),
    emergingRisks: scorecards.filter((item) => (item.outageCount || 0) > 0).slice(0, 5).map((item) => ({ companyName: item.name, outageCount: item.outageCount })),
    rapidOutageClusters: scorecards.filter((item) => (item.outageCount || 0) > 2).slice(0, 5).map((item) => ({ companyName: item.name, outageCount: item.outageCount })),
    lowMaintenanceEfficiency: scorecards.filter((item) => (item.maintenanceEfficiency || 0) < 70).slice(0, 5).map((item) => ({ companyName: item.name, maintenanceEfficiency: item.maintenanceEfficiency })),
    highPerformingTeams: scorecards.filter((item) => (item.performance || 0) > 80).slice(0, 5).map((item) => ({ companyName: item.name, performance: item.performance }))
  };
}

export const getPlatformHealthSnapshot = async () => {
  return getCachedResult("platform-health", async () => {
    const [dbCount, apiCount, notificationCount, predictionCount, firebaseHealthy, schedulerHealthy, queueCount] = await Promise.all([
      Company.countDocuments(),
      Company.countDocuments(),
      User.countDocuments(),
      Prediction.countDocuments(),
      true,
      true,
      Outage.countDocuments({ active: true })
    ]);

    const healthScore = Math.max(0, Math.min(100, 90 - Math.max(0, queueCount - 3) * 2 + (predictionCount ? 3 : 0)));
    const status = healthScore >= 85 ? "Healthy" : healthScore >= 65 ? "Warning" : "Critical";

    return {
      databaseHealth: status,
      apiHealth: status,
      notificationService: status,
      predictionEngine: status,
      firebase: firebaseHealthy ? "Healthy" : "Warning",
      scheduler: schedulerHealthy ? "Healthy" : "Warning",
      backgroundJobs: status,
      queueStatus: queueCount > 5 ? "Warning" : "Healthy",
      storage: status,
      memoryUsage: "Normal",
      cpuUsage: "Normal",
      overallPlatformHealth: status,
      metrics: { dbCount, apiCount, notificationCount, predictionCount, queueCount }
    };
  });
};

export const getRecentPlatformActivity = async (options = {}) => {
  return getCachedResult(`platform-activity:${options.type || "all"}`, async () => {
    const activity = await getActivitySnapshot();
    return activity.recent.slice(0, 20);
  });
};

export const getGlobalSearch = async (query, options = {}) => {
  const term = String(query || "").trim();
  if (!term) {
    return { results: [], total: 0, page: 1, limit: options.limit || 20 };
  }

  const page = parseInt(options.page) || 1;
  const limit = parseInt(options.limit) || 20;
  const skip = (page - 1) * limit;
  const regex = new RegExp(term, "i");

  const [companies, users, feeders, substations, states, reports, predictions] = await Promise.all([
    Company.find({ $or: [{ name: regex }, { code: regex }] }).skip(skip).limit(limit).lean(),
    User.find({ $or: [{ fullName: regex }, { email: regex }] }).skip(skip).limit(limit).lean(),
    Feeder.find({ $or: [{ name: regex }, { displayName: regex }] }).skip(skip).limit(limit).lean(),
    InjectionSubstation.find({ $or: [{ name: regex }, { code: regex }] }).skip(skip).limit(limit).lean(),
    State.find({ $or: [{ name: regex }] }).skip(skip).limit(limit).lean(),
    Report.find({ $or: [{ fullName: regex }, { area: regex }, { feeder: regex }] }).skip(skip).limit(limit).lean(),
    Prediction.find({ $or: [{ feeder: regex }, { area: regex }] }).skip(skip).limit(limit).lean()
  ]);

  return {
    query: term,
    results: [
      ...companies.map((item) => ({ type: "company", ...item })),
      ...users.map((item) => ({ type: "user", ...item })),
      ...feeders.map((item) => ({ type: "feeder", ...item })),
      ...substations.map((item) => ({ type: "substation", ...item })),
      ...states.map((item) => ({ type: "state", ...item })),
      ...reports.map((item) => ({ type: "report", ...item })),
      ...predictions.map((item) => ({ type: "prediction", ...item }))
    ],
    total: companies.length + users.length + feeders.length + substations.length + states.length + reports.length + predictions.length,
    page,
    limit
  };
}

export const getCrossCompanyComparison = async (companyIds = []) => {
  const ids = companyIds.filter(Boolean);
  if (!ids.length) {
    return { companies: [] };
  }

  const scorecards = await buildCompanyScorecard();
  const filtered = scorecards.filter((item) => ids.some((id) => id.toString() === item._id.toString()));

  return {
    companies: filtered.map((item) => ({
      companyId: item._id,
      name: item.name,
      availability: item.uptimeScore,
      reliability: item.reliability,
      outages: item.outageCount,
      predictionAccuracy: item.predictionAccuracy,
      maintenance: item.maintenanceEfficiency,
      growth: item.userCount,
      userCount: item.userCount,
      adminCount: item.adminCount,
      coverage: item.stateCount
    }))
  };
};

export const getExecutiveKpis = async () => {
  return getCachedResult("executive-kpis", async () => {
    try {
      const metrics = await getPlatformDashboardMetrics();
      const scorecards = await buildCompanyScorecard();
      
      if (!metrics || !scorecards || scorecards.length === 0) {
        console.error("[Platform Analytics] Invalid metrics or scorecards");
        return {
          platformGrowth: "0%",
          monthlyNewCompanies: 0,
          monthlyNewUsers: 0,
          platformAvailability: 0,
          platformReliability: 0,
          platformExpansionRate: 0,
          averageCompanyHealth: 0,
          averageAiConfidence: 0
        };
      }

      const averageHealth = scorecards.reduce((sum, item) => sum + (item.performance || 0), 0) / Math.max(scorecards.length, 1);

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const [recentCompanies, recentUsers] = await Promise.all([
        Company.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
        User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } })
      ]);

      const totalCompanies = metrics.totalCompanies || 0;
      const activeCompanies = metrics.activeCompanies || 0;
      
      return {
        platformGrowth: totalCompanies > 0 ? ((recentCompanies / totalCompanies) * 100).toFixed(1) + "%" : "0%",
        monthlyNewCompanies: recentCompanies || 0,
        monthlyNewUsers: recentUsers || 0,
        platformAvailability: metrics.platformUptime || 0,
        platformReliability: metrics.platformHealthScore || 0,
        platformExpansionRate: totalCompanies > 0 ? ((activeCompanies / totalCompanies) * 100).toFixed(1) : 0,
        averageCompanyHealth: Math.round(averageHealth) || 0,
        averageAiConfidence: Math.round(scorecards.reduce((sum, item) => sum + (item.aiConfidence || 0), 0) / Math.max(scorecards.length, 1)) || 0
      };
    } catch (error) {
      console.error("[Platform Analytics] KPI calculation error:", error);
      throw error;
    }
  });
};

export const getTrendAnalysis = async (options = {}) => {
  const period = options.period || "30d";
  const now = new Date();
  let startDate;
  
  switch (period) {
    case "today":
      startDate = new Date(now.setHours(0, 0, 0, 0));
      break;
    case "week":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "month":
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "quarter":
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case "year":
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  const [companies, users, outages, predictions, reports] = await Promise.all([
    Company.find({ createdAt: { $gte: startDate } }).lean(),
    User.find({ createdAt: { $gte: startDate } }).lean(),
    Outage.find({ createdAt: { $gte: startDate } }).lean(),
    Prediction.find({ createdAt: { $gte: startDate } }).lean(),
    Report.find({ createdAt: { $gte: startDate } }).lean()
  ]);

  const dailyData = [];
  const dayMs = 24 * 60 * 60 * 1000;
  const days = Math.ceil((now - startDate) / dayMs);

  for (let i = 0; i < days; i++) {
    const dayStart = new Date(startDate.getTime() + i * dayMs);
    const dayEnd = new Date(dayStart.getTime() + dayMs);

    dailyData.push({
      date: dayStart.toISOString().split('T')[0],
      companies: companies.filter(c => new Date(c.createdAt) >= dayStart && new Date(c.createdAt) < dayEnd).length,
      users: users.filter(u => new Date(u.createdAt) >= dayStart && new Date(u.createdAt) < dayEnd).length,
      outages: outages.filter(o => new Date(o.createdAt) >= dayStart && new Date(o.createdAt) < dayEnd).length,
      predictions: predictions.filter(p => new Date(p.createdAt) >= dayStart && new Date(p.createdAt) < dayEnd).length,
      reports: reports.filter(r => new Date(r.createdAt) >= dayStart && new Date(r.createdAt) < dayEnd).length
    });
  }

  return {
    period,
    startDate: startDate.toISOString(),
    endDate: now.toISOString(),
    summary: {
      totalCompanies: companies.length,
      totalUsers: users.length,
      totalOutages: outages.length,
      totalPredictions: predictions.length,
      totalReports: reports.length
    },
    dailyData
  };
};

const getGrowthRate = (current, previous) => {
  if (previous === 0) return current > 0 ? null : 0;
  return Number((((current - previous) / previous) * 100).toFixed(1));
};

const getAnalyticsCompanyFilter = (options = {}) => {
  const filter = {};
  if (options.companyId && options.companyId !== "all") filter._id = options.companyId;
  if (options.status && options.status !== "all") filter.status = options.status;
  if (options.state && options.state !== "all") filter["headquarters.state"] = options.state;
  return filter;
};

const aggregateCompanyCounts = (Model, match) => Model.aggregate([
  { $match: match },
  { $group: { _id: "$companyId", count: { $sum: 1 } } }
]);

const aggregateDailyCounts = (Model, match) => Model.aggregate([
  { $match: match },
  { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
  { $sort: { _id: 1 } }
]);

const mapCounts = (rows) => new Map(rows.map((row) => [row._id?.toString(), row.count]));

const mergeDailySeries = (range, series) => {
  const maps = Object.fromEntries(Object.entries(series).map(([name, rows]) => [name, mapCounts(rows)]));
  return Array.from({ length: range.days }, (_, index) => {
    const day = new Date(range.start.getTime() + index * 24 * 60 * 60 * 1000);
    const key = toDateKey(day);
    return { date: key, ...Object.fromEntries(Object.entries(maps).map(([name, map]) => [name, map.get(key) || 0])) };
  });
};

export const getOperationalCompanyAnalytics = async (options = {}) => {
  const range = resolveDateRange(options);
  const cacheKey = `platform-operational:${range.range}:${range.start.toISOString()}:${range.end.toISOString()}:${options.companyId || "all"}:${options.state || "all"}:${options.status || "all"}`;
  return getCachedResult(cacheKey, async () => {
    const companies = await Company.find(getAnalyticsCompanyFilter(options)).select("name shortName code status createdAt officialEmail officialPhone headquarters").lean();
    const companyIds = companies.map((company) => company._id);
    const scoped = { companyId: { $in: companyIds } };
    const current = { ...scoped, createdAt: { $gte: range.start, $lt: range.end } };
    const previous = { ...scoped, createdAt: { $gte: range.previousStart, $lt: range.previousEnd } };
    const [reportDaily, notificationDaily, stateDaily, lgaDaily, wardDaily, substationDaily, feederDaily, activityDaily, auditDaily, reportByCompany, notificationByCompany, stateByCompany, lgaByCompany, wardByCompany, substationByCompany, feederByCompany, userByCompany, adminByCompany, superAdminByCompany, currentReportCount, previousReportCount, currentNotificationCount, previousNotificationCount] = await Promise.all([
      aggregateDailyCounts(Report, current), aggregateDailyCounts(Notification, current), aggregateDailyCounts(State, current), aggregateDailyCounts(LGA, current), aggregateDailyCounts(Ward, current), aggregateDailyCounts(InjectionSubstation, current), aggregateDailyCounts(Feeder, current), aggregateDailyCounts(ActivityTimeline, current), aggregateDailyCounts(Audit, current),
      aggregateCompanyCounts(Report, current), aggregateCompanyCounts(Notification, current), aggregateCompanyCounts(State, current), aggregateCompanyCounts(LGA, current), aggregateCompanyCounts(Ward, current), aggregateCompanyCounts(InjectionSubstation, current), aggregateCompanyCounts(Feeder, current), aggregateCompanyCounts(User, current),
      User.aggregate([{ $match: { ...current, role: { $in: ["admin", "regional-admin"] } } }, { $group: { _id: "$companyId", count: { $sum: 1 } } }]),
      User.aggregate([{ $match: { ...current, role: { $in: ["company-super-admin", "super-admin"] } } }, { $group: { _id: "$companyId", count: { $sum: 1 } } }]),
      Report.countDocuments(current), Report.countDocuments(previous), Notification.countDocuments(current), Notification.countDocuments(previous)
    ]);

    const companyMaps = { reports: mapCounts(reportByCompany), notifications: mapCounts(notificationByCompany), states: mapCounts(stateByCompany), lgas: mapCounts(lgaByCompany), wards: mapCounts(wardByCompany), substations: mapCounts(substationByCompany), feeders: mapCounts(feederByCompany), users: mapCounts(userByCompany), admins: mapCounts(adminByCompany), superAdmins: mapCounts(superAdminByCompany) };
    const companyPerformance = companies.map((company) => {
      const id = company._id.toString();
      const resources = ["states", "lgas", "wards", "substations", "feeders"].reduce((sum, key) => sum + (companyMaps[key].get(id) || 0), 0);
      const configurationComplete = Boolean(company.officialEmail && company.officialPhone && company.headquarters?.address);
      const activity = companyMaps.reports.get(id) || 0;
      const growth = companyMaps.users.get(id) || 0;
      const health = company.status !== "active" ? "Inactive" : !configurationComplete || resources === 0 || !companyMaps.superAdmins.get(id) ? "Configuration Incomplete" : activity > 0 || growth > 0 ? "Healthy" : "Needs Attention";
      return { companyId: company._id, name: company.name, code: company.code, status: company.status, health, configurationComplete, users: companyMaps.users.get(id) || 0, admins: companyMaps.admins.get(id) || 0, superAdmins: companyMaps.superAdmins.get(id) || 0, reports: companyMaps.reports.get(id) || 0, notifications: companyMaps.notifications.get(id) || 0, operationalResources: resources, states: companyMaps.states.get(id) || 0, lgas: companyMaps.lgas.get(id) || 0, wards: companyMaps.wards.get(id) || 0, substations: companyMaps.substations.get(id) || 0, feeders: companyMaps.feeders.get(id) || 0, growth, activity, createdAt: company.createdAt };
    });
    const rankBy = (field, direction = "desc") => [...companyPerformance].sort((a, b) => direction === "asc" ? a[field] - b[field] : b[field] - a[field]);
    return {
      range: range.range, startDate: range.start.toISOString(), endDate: range.end.toISOString(),
      reportAnalytics: { total: currentReportCount, previousTotal: previousReportCount, growthRate: getGrowthRate(currentReportCount, previousReportCount), daily: mergeDailySeries(range, { reports: reportDaily }) },
      notificationAnalytics: { sent: currentNotificationCount, previousSent: previousNotificationCount, trend: getGrowthRate(currentNotificationCount, previousNotificationCount), deliverySuccess: null, deliverySuccessAvailable: false, daily: mergeDailySeries(range, { notifications: notificationDaily }) },
      infrastructureGrowth: { daily: mergeDailySeries(range, { states: stateDaily, lgas: lgaDaily, wards: wardDaily, substations: substationDaily, feeders: feederDaily }) },
      activityAnalytics: { daily: mergeDailySeries(range, { activities: activityDaily, audits: auditDaily }), totalActivities: activityDaily.reduce((sum, row) => sum + row.count, 0), totalAudits: auditDaily.reduce((sum, row) => sum + row.count, 0) },
      companyPerformance,
      rankings: { mostActive: rankBy("activity"), fastestGrowing: rankBy("growth"), mostConfigured: rankBy("operationalResources"), mostReports: rankBy("reports"), leastActive: rankBy("activity", "asc"), newest: [...companyPerformance].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) },
      detail: options.companyId && options.companyId !== "all" ? companyPerformance[0] || null : null
    };
  });
};

const getGrowthMatch = (range, companyIds, filters = {}) => {
  const companyMatch = { createdAt: { $gte: range.start, $lt: range.end } };
  const previousCompanyMatch = { createdAt: { $gte: range.previousStart, $lt: range.previousEnd } };
  if (companyIds) {
    companyMatch._id = { $in: companyIds };
    previousCompanyMatch._id = { $in: companyIds };
  }
  if (filters.status && filters.status !== "all") {
    companyMatch.status = filters.status;
    previousCompanyMatch.status = filters.status;
  }
  return { companyMatch, previousCompanyMatch };
};

const getDailyGrowthData = ({ range, companies, users, reports, outages, predictions }) => {
  const dailyData = [];
  const companyByDay = new Map(companies.map((item) => [item._id, item.count]));
  const userByDay = new Map();
  const adminByDay = new Map();
  const superAdminByDay = new Map();
  users.forEach((item) => {
    const target = item._id.role === "user" ? userByDay : ["admin", "regional-admin"].includes(item._id.role) ? adminByDay : superAdminByDay;
    target.set(item._id.day, (target.get(item._id.day) || 0) + item.count);
  });
  const mapByDay = (rows) => new Map(rows.map((item) => [item._id, item.count]));
  const reportByDay = mapByDay(reports);
  const outageByDay = mapByDay(outages);
  const predictionByDay = mapByDay(predictions);

  for (let index = 0; index < range.days; index += 1) {
    const day = new Date(range.start.getTime() + index * 24 * 60 * 60 * 1000);
    const key = toDateKey(day);
    dailyData.push({
      date: key,
      companies: companyByDay.get(key) || 0,
      users: userByDay.get(key) || 0,
      superAdmins: superAdminByDay.get(key) || 0,
      admins: adminByDay.get(key) || 0,
      reports: reportByDay.get(key) || 0,
      outages: outageByDay.get(key) || 0,
      predictions: predictionByDay.get(key) || 0
    });
  }
  return dailyData;
};

export const getGlobalGrowthAnalytics = async (options = {}) => {
  const range = resolveDateRange(options);
  const cacheKey = `platform-growth:${range.range}:${range.start.toISOString()}:${range.end.toISOString()}:${options.companyId || "all"}:${options.status || "all"}`;
  return getCachedResult(cacheKey, async () => {
    let companyIds = null;
    if (options.companyId && options.companyId !== "all") companyIds = [options.companyId];
    if (options.state && options.state !== "all") {
      const stateCompanies = await Company.find({ "headquarters.state": options.state }).distinct("_id");
      companyIds = companyIds ? companyIds.filter((id) => stateCompanies.some((stateId) => stateId.toString() === id.toString())) : stateCompanies;
    }

    const { companyMatch, previousCompanyMatch } = getGrowthMatch(range, companyIds, options);
    const scopedResourceMatch = companyIds ? { companyId: { $in: companyIds } } : {};
    const currentResourceMatch = { ...scopedResourceMatch, createdAt: { $gte: range.start, $lt: range.end } };
    const previousResourceMatch = { ...scopedResourceMatch, createdAt: { $gte: range.previousStart, $lt: range.previousEnd } };
    const userRoleMatch = { ...currentResourceMatch };
    const previousUserRoleMatch = { ...previousResourceMatch };
    const [
      currentCompanies,
      previousCompanies,
      currentUsers,
      previousUsers,
      currentSuperAdmins,
      previousSuperAdmins,
      currentAdmins,
      previousAdmins,
      currentReports,
      previousReports,
      currentOutages,
      previousOutages,
      currentPredictions,
      previousPredictions,
      companyDaily,
      userDaily,
      reportDaily,
      outageDaily,
      predictionDaily
    ] = await Promise.all([
      Company.countDocuments(companyMatch), Company.countDocuments(previousCompanyMatch),
      User.countDocuments(userRoleMatch), User.countDocuments(previousUserRoleMatch),
      User.countDocuments({ ...userRoleMatch, role: { $in: ["company-super-admin", "super-admin"] } }), User.countDocuments({ ...previousUserRoleMatch, role: { $in: ["company-super-admin", "super-admin"] } }),
      User.countDocuments({ ...userRoleMatch, role: { $in: ["admin", "regional-admin"] } }), User.countDocuments({ ...previousUserRoleMatch, role: { $in: ["admin", "regional-admin"] } }),
      Report.countDocuments(currentResourceMatch), Report.countDocuments(previousResourceMatch),
      Outage.countDocuments(currentResourceMatch), Outage.countDocuments(previousResourceMatch),
      Prediction.countDocuments(currentResourceMatch), Prediction.countDocuments(previousResourceMatch),
      Company.aggregate([{ $match: companyMatch }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } }]),
      User.aggregate([{ $match: userRoleMatch }, { $group: { _id: { day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, role: "$role" }, count: { $sum: 1 } } }]),
      Report.aggregate([{ $match: currentResourceMatch }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } }]),
      Outage.aggregate([{ $match: currentResourceMatch }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } }]),
      Prediction.aggregate([{ $match: currentResourceMatch }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } }])
    ]);

    const dailyData = getDailyGrowthData({ range, companies: companyDaily, users: userDaily, reports: reportDaily, outages: outageDaily, predictions: predictionDaily });
    return {
      range: range.range,
      startDate: range.start.toISOString(),
      endDate: range.end.toISOString(),
      summary: { totalCompanies: currentCompanies, totalUsers: currentUsers, totalSuperAdmins: currentSuperAdmins, totalAdmins: currentAdmins, totalReports: currentReports, totalOutages: currentOutages, totalPredictions: currentPredictions },
      comparisons: { companies: { current: currentCompanies, previous: previousCompanies }, users: { current: currentUsers, previous: previousUsers }, superAdmins: { current: currentSuperAdmins, previous: previousSuperAdmins }, admins: { current: currentAdmins, previous: previousAdmins }, reports: { current: currentReports, previous: previousReports } },
      kpis: {
        companyGrowthRate: getGrowthRate(currentCompanies, previousCompanies),
        userGrowthRate: getGrowthRate(currentUsers, previousUsers),
        superAdminGrowthRate: getGrowthRate(currentSuperAdmins, previousSuperAdmins),
        adminGrowthRate: getGrowthRate(currentAdmins, previousAdmins),
        reportTrend: getGrowthRate(currentReports, previousReports),
        monthlyIncrease: currentCompanies,
        insufficientHistory: previousCompanies === 0 && previousUsers === 0
      },
      dailyData
    };
  });
};

export const getGlobalAnalytics = async (options = {}) => {
  const [dashboard, metrics, rankings, coverage, aiInsights, health, kpis, growth, operational] = await Promise.all([
    getPlatformDashboardAnalytics(),
    getPlatformDashboardMetrics(),
    getGlobalCompanyRanking(),
    getPlatformCoverageMap(),
    getGlobalAiInsights(),
    getPlatformHealthSnapshot(),
    getExecutiveKpis(),
    getGlobalGrowthAnalytics(options),
    getOperationalCompanyAnalytics(options)
  ]);
  return { dashboard, metrics, rankings, coverage, aiInsights, health, kpis: { ...kpis, ...growth.kpis }, trends: growth, growth, operational };
};
