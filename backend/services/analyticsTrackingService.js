import AnalyticsEvent from "../models/AnalyticsEvent.js";
import Company from "../models/Company.js";
import User from "../models/UserModel.js";
import mongoose from "mongoose";

/**
 * Non-blocking, fail-soft analytics event tracker.
 * Ensures analytics failures NEVER break core business operations.
 */
export const trackAnalyticsEvent = async ({
  eventName,
  feature = "report",
  userId = null,
  companyId = null,
  role = null,
  state = null,
  sessionId = null,
  metadata = {}
}) => {
  try {
    if (!eventName) return null;

    // Sanitize metadata to exclude PII / sensitive data
    const sanitizedMetadata = {};
    if (metadata) {
      if (metadata.issueType) sanitizedMetadata.issueType = String(metadata.issueType);
      if (metadata.reportId) sanitizedMetadata.reportId = String(metadata.reportId);
      if (metadata.error) sanitizedMetadata.error = String(metadata.error).substring(0, 200);
      if (metadata.deviceType) sanitizedMetadata.deviceType = String(metadata.deviceType);
      if (metadata.source) sanitizedMetadata.source = String(metadata.source);
      // Referral attribution fields (no PII exposed)
      if (metadata.referralCode) sanitizedMetadata.referralCode = String(metadata.referralCode).toUpperCase();
      if (metadata.referrerId) sanitizedMetadata.referrerId = String(metadata.referrerId);
      if (metadata.referredUserId) sanitizedMetadata.referredUserId = String(metadata.referredUserId);
      if (metadata.channel) sanitizedMetadata.channel = String(metadata.channel);
    }

    const event = await AnalyticsEvent.create({
      eventName,
      feature,
      user: userId || null,
      companyId: companyId || null,
      role: role || null,
      state: state || null,
      sessionId: sessionId || null,
      metadata: sanitizedMetadata,
      timestamp: new Date()
    });

    return event;
  } catch (error) {
    // Fail-soft: log error quietly, never throw or crash caller
    console.error("[Analytics Tracking] Non-blocking event tracking error:", error.message);
    return null;
  }
};

/**
 * Calculates date range boundaries for current and previous comparison periods.
 */
const getPeriodBoundaries = (options = {}) => {
  const now = new Date();
  const range = options.range || "30d";
  let startDate;
  let endDate = now;

  if (range === "7d") {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (range === "90d") {
    startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  } else if (range === "custom" && options.startDate) {
    startDate = new Date(options.startDate);
    if (options.endDate) endDate = new Date(options.endDate);
  } else {
    // Default 30d
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  const durationMs = endDate.getTime() - startDate.getTime();
  const previousEndDate = new Date(startDate.getTime());
  const previousStartDate = new Date(startDate.getTime() - durationMs);

  return { startDate, endDate, previousStartDate, previousEndDate, range };
};

/**
 * Calculates percentage change between current and previous values.
 */
const calculateTrendPercentage = (current, previous) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Number((((current - previous) / previous) * 100).toFixed(1));
};

/**
 * Aggregates production-grade analytics for the Report feature.
 * Strictly respects multi-tenant authorization scoping.
 */
export const getReportAnalyticsService = async (options = {}, reqUser = {}) => {
  const isPlatformOwner = reqUser.role === "platform-owner";
  const isCompanySuperAdmin = reqUser.role === "company-super-admin" || reqUser.role === "super-admin";
  const isAdmin = reqUser.role === "admin" || reqUser.role === "regional-admin";

  if (!isPlatformOwner && !isCompanySuperAdmin && !isAdmin) {
    const error = new Error("Access denied. Insufficient privileges to view product analytics.");
    error.statusCode = 403;
    throw error;
  }

  const baseMatch = { feature: "report" };

  if (!isPlatformOwner) {
    if (!reqUser.companyId) {
      const error = new Error("Company context required for tenant-scoped analytics.");
      error.statusCode = 400;
      throw error;
    }
    baseMatch.companyId = new mongoose.Types.ObjectId(reqUser.companyId.toString());
  } else if (options.companyId && options.companyId !== "all") {
    baseMatch.companyId = new mongoose.Types.ObjectId(options.companyId.toString());
  }

  if (options.state && options.state !== "all") {
    baseMatch.state = options.state;
  }

  const { startDate, endDate, previousStartDate, previousEndDate, range } = getPeriodBoundaries(options);

  const currentMatch = { ...baseMatch, timestamp: { $gte: startDate, $lt: endDate } };
  const previousMatch = { ...baseMatch, timestamp: { $gte: previousStartDate, $lt: previousEndDate } };

  const [currentEventCounts, previousEventCounts, currentUniqueUsers, previousUniqueUsers] = await Promise.all([
    AnalyticsEvent.aggregate([
      { $match: currentMatch },
      { $group: { _id: "$eventName", count: { $sum: 1 } } }
    ]),
    AnalyticsEvent.aggregate([
      { $match: previousMatch },
      { $group: { _id: "$eventName", count: { $sum: 1 } } }
    ]),
    AnalyticsEvent.distinct("user", { ...currentMatch, user: { $ne: null } }),
    AnalyticsEvent.distinct("user", { ...previousMatch, user: { $ne: null } })
  ]);

  const currentMap = new Map(currentEventCounts.map((item) => [item._id, item.count]));
  const previousMap = new Map(previousEventCounts.map((item) => [item._id, item.count]));

  const viewed = currentMap.get("report_viewed") || 0;
  const started = currentMap.get("report_started") || 0;
  const submitted = currentMap.get("report_submitted") || 0;
  const created = currentMap.get("report_created") || 0;
  const failed = currentMap.get("report_submission_failed") || 0;

  const prevViewed = previousMap.get("report_viewed") || 0;
  const prevStarted = previousMap.get("report_started") || 0;
  const prevSubmitted = previousMap.get("report_submitted") || 0;
  const prevCreated = previousMap.get("report_created") || 0;
  const prevFailed = previousMap.get("report_submission_failed") || 0;

  const totalAttempts = submitted > 0 ? submitted : created + failed;
  const prevTotalAttempts = prevSubmitted > 0 ? prevSubmitted : prevCreated + prevFailed;

  const successRate = totalAttempts > 0 ? Number(((created / totalAttempts) * 100).toFixed(1)) : 0;
  const failureRate = totalAttempts > 0 ? Number(((failed / totalAttempts) * 100).toFixed(1)) : 0;

  const prevSuccessRate = prevTotalAttempts > 0 ? Number(((prevCreated / prevTotalAttempts) * 100).toFixed(1)) : 0;
  const prevFailureRate = prevTotalAttempts > 0 ? Number(((prevFailed / prevTotalAttempts) * 100).toFixed(1)) : 0;

  const uniqueUsersCount = currentUniqueUsers.length;
  const prevUniqueUsersCount = previousUniqueUsers.length;

  const coreMetrics = {
    reportViewed: viewed,
    reportStarted: started,
    reportSubmitted: submitted,
    reportsCreated: created,
    submissionFailed: failed,
    submissionSuccessRate: successRate,
    submissionFailureRate: failureRate,
    uniqueReportingUsers: uniqueUsersCount,
    trends: {
      viewedTrend: calculateTrendPercentage(viewed, prevViewed),
      startedTrend: calculateTrendPercentage(started, prevStarted),
      submittedTrend: calculateTrendPercentage(submitted, prevSubmitted),
      createdTrend: calculateTrendPercentage(created, prevCreated),
      successRateTrend: Number((successRate - prevSuccessRate).toFixed(1)),
      failureRateTrend: Number((failureRate - prevFailureRate).toFixed(1)),
      uniqueUsersTrend: calculateTrendPercentage(uniqueUsersCount, prevUniqueUsersCount)
    }
  };

  const startConversion = viewed > 0 ? Number(((started / viewed) * 100).toFixed(1)) : 0;
  const submitConversion = started > 0 ? Number(((submitted / started) * 100).toFixed(1)) : 0;
  const createConversion = submitted > 0 ? Number(((created / submitted) * 100).toFixed(1)) : 0;
  const overallConversion = viewed > 0 ? Number(((created / viewed) * 100).toFixed(1)) : 0;

  const funnel = {
    steps: [
      { step: "report_viewed", label: "Report Viewed", count: viewed, conversionFromPrevious: 100, dropoffCount: Math.max(0, viewed - started) },
      { step: "report_started", label: "Report Started", count: started, conversionFromPrevious: startConversion, dropoffCount: Math.max(0, started - submitted) },
      { step: "report_submitted", label: "Report Submitted", count: submitted, conversionFromPrevious: submitConversion, dropoffCount: Math.max(0, submitted - created) },
      { step: "report_created", label: "Report Created", count: created, conversionFromPrevious: createConversion, dropoffCount: 0 }
    ],
    overallConversionRate: overallConversion
  };

  const dailyRawSeries = await AnalyticsEvent.aggregate([
    { $match: currentMatch },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
          event: "$eventName"
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { "_id.date": 1 } }
  ]);

  const dailyMap = new Map();
  const dayMs = 24 * 60 * 60 * 1000;
  const totalDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / dayMs));

  for (let i = 0; i < totalDays; i++) {
    const dayDate = new Date(startDate.getTime() + i * dayMs);
    const dateKey = dayDate.toISOString().split("T")[0];
    dailyMap.set(dateKey, { date: dateKey, viewed: 0, started: 0, submitted: 0, created: 0, failed: 0 });
  }

  for (const row of dailyRawSeries) {
    const dateKey = row._id.date;
    const event = row._id.event;
    if (!dailyMap.has(dateKey)) {
      dailyMap.set(dateKey, { date: dateKey, viewed: 0, started: 0, submitted: 0, created: 0, failed: 0 });
    }
    const entry = dailyMap.get(dateKey);
    if (event === "report_viewed") entry.viewed = row.count;
    if (event === "report_started") entry.started = row.count;
    if (event === "report_submitted") entry.submitted = row.count;
    if (event === "report_created") entry.created = row.count;
    if (event === "report_submission_failed") entry.failed = row.count;
  }

  const usageTrend = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  let byCompany = [];
  let byState = [];

  if (isPlatformOwner) {
    const companyAgg = await AnalyticsEvent.aggregate([
      { $match: currentMatch },
      {
        $group: {
          _id: { companyId: "$companyId", event: "$eventName" },
          count: { $sum: 1 }
        }
      }
    ]);

    const companyMap = new Map();
    for (const row of companyAgg) {
      const cId = row._id.companyId ? row._id.companyId.toString() : "unassigned";
      if (!companyMap.has(cId)) {
        companyMap.set(cId, { companyId: cId, viewed: 0, started: 0, submitted: 0, created: 0, failed: 0 });
      }
      const item = companyMap.get(cId);
      if (row._id.event === "report_viewed") item.viewed = row.count;
      if (row._id.event === "report_started") item.started = row.count;
      if (row._id.event === "report_submitted") item.submitted = row.count;
      if (row._id.event === "report_created") item.created = row.count;
      if (row._id.event === "report_submission_failed") item.failed = row.count;
    }

    const companyObjectIds = Array.from(companyMap.keys()).filter((id) => mongoose.Types.ObjectId.isValid(id));
    const companyDocs = await Company.find({ _id: { $in: companyObjectIds } }).select("name shortName code").lean();
    const companyDocMap = new Map(companyDocs.map((c) => [c._id.toString(), c]));

    byCompany = Array.from(companyMap.values()).map((item) => {
      const comp = companyDocMap.get(item.companyId);
      const attempts = item.submitted > 0 ? item.submitted : item.created + item.failed;
      const sr = attempts > 0 ? Number(((item.created / attempts) * 100).toFixed(1)) : 0;
      return {
        companyId: item.companyId,
        companyName: comp ? comp.name : "Unassigned / General",
        companyCode: comp ? comp.code : "GLOBAL",
        viewed: item.viewed,
        started: item.started,
        submitted: item.submitted,
        created: item.created,
        failed: item.failed,
        successRate: sr
      };
    }).sort((a, b) => b.created - a.created);
  }

  const stateAgg = await AnalyticsEvent.aggregate([
    { $match: currentMatch },
    {
      $group: {
        _id: { state: "$state", event: "$eventName" },
        count: { $sum: 1 }
      }
    }
  ]);

  const stateMap = new Map();
  for (const row of stateAgg) {
    const stName = row._id.state || "Unspecified";
    if (!stateMap.has(stName)) {
      stateMap.set(stName, { state: stName, viewed: 0, started: 0, submitted: 0, created: 0, failed: 0 });
    }
    const item = stateMap.get(stName);
    if (row._id.event === "report_viewed") item.viewed = row.count;
    if (row._id.event === "report_started") item.started = row.count;
    if (row._id.event === "report_submitted") item.submitted = row.count;
    if (row._id.event === "report_created") item.created = row.count;
    if (row._id.event === "report_submission_failed") item.failed = row.count;
  }

  byState = Array.from(stateMap.values()).map((item) => {
    const attempts = item.submitted > 0 ? item.submitted : item.created + item.failed;
    const sr = attempts > 0 ? Number(((item.created / attempts) * 100).toFixed(1)) : 0;
    return {
      state: item.state,
      viewed: item.viewed,
      started: item.started,
      submitted: item.submitted,
      created: item.created,
      failed: item.failed,
      successRate: sr
    };
  }).sort((a, b) => b.created - a.created);

  let adoptionStatus = "moderate";
  if (created > 50 || uniqueUsersCount > 30) adoptionStatus = "high";
  else if (created < 5 && uniqueUsersCount < 5) adoptionStatus = "low";

  let usageTrendStatus = "stable";
  if (coreMetrics.trends.createdTrend > 10) usageTrendStatus = "increasing";
  else if (coreMetrics.trends.createdTrend < -10) usageTrendStatus = "declining";

  let failureRateStatus = "normal";
  if (failureRate >= 15) failureRateStatus = "critical";
  else if (failureRate >= 5) failureRateStatus = "concerning";

  let dropoffStage = "None";
  let maxDropoff = 0;
  if (viewed - started > maxDropoff) {
    maxDropoff = viewed - started;
    dropoffStage = "Viewing -> Starting Form";
  }
  if (started - submitted > maxDropoff) {
    maxDropoff = started - submitted;
    dropoffStage = "Starting Form -> Submitting";
  }
  if (submitted - created > maxDropoff) {
    maxDropoff = submitted - created;
    dropoffStage = "Submitting -> Report Creation";
  }

  let recommendation = "Persevere: Feature adoption is strong and operational performance is stable.";
  if (failureRateStatus === "critical") {
    recommendation = "Investigate: High report submission failure rate detected. Immediate backend/API investigation required.";
  } else if (dropoffStage === "Viewing -> Starting Form" && maxDropoff > 10) {
    recommendation = "Improve UX: Significant drop-off after opening Report page. Simplify form fields and entry prompt.";
  } else if (adoptionStatus === "low") {
    recommendation = "Promote/Investigate: Low report volume. Increase feature visibility in main navigation and user dashboard.";
  }

  const decisionIndicators = {
    adoptionStatus,
    usageTrendStatus,
    failureRateStatus,
    dropoffStage,
    recommendation,
    signals: [
      { label: "Adoption Level", value: adoptionStatus.toUpperCase(), color: adoptionStatus === "high" ? "emerald" : adoptionStatus === "moderate" ? "indigo" : "amber" },
      { label: "Usage Trend", value: usageTrendStatus.toUpperCase(), color: usageTrendStatus === "increasing" ? "emerald" : usageTrendStatus === "stable" ? "blue" : "red" },
      { label: "Submission Health", value: failureRateStatus === "normal" ? "HEALTHY" : failureRateStatus === "concerning" ? "amber" : "red" },
      { label: "Funnel Bottleneck", value: dropoffStage, color: "purple" }
    ]
  };

  return {
    range,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    coreMetrics,
    funnel,
    usageTrend,
    breakdown: {
      byCompany,
      byState
    },
    decisionIndicators,
    generatedAt: new Date().toISOString()
  };
};

/**
 * Aggregates production-grade Product Growth (AARRR + DAU/WAU/MAU + Retention + Stickiness) Analytics.
 * Strictly respects multi-tenant authorization scoping.
 */
export const getGrowthAnalyticsService = async (options = {}, reqUser = {}) => {
  const isPlatformOwner = reqUser.role === "platform-owner";
  const isCompanySuperAdmin = reqUser.role === "company-super-admin" || reqUser.role === "super-admin";

  if (!isPlatformOwner && !isCompanySuperAdmin) {
    const error = new Error("Access denied. Insufficient privileges to view product growth analytics.");
    error.statusCode = 403;
    throw error;
  }

  const baseMatch = {};
  const userMatch = {};

  if (!isPlatformOwner) {
    if (!reqUser.companyId) {
      const error = new Error("Company context required for tenant-scoped analytics.");
      error.statusCode = 400;
      throw error;
    }
    baseMatch.companyId = new mongoose.Types.ObjectId(reqUser.companyId.toString());
    userMatch.companyId = new mongoose.Types.ObjectId(reqUser.companyId.toString());
  } else if (options.companyId && options.companyId !== "all") {
    baseMatch.companyId = new mongoose.Types.ObjectId(options.companyId.toString());
    userMatch.companyId = new mongoose.Types.ObjectId(options.companyId.toString());
  }

  if (options.state && options.state !== "all") {
    baseMatch.state = options.state;
    userMatch.state = options.state;
  }

  const { startDate, endDate, previousStartDate, previousEndDate, range } = getPeriodBoundaries(options);

  const currentEventMatch = { ...baseMatch, timestamp: { $gte: startDate, $lt: endDate } };

  // ==================== DAU / WAU / MAU CALCULATIONS ====================
  const oneDayAgo = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

  const prevOneDayAgo = new Date(previousEndDate.getTime() - 24 * 60 * 60 * 1000);
  const prevSevenDaysAgo = new Date(previousEndDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  const prevThirtyDaysAgo = new Date(previousEndDate.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    dauUsers, wauUsers, mauUsers,
    prevDauUsers, prevWauUsers, prevMauUsers,
    newRegistrationsCount, prevRegistrationsCount,
    newCompaniesCount, prevCompaniesCount,
    activeUserDocs
  ] = await Promise.all([
    AnalyticsEvent.distinct("user", { ...baseMatch, timestamp: { $gte: oneDayAgo, $lt: endDate }, user: { $ne: null } }),
    AnalyticsEvent.distinct("user", { ...baseMatch, timestamp: { $gte: sevenDaysAgo, $lt: endDate }, user: { $ne: null } }),
    AnalyticsEvent.distinct("user", { ...baseMatch, timestamp: { $gte: thirtyDaysAgo, $lt: endDate }, user: { $ne: null } }),

    AnalyticsEvent.distinct("user", { ...baseMatch, timestamp: { $gte: prevOneDayAgo, $lt: previousEndDate }, user: { $ne: null } }),
    AnalyticsEvent.distinct("user", { ...baseMatch, timestamp: { $gte: prevSevenDaysAgo, $lt: previousEndDate }, user: { $ne: null } }),
    AnalyticsEvent.distinct("user", { ...baseMatch, timestamp: { $gte: prevThirtyDaysAgo, $lt: previousEndDate }, user: { $ne: null } }),

    User.countDocuments({ ...userMatch, createdAt: { $gte: startDate, $lt: endDate } }),
    User.countDocuments({ ...userMatch, createdAt: { $gte: previousStartDate, $lt: previousEndDate } }),
    isPlatformOwner ? Company.countDocuments({ createdAt: { $gte: startDate, $lt: endDate } }) : 0,
    isPlatformOwner ? Company.countDocuments({ createdAt: { $gte: previousStartDate, $lt: previousEndDate } }) : 0,

    AnalyticsEvent.distinct("user", { ...currentEventMatch, user: { $ne: null } })
  ]);

  const dau = dauUsers.length;
  const wau = wauUsers.length;
  const mau = mauUsers.length;

  const prevDau = prevDauUsers.length;
  const prevWau = prevWauUsers.length;
  const prevMau = prevMauUsers.length;

  const dauMauStickiness = mau > 0 ? Number(((dau / mau) * 100).toFixed(1)) : 0;
  const prevDauMauStickiness = prevMau > 0 ? Number(((prevDau / prevMau) * 100).toFixed(1)) : 0;

  // ==================== ACTIVATION METRICS ====================
  const newUsersInPeriod = await User.find({ ...userMatch, createdAt: { $gte: startDate, $lt: endDate } }).select("_id").lean();
  const newUserIds = newUsersInPeriod.map(u => u._id);

  let activatedUsersCount = 0;
  if (newUserIds.length > 0) {
    const activatedUserList = await AnalyticsEvent.distinct("user", {
      ...baseMatch,
      user: { $in: newUserIds },
      eventName: { $in: ["report_submitted", "report_created", "report_started", "user_login"] }
    });
    activatedUsersCount = activatedUserList.length;
  }

  const activationRate = newRegistrationsCount > 0 ? Number(((activatedUsersCount / newRegistrationsCount) * 100).toFixed(1)) : 0;

  const prevNewUsersInPeriod = await User.find({ ...userMatch, createdAt: { $gte: previousStartDate, $lt: previousEndDate } }).select("_id").lean();
  const prevNewUserIds = prevNewUsersInPeriod.map(u => u._id);
  let prevActivatedUsersCount = 0;
  if (prevNewUserIds.length > 0) {
    const prevActivatedList = await AnalyticsEvent.distinct("user", {
      ...baseMatch,
      user: { $in: prevNewUserIds },
      eventName: { $in: ["report_submitted", "report_created", "report_started", "user_login"] }
    });
    prevActivatedUsersCount = prevActivatedList.length;
  }
  const prevActivationRate = prevRegistrationsCount > 0 ? Number(((prevActivatedUsersCount / prevRegistrationsCount) * 100).toFixed(1)) : 0;

  // ==================== RETENTION METRICS (7d & 30d COHORTS) ====================
  const d14Ago = new Date(endDate.getTime() - 14 * 24 * 60 * 60 * 1000);
  const d7Ago = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
  const d7CohortUsers = await User.find({ ...userMatch, createdAt: { $gte: d14Ago, $lt: d7Ago } }).select("_id").lean();
  const d7CohortIds = d7CohortUsers.map(u => u._id);

  let d7RetainedCount = 0;
  if (d7CohortIds.length > 0) {
    const retained7dList = await AnalyticsEvent.distinct("user", {
      ...baseMatch,
      user: { $in: d7CohortIds },
      timestamp: { $gte: d7Ago, $lt: endDate }
    });
    d7RetainedCount = retained7dList.length;
  }
  const retention7DayRate = d7CohortIds.length > 0 ? Number(((d7RetainedCount / d7CohortIds.length) * 100).toFixed(1)) : 0;

  const d60Ago = new Date(endDate.getTime() - 60 * 24 * 60 * 60 * 1000);
  const d30Ago = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  const d30CohortUsers = await User.find({ ...userMatch, createdAt: { $gte: d60Ago, $lt: d30Ago } }).select("_id").lean();
  const d30CohortIds = d30CohortUsers.map(u => u._id);

  let d30RetainedCount = 0;
  if (d30CohortIds.length > 0) {
    const retained30dList = await AnalyticsEvent.distinct("user", {
      ...baseMatch,
      user: { $in: d30CohortIds },
      timestamp: { $gte: d30Ago, $lt: endDate }
    });
    d30RetainedCount = retained30dList.length;
  }
  const retention30DayRate = d30CohortIds.length > 0 ? Number(((d30RetainedCount / d30CohortIds.length) * 100).toFixed(1)) : 0;

  // ==================== NEW vs RETURNING ACTIVE USERS ====================
  let newActiveUsersCount = 0;
  let returningActiveUsersCount = 0;

  if (activeUserDocs.length > 0) {
    const activeUsersInDb = await User.find({ _id: { $in: activeUserDocs } }).select("_id createdAt").lean();
    for (const u of activeUsersInDb) {
      if (u.createdAt >= startDate && u.createdAt < endDate) {
        newActiveUsersCount++;
      } else {
        returningActiveUsersCount++;
      }
    }
  }

  // ==================== DAILY TIME-SERIES GROWTH TRENDS ====================
  const dailyRegRaw = await User.aggregate([
    { $match: { ...userMatch, createdAt: { $gte: startDate, $lt: endDate } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 }
      }
    }
  ]);
  const regMap = new Map(dailyRegRaw.map(r => [r._id, r.count]));

  const dailyActiveRaw = await AnalyticsEvent.aggregate([
    { $match: currentEventMatch },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
          user: "$user"
        }
      }
    },
    {
      $group: {
        _id: "$_id.date",
        activeUsers: { $sum: 1 }
      }
    }
  ]);
  const activeMap = new Map(dailyActiveRaw.map(a => [a._id, a.activeUsers]));

  const dayMs = 24 * 60 * 60 * 1000;
  const totalDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / dayMs));
  const growthTrends = [];

  for (let i = 0; i < totalDays; i++) {
    const d = new Date(startDate.getTime() + i * dayMs);
    const dateKey = d.toISOString().split("T")[0];
    growthTrends.push({
      date: dateKey,
      newRegistrations: regMap.get(dateKey) || 0,
      activeUsers: activeMap.get(dateKey) || 0
    });
  }

  // ==================== COMPANY & REGIONAL BREAKDOWNS ====================
  let byCompanyGrowth = [];
  let byStateGrowth = [];

  if (isPlatformOwner) {
    const companyAgg = await User.aggregate([
      { $match: { createdAt: { $gte: startDate, $lt: endDate } } },
      { $group: { _id: "$companyId", newUsers: { $sum: 1 } } }
    ]);

    const companyObjectIds = companyAgg.map(c => c._id).filter(id => mongoose.Types.ObjectId.isValid(id));
    const companyDocs = await Company.find({ _id: { $in: companyObjectIds } }).select("name shortName code").lean();
    const cMap = new Map(companyDocs.map(c => [c._id.toString(), c]));

    byCompanyGrowth = companyAgg.map(item => {
      const cId = item._id ? item._id.toString() : "unassigned";
      const comp = cMap.get(cId);
      return {
        companyId: cId,
        companyName: comp ? comp.name : "General Utility",
        companyCode: comp ? comp.code : "GLOBAL",
        newUsers: item.newUsers
      };
    }).sort((a, b) => b.newUsers - a.newUsers);
  }

  const stateAgg = await User.aggregate([
    { $match: { ...userMatch, createdAt: { $gte: startDate, $lt: endDate } } },
    { $group: { _id: "$state", newUsers: { $sum: 1 } } }
  ]);
  byStateGrowth = stateAgg.map(s => ({
    state: s._id || "Unspecified",
    newUsers: s.newUsers
  })).sort((a, b) => b.newUsers - a.newUsers);

  // ==================== PRODUCT DECISION INDICATORS ====================
  let growthVerdict = "PERSEVERE";
  let growthMessage = "Healthy user acquisition and stable product engagement.";

  if (dauMauStickiness < 15 && retention7DayRate < 15) {
    growthVerdict = "IMPROVE";
    growthMessage = "Significant post-registration drop-off. Simplify onboarding and entry prompt.";
  } else if (dauMauStickiness < 10) {
    growthVerdict = "INVESTIGATE";
    growthMessage = "Daily active user engagement stickiness is low relative to monthly audience.";
  } else if (activationRate < 10 && newRegistrationsCount > 20) {
    growthVerdict = "PIVOT";
    growthMessage = "Registered users fail to complete first value-adding action.";
  }

  const revenueStatus = {
    status: "NOT_IMPLEMENTED",
    title: "Revenue Model Unavailable",
    message: "Nikola platform does not currently have a subscription/billing model configured. Revenue analytics will activate when paid tiers or platform billing are enabled."
  };

  // ==================== REFERRAL ANALYTICS ====================
  const referralClicksCount = await AnalyticsEvent.countDocuments({
    ...baseMatch,
    eventName: "referral_clicked",
    timestamp: { $gte: startDate, $lt: endDate }
  });

  const referralSignupsCount = await AnalyticsEvent.countDocuments({
    ...baseMatch,
    eventName: "referral_signup",
    timestamp: { $gte: startDate, $lt: endDate }
  });

  const prevReferralClicksCount = await AnalyticsEvent.countDocuments({
    ...baseMatch,
    eventName: "referral_clicked",
    timestamp: { $gte: previousStartDate, $lt: previousEndDate }
  });

  const prevReferralSignupsCount = await AnalyticsEvent.countDocuments({
    ...baseMatch,
    eventName: "referral_signup",
    timestamp: { $gte: previousStartDate, $lt: previousEndDate }
  });

  // Referred users activation: count signups that completed an action
  const referredUserIds = await AnalyticsEvent.distinct("userId", {
    ...baseMatch,
    eventName: "referral_signup",
    timestamp: { $gte: startDate, $lt: endDate }
  });

  let referredActivatedCount = 0;
  if (referredUserIds.length > 0) {
    const activatedList = await AnalyticsEvent.distinct("user", {
      ...baseMatch,
      user: { $in: referredUserIds },
      eventName: { $in: ["report_submitted", "report_created", "report_started", "user_login"] },
      timestamp: { $gte: startDate, $lt: endDate }
    });
    referredActivatedCount = activatedList.length;
  }

  const referralConversionRate = referralClicksCount > 0 ? Number(((referralSignupsCount / referralClicksCount) * 100).toFixed(1)) : 0;
  const referralActivationRate = referralSignupsCount > 0 ? Number(((referredActivatedCount / referralSignupsCount) * 100).toFixed(1)) : 0;

  const prevReferralConversionRate = prevReferralClicksCount > 0 ? Number(((prevReferralSignupsCount / prevReferralClicksCount) * 100).toFixed(1)) : 0;
  const prevReferralActivationRate = prevReferralSignupsCount > 0 ? Number(((prevReferralSignupsCount / prevReferralSignupsCount) * 100).toFixed(1)) : 0;

  const referralStatus = referralSignupsCount > 0 || referralClicksCount > 0 ? {
    status: "ACTIVE",
    clicks: referralClicksCount,
    clicksTrend: calculateTrendPercentage(referralClicksCount, prevReferralClicksCount),
    signups: referralSignupsCount,
    signupsTrend: calculateTrendPercentage(referralSignupsCount, prevReferralSignupsCount),
    conversionRate: referralConversionRate,
    conversionTrend: Number((referralConversionRate - prevReferralConversionRate).toFixed(1)),
    activationRate: referralActivationRate,
    activationTrend: Number((referralActivationRate - prevReferralActivationRate).toFixed(1))
  } : {
    status: "PENDING_ATTRIBUTION",
    title: "Referral Attribution Pending",
    message: "No referral activity recorded yet. Referral analytics will activate when users start using referral links."
  };

  return {
    range,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    overview: {
      dau,
      wau,
      mau,
      dauMauStickiness,
      activationRate,
      retention7DayRate,
      retention30DayRate,
      newRegistrations: newRegistrationsCount,
      newCompanies: newCompaniesCount,
      trends: {
        dauTrend: calculateTrendPercentage(dau, prevDau),
        wauTrend: calculateTrendPercentage(wau, prevWau),
        mauTrend: calculateTrendPercentage(mau, prevMau),
        stickinessTrend: Number((dauMauStickiness - prevDauMauStickiness).toFixed(1)),
        activationTrend: Number((activationRate - prevActivationRate).toFixed(1)),
        registrationsTrend: calculateTrendPercentage(newRegistrationsCount, prevRegistrationsCount)
      }
    },
    aarrr: {
      acquisition: {
        newRegistrations: newRegistrationsCount,
        newCompanies: newCompaniesCount,
        registrationsTrend: calculateTrendPercentage(newRegistrationsCount, prevRegistrationsCount)
      },
      activation: {
        activatedUsers: activatedUsersCount,
        registeredUsers: newRegistrationsCount,
        activationRate,
        activationTrend: Number((activationRate - prevActivationRate).toFixed(1))
      },
      retention: {
        dau,
        wau,
        mau,
        dauMauStickiness,
        retention7DayRate,
        retention30DayRate,
        newActiveUsers: newActiveUsersCount,
        returningActiveUsers: returningActiveUsersCount
      },
      revenue: revenueStatus,
      referral: referralStatus
    },
    growthTrends,
    breakdown: {
      byCompany: byCompanyGrowth,
      byState: byStateGrowth
    },
    decisionGuidance: {
      verdict: growthVerdict,
      message: growthMessage
    },
    extensionPoints: {
      featureFlagsSupported: true,
      abTestingReady: true,
      featureLevelRetentionReady: true
    },
    generatedAt: new Date().toISOString()
  };
};
