import axios from "axios";
import Report from "../models/Report.js";
import Outage from "../models/Outage.js";
import PowerStatus from "../models/PowerStatus.js";
import Prediction from "../models/Prediction.js";
import Notification from "../models/Notification.js";
import Feeder from "../models/Location/Feeder.js";
import PowerLog from "../models/PowerLog.js";
import { detectIntent } from "./intentEngine.js";
import { getMemory, updateMemory, logMemoryDebug } from "./conversationMemory.js";
import { routeResponse } from "./responseRouter.js";
import LocationEngine from "./locationEngine.js";
import { isValidGeminiKey } from "./aiKeyValidator.js";

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const ANALYTICS_CACHE_TTL_MS = 60 * 1000;
const analyticsSnapshotCache = new Map();

if (!isValidGeminiKey(GEMINI_KEY)) {
  console.warn("[AI] GEMINI_API_KEY is not set or placeholder — Using high-fidelity heuristic simulation mode.");
}

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getAnalyticsStatsLabel = ({ activeOutagesCount, globalRiskScore }) => {
  if (activeOutagesCount > 0) return "Alert";
  if (globalRiskScore < 40) return "Critical";
  if (globalRiskScore < 75) return "Watch";
  return "Stable";
};

const getBaseAnalyticsInsights = ({ highRiskFeeders, activeOutagesCount }) => [
  highRiskFeeders.length > 0
    ? `High probability of issues in ${highRiskFeeders[0].feeder} feeder due to frequent incidents.`
    : "Grid stability is currently optimal across all monitored feeders.",
  activeOutagesCount > 0
    ? `Currently tracking ${activeOutagesCount} active outages across the network.`
    : "No active wide-area outages detected.",
  "AI models predict increased load sharing may be required in high-risk zones.",
  "Maintenance teams should prioritize feeders with 'Red' status."
];

const getCachedAnalyticsSnapshot = async ({ range, buildSnapshot }) => {
  const cacheKey = `analytics:${range}`;
  const now = Date.now();
  const existingEntry = analyticsSnapshotCache.get(cacheKey);

  if (existingEntry?.data && now - existingEntry.updatedAt < ANALYTICS_CACHE_TTL_MS) {
    return existingEntry.data;
  }

  if (existingEntry?.promise) {
    return existingEntry.promise;
  }

  const buildPromise = (async () => {
    try {
      const data = await buildSnapshot();
      analyticsSnapshotCache.set(cacheKey, { data, updatedAt: Date.now(), promise: null });
      return data;
    } catch (error) {
      if (existingEntry?.data) {
        console.warn(`[AI Service] Returning stale analytics snapshot for ${range}:`, error.message);
        return existingEntry.data;
      }
      throw error;
    } finally {
      const latestEntry = analyticsSnapshotCache.get(cacheKey);
      if (latestEntry?.promise) {
        analyticsSnapshotCache.set(cacheKey, { ...latestEntry, promise: null });
      }
    }
  })();

  analyticsSnapshotCache.set(cacheKey, {
    data: existingEntry?.data || null,
    updatedAt: existingEntry?.updatedAt || 0,
    promise: buildPromise
  });

  return buildPromise;
};

/**
 * Strips markdown code blocks from a text string.
 */
const cleanJSONString = (str) => {
  if (!str) return "";
  return str
    .replace(/```json/gi, "")
    .replace(/```/gi, "")
    .trim();
};

/**
 * Generates a concise executive narrative from already-collected platform facts.
 * The caller remains responsible for deterministic scoring and heuristic fallback.
 */
export const generateExecutiveNarrative = async (facts) => {
  if (!isValidGeminiKey(GEMINI_KEY)) return null;

  const promptText = `You are the Litha Platform Executive Intelligence assistant.
Use only the supplied platform facts. Do not invent values, causes, or recommendations.
Return raw JSON only using this schema:
{
  "summary": "one concise executive sentence",
  "insights": ["up to 3 concise evidence-based insights"],
  "recommendations": ["up to 3 actionable recommendations grounded in the facts"]
}
Platform facts:
${JSON.stringify(facts)}`;

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      { contents: [{ parts: [{ text: promptText }] }] },
      { headers: { "Content-Type": "application/json" }, timeout: 8000 }
    );

    const candidateText = response?.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) return null;

    const parsed = JSON.parse(cleanJSONString(candidateText));
    if (typeof parsed.summary !== "string" || !Array.isArray(parsed.insights) || !Array.isArray(parsed.recommendations)) {
      return null;
    }

    return {
      source: "gemini",
      summary: parsed.summary.trim(),
      insights: parsed.insights.filter(Boolean).slice(0, 3),
      recommendations: parsed.recommendations.filter(Boolean).slice(0, 3)
    };
  } catch (error) {
    console.warn(`[AI Service] Executive narrative unavailable: ${error.message}`);
    return null;
  }
};

/**
 * Resolves a location reference from user input using the Location Engine
 * Supports LGA, Ward, and Feeder names
 */
const resolveLocationFromContext = async (userInput, userContext = {}) => {
  try {
    // Extract location mention from user input
    const words = userInput.toLowerCase().split(/\s+/);
    
    for (const word of words) {
      // Try to resolve as location
      const resolved = await LocationEngine.resolveLocation(word, "Kano");
      if (resolved) {
        return {
          type: resolved.type,
          location: resolved.location,
          matched: word
        };
      }
    }

    // Try multi-word phrases
    const phrases = userInput.match(/\b[\w\s]{3,30}\b/g) || [];
    for (const phrase of phrases) {
      const resolved = await LocationEngine.resolveLocation(phrase.trim(), "Kano");
      if (resolved) {
        return {
          type: resolved.type,
          location: resolved.location,
          matched: phrase.trim()
        };
      }
    }

    return null;
  } catch (err) {
    console.log("[LocationEngine] Resolution failed (non-critical):", err.message);
    return null;
  }
};

/**
 * Heuristic generator to serve as fallback for report analysis.
 */
const getHeuristicReportAnalysis = (report) => {
  const issue = (report.issueType || "Other").toLowerCase();
  const desc = (report.description || "").toLowerCase();
  const area = report.area || "Unknown Area";
  const feeder = report.feeder || "Unknown Feeder";

  let classification = "Other";
  let severity = "medium";
  let summary = `Incident reported in ${area} on ${feeder} feeder.`;
  let likelyCauses = ["Grid instability", "Local load sharing"];
  let suggestedActions = ["Deploy grid team to verify feeder status"];

  if (issue.includes("outage") || issue.includes("no light") || desc.includes("no light")) {
    classification = "Power Outage";
    severity = desc.includes("spark") || desc.includes("fire") || desc.includes("pole") ? "high" : "medium";
    summary = `Total power blackout reported in ${area} on the ${feeder} feeder.`;
    likelyCauses = ["Feeder breaker trip", "Substation protection lock", "Scheduled load shedding"];
    suggestedActions = ["Check substation circuit breakers", "Confirm planned maintenance schedules", "Initiate feeder line inspection"];
  } else if (issue.includes("voltage") || issue.includes("low") || desc.includes("low voltage") || desc.includes("fluctuat")) {
    classification = "Low Voltage";
    severity = "medium";
    summary = `Voltage drop and severe fluctuations affecting consumer appliances in ${area}.`;
    likelyCauses = ["Distribution transformer overload", "Imbalanced single-phase loading", "High resistance joint on neutral line"];
    suggestedActions = ["Perform load measurements on active phases", "Inspect low-tension distribution lines", "Ensure neutral ground integrity"];
  } else if (issue.includes("spark") || issue.includes("transformer") || desc.includes("spark") || desc.includes("explode") || desc.includes("transformer")) {
    classification = "Transformer Fault";
    severity = "high";
    summary = `Visible sparks or thermal anomalies detected at the local distribution transformer on ${feeder}.`;
    likelyCauses = ["Low transformer oil levels", "Dielectric breakdown in windings", "Short circuit due to overlapping distribution cables"];
    suggestedActions = ["Isolate the transformer at the feeder pillar", "Deploy urgent maintenance unit to check oil levels", "Test insulation resistance"];
  } else if (issue.includes("pole") || issue.includes("broken") || desc.includes("pole") || desc.includes("fallen")) {
    classification = "Cable Issue"; // Maps to standard categories
    severity = "critical";
    summary = `Severe physical infrastructure damage: Fallen or broken electricity pole in ${area}.`;
    likelyCauses = ["Heavy storm winds", "Vehicular accident impact", "Rotten wooden pole foundation"];
    suggestedActions = ["Isolate overhead line segment immediately to prevent electrocution", "Dispatch poles replacement crew", "Re-string distribution lines"];
  } else if (issue.includes("cable") || issue.includes("wire") || desc.includes("cable") || desc.includes("wire")) {
    classification = "Cable Issue";
    severity = "high";
    summary = `Distribution line cable fault or snapped overhead wire reported on ${feeder}.`;
    likelyCauses = ["Overheating due to line overload", "Tree branches contact", "Aging cable insulation failure"];
    suggestedActions = ["Trace cable line to identify point of snap", "Isolate overhead lines", "Splice or replace damaged cable sections"];
  }

  return {
    classification,
    severity,
    summary,
    likelyCauses,
    suggestedActions
  };
};

/**
 * Analyzes an outage report using the official Google Gemini API (or high-fidelity local fallback).
 */
export const analyzeReportWithAI = async (reportId) => {
  try {
    const report = await Report.findById(reportId);
    if (!report) throw new Error("Report not found");

    // Standard high-fidelity fallback if key is missing or placeholder
    if (!isValidGeminiKey(GEMINI_KEY)) {
      const fallback = getHeuristicReportAnalysis(report);
      report.aiClassification = fallback.classification;
      report.severity = fallback.severity;
      report.aiSummary = fallback.summary;
      await report.save();

      return {
        classification: fallback.classification,
        severity: fallback.severity,
        summary: fallback.summary,
        insights: `[Local AI Engine] Likely Causes: ${fallback.likelyCauses.join(", ")}. Suggested Maintenance: ${fallback.suggestedActions.join(", ")}`
      };
    }

    const promptText = `Analyze this electricity incident report for the Litha platform:
- Issue Type: ${report.issueType}
- Description: ${report.description}
- Area: ${report.area}
- Feeder: ${report.feeder}

You MUST return a raw, valid JSON object matching this exact schema:
{
  "classification": "Power Outage" | "Low Voltage" | "Transformer Fault" | "Cable Issue" | "Other",
  "severity": "low" | "medium" | "high" | "critical",
  "summary": "Brief 1-sentence description under 20 words",
  "likelyCauses": ["Cause 1", "Cause 2"],
  "suggestedActions": ["Action 1", "Action 2"]
}
Do not include any markdown tags, backticks (\`\`\`json), or conversational preambles. Output raw JSON only.`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;
    
    const response = await axios.post(geminiUrl, {
      contents: [
        {
          parts: [
            {
              text: promptText
            }
          ]
        }
      ]
    }, {
      headers: { "Content-Type": "application/json" },
      timeout: 8000
    });

    const candidateText = response?.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      throw new Error("Empty response from Gemini API");
    }

    const cleanedJson = cleanJSONString(candidateText);
    const parsed = JSON.parse(cleanedJson);

    report.aiClassification = parsed.classification || report.issueType || "Other";
    report.severity = parsed.severity || "medium";
    report.aiSummary = parsed.summary || report.description;
    await report.save();

    return {
      classification: report.aiClassification,
      severity: report.severity,
      summary: report.aiSummary,
      insights: `Likely Causes: ${(parsed.likelyCauses || []).join(", ")}. Suggested Maintenance: ${(parsed.suggestedActions || []).join(", ")}`
    };

  } catch (error) {
    console.error(`[AI Service] Error analyzing report: ${error.message}. falling back to local heuristic model.`);
    
    // Graceful recovery: Fallback model
    try {
      const report = await Report.findById(reportId);
      if (report) {
        const fallback = getHeuristicReportAnalysis(report);
        report.aiClassification = fallback.classification;
        report.severity = fallback.severity;
        report.aiSummary = fallback.summary;
        await report.save();

        return {
          classification: fallback.classification,
          severity: fallback.severity,
          summary: fallback.summary,
          insights: `[AI Fallback] Likely Causes: ${fallback.likelyCauses.join(", ")}. Suggested Maintenance: ${fallback.suggestedActions.join(", ")}`
        };
      }
    } catch (innerError) {
      console.error("[AI Service] Fallback failed:", innerError.message);
    }

    return {
      classification: "Other",
      severity: "medium",
      summary: "AI analysis unavailable at this time.",
      insights: "Suggested Maintenance: Deploy standard check team to investigate."
    };
  }
};

/**
 * Intelligent Grid Chat Assistant Endpoint.
 */
export const chatAssistant = async ({ userQuery, context = {}, user = null }) => {
  const queryLower = (userQuery || "").toLowerCase();
  let feeder = context.feeder || "";
  let area = context.area || context.ward || context.state || "";
  let resolvedLocation = null;

  // Get active user session memory
  const userId = user ? user._id : (context.sessionId || context.chatSessionId || "anonymous");
  const memory = getMemory(userId);

  // Try to resolve location from user input using LocationEngine
  try {
    resolvedLocation = await resolveLocationFromContext(userQuery, context);
    if (resolvedLocation) {
      console.log(`[LocationEngine] Resolved as ${resolvedLocation.type}: ${resolvedLocation.matched}`);
      
      // Extract location details based on resolution type
      if (resolvedLocation.type === "lga") {
        area = resolvedLocation.location.lga.name;
      } else if (resolvedLocation.type === "ward") {
        area = resolvedLocation.location.ward.name;
      } else if (resolvedLocation.type === "feeder") {
        feeder = resolvedLocation.location.feeder.name;
      }
    }
  } catch (err) {
    console.log("[LocationEngine] Resolution attempt failed:", err.message);
  }

  // Apply memory inheritance rules
  if (memory.currentFeeder && !feeder) {
    feeder = memory.currentFeeder;
    console.log(`\n[AI MEMORY HIT]\nUsing stored feeder: ${feeder}\n`);
  }
  if (memory.currentArea && !area) {
    area = memory.currentArea;
    console.log(`\n[AI MEMORY HIT]\nUsing stored area: ${area}\n`);
  }

  // Detect query intent
  const detectedIntent = detectIntent(userQuery);
  console.log(`\n[AI INTENT DETECTED]\n${detectedIntent}\n`);

  // 1. Resolve feeder details
  let feederDoc = null;
  let feederName = feeder;
  let feederId = null;

  try {
    const allFeeders = await Feeder.find({ isActive: true }).lean();
    
    // Check if query contains any known feeder name
    let matchedFeeder = null;
    for (const f of allFeeders) {
      if (queryLower.includes(f.name.toLowerCase())) {
        matchedFeeder = f;
        break;
      }
    }

    if (matchedFeeder) {
      feederDoc = matchedFeeder;
    } else if (feeder) {
      if (/^[0-9a-fA-F]{24}$/.test(feeder)) {
        feederDoc = await Feeder.findById(feeder).lean();
      } else {
        feederDoc = await Feeder.findOne({ name: { $regex: new RegExp(`^${feeder}$`, "i") } }).lean();
      }
    }

    if (feederDoc) {
      feederName = feederDoc.name;
      feederId = feederDoc._id;
    }
    console.log(`[DEBUG] Feeder Found: ${feederDoc ? 'YES' : 'NO'}`);
  } catch (err) {
    console.error("[Chat Assistant] Feeder resolution error:", err.message);
    console.log("[DEBUG] Feeder Found: NO");
  }

  // 1.5 Area Fallback Logic
  const hasFeeder = !!feederName;
  const hasArea = !!area;

  if (!hasFeeder && !hasArea) {
    const isHausa = queryLower.includes("wuta") || queryLower.includes("yaushe") || queryLower.includes("babu") || queryLower.includes("matsala") || queryLower.includes("gyara") || queryLower.includes("yasa") || queryLower.includes("maido");
    const askMsg = isHausa 
      ? "Domin samar muku da takamaiman bayanin grid din ku, don Allah za ku iya bayyana sunan layinku (feeder) ko yankinku (area)?"
      : "To provide you with accurate grid status and outage intelligence, could you please specify your feeder or area name?";
    return { text: askMsg + "\n\nSuggested Actions: Report a fault" };
  }

  // 2. Fetch comprehensive live contextual data
  let activeOutages = [];
  let recentReports = [];
  let powerStatus = null;
  let activePrediction = null;
  let recentAnnouncements = [];
  let feederHealth = null;
  let powerLogs = [];
  let userRecentReports = [];

  try {
    const statsPromise = getAnalyticsDashboardData({ range: "week" }).catch(() => null);

    const [outagesRes, reportsRes, powerStatusRes, predictionRes, announcementsRes, statsRes, powerLogsRes, userReportsRes] = await Promise.all([
      Outage.find({
        $or: [
          ...(feederName ? [{ feeder: feederName }] : []),
          ...(area ? [{ area }] : [])
        ],
        active: true
      }).lean(),
      Report.find({
        $or: [
          ...(feederName ? [{ feeder: feederName }] : []),
          ...(area ? [{ area }] : [])
        ]
      }).sort({ createdAt: -1 }).limit(10).lean(),
      feederId ? PowerStatus.findOne({ feeder: feederId }).populate("updatedBy", "fullName").lean() : Promise.resolve(null),
      Prediction.findOne({
        $or: [
          ...(feederName ? [{ feeder: feederName }] : []),
          ...(area ? [{ area }] : [])
        ]
      }).sort({ createdAt: -1 }).lean(),
      Notification.find({
        $or: [
          ...(feederName ? [{ feeder: feederName }] : []),
          ...(area ? [{ area }] : [])
        ]
      }).sort({ createdAt: -1 }).limit(3).lean(),
      statsPromise,
      feederId ? PowerLog.find({ feeder: feederId }).sort({ timestamp: -1 }).limit(10).lean() : (area ? PowerLog.find({ feederName: { $regex: new RegExp(`^${area}$`, "i") } }).sort({ timestamp: -1 }).limit(10).lean() : Promise.resolve([])),
      user && user._id ? Report.find({ user: user._id }).sort({ createdAt: -1 }).limit(3).lean() : Promise.resolve([])
    ]);

    activeOutages = outagesRes || [];
    recentReports = reportsRes || [];
    powerStatus = powerStatusRes;
    activePrediction = predictionRes;
    recentAnnouncements = announcementsRes || [];
    powerLogs = powerLogsRes || [];
    userRecentReports = userReportsRes || [];

    console.log(`[DEBUG] Maintenance Found: ${powerStatusRes && powerStatusRes.status === "maintenance" ? "YES" : "NO"}`);
    console.log(`[DEBUG] Active Outage Found: ${outagesRes && outagesRes.length > 0 ? "YES" : "NO"}`);
    console.log(`[DEBUG] Prediction Found: ${predictionRes ? "YES" : "NO"}`);
    console.log(`[DEBUG] Reports Found: ${reportsRes ? reportsRes.length : 0}`);

    if (statsRes && statsRes.feederHealth) {
      if (feederId) {
        feederHealth = statsRes.feederHealth.find(
          h => h.feederId.toString() === feederId.toString() || h.feeder.toLowerCase() === feederName.toLowerCase()
        );
      } else if (area) {
        feederHealth = statsRes.feederHealth.find(h => h.feeder.toLowerCase().includes(area.toLowerCase()));
      }
    }
  } catch (err) {
    console.error("[Chat Assistant] Context retrieval error:", err.message);
  }

  // Report analysis: count, dominant issue, trend
  const reportsCount = recentReports.length;
  let dominantIssue = "None";
  let complaintTrendEn = "stable";
  let complaintTrendHa = "daidai gwargwado";

  if (reportsCount > 0) {
    const issueCounts = {};
    recentReports.forEach(r => {
      issueCounts[r.issueType] = (issueCounts[r.issueType] || 0) + 1;
    });
    dominantIssue = Object.keys(issueCounts).reduce((a, b) => issueCounts[a] > issueCounts[b] ? a : b);

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const reportsLast24h = recentReports.filter(r => new Date(r.createdAt) >= oneDayAgo).length;
    if (reportsLast24h >= 4) {
      complaintTrendEn = "increasing rapidly";
      complaintTrendHa = "yana karuwa sosai";
    } else if (reportsLast24h >= 1) {
      complaintTrendEn = "slightly increasing";
      complaintTrendHa = "yana karuwa kadan";
    }
  }

  // User report memory reference
  let userReportTextEn = "";
  let userReportTextHa = "";
  if (userRecentReports.length > 0) {
    const rep = userRecentReports[0];
    const timeStr = new Date(rep.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    userReportTextEn = `You reported a ${rep.issueType} issue on ${rep.feeder || rep.area} at ${timeStr}.`;
    userReportTextHa = `Kun aiko da rahoton matsalar ${rep.issueType} akan ${rep.feeder || rep.area} da karfe ${timeStr}.`;
  }

  // Trend analysis (historical patterns)
  let offlineCount = 0;
  let maintenanceCount = 0;
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  
  powerLogs.forEach(log => {
    const logDate = new Date(log.timestamp || log.createdAt);
    if (logDate >= threeDaysAgo) {
      if (log.status === "off") offlineCount++;
      if (log.status === "maintenance") maintenanceCount++;
    }
  });

  let trendExplanationEn = "";
  let trendExplanationHa = "";
  if (offlineCount >= 3) {
    trendExplanationEn = `This network segment experienced outages on ${offlineCount} separate occasions over the last three days and is showing instability patterns.`;
    trendExplanationHa = `Wannan bangare na grid ya fuskanci katsewar wuta har sau ${offlineCount} a cikin kwanaki uku da suka gabata kuma yana nuna alamun rashin kwanciyar html.`;
  } else if (maintenanceCount >= 2) {
    trendExplanationEn = `This segment has undergone recurring maintenance (scheduled ${maintenanceCount} times recently) to optimize performance.`;
    trendExplanationHa = `Wannan bangare ya fuskanci ayyukan gyare-gyare akai-akai (sau ${maintenanceCount} kwanan nan) don inganta aiki.`;
  } else if (feederHealth && feederHealth.status === "Red") {
    trendExplanationEn = `This segment is currently categorized as highly unstable (Red Status) with high risk of recurrent trips.`;
    trendExplanationHa = `Wannan bangare a halin yanzu an sanya shi a matsayin mai matukar rashin kwanciyar hankali (Matsayin Red) mai babban hadarin yanke wuta.`;
  } else {
    trendExplanationEn = `No severe instability patterns detected over the last few days. Grid trend is stable.`;
    trendExplanationHa = `Babu wani babban rashin kwanciyar hankali da aka gano a cikin 'yan kwanakin nan. Yanayin grid din yana da kyau.`;
  }

  // Escalation Priority Engine
  const transformerIncidents = recentReports.filter(r => r.issueType === "Transformer Fault" || r.issueType === "Cable Issue").length;
  // Use (100 - healthScore) since healthScore is higher = better, so lower health = higher risk
  const feederHealthRisk = feederHealth ? (100 - feederHealth.healthScore) : 15;
  const predictionRiskVal = activePrediction ? (activePrediction.riskLevel === "critical" ? 30 : activePrediction.riskLevel === "high" ? 20 : activePrediction.riskLevel === "medium" ? 10 : 5) : 0;
  
  const escalationScore = (reportsCount * 2) + (activeOutages.length * 25) + (transformerIncidents * 15) + (feederHealthRisk * 0.5) + predictionRiskVal;
  
  let severityLevel = "LOW";
  if (escalationScore > 75) severityLevel = "CRITICAL";
  else if (escalationScore > 45) severityLevel = "HIGH";
  else if (escalationScore > 20) severityLevel = "MEDIUM";

  let urgencyAlertEn = "";
  let urgencyAlertHa = "";
  if (severityLevel === "HIGH" || severityLevel === "CRITICAL") {
    urgencyAlertEn = `❗ URGENT STATUS: This feeder segment is under ${severityLevel} operational stress. Immediate technical attention is required.`;
    urgencyAlertHa = `❗ GARGADI MAI GAURA: Wannan layin yana karkashin damuwar aiki mai matakin ${severityLevel}. Ana bukatar daukar mataki na gaggawa.`;
  }

  // Prediction confidence formatting
  let predictionTextEn = "";
  let predictionTextHa = "";
  if (activePrediction) {
    const score = activePrediction.confidenceScore || activePrediction.confidence || 0;
    const confidencePercent = (score * 100).toFixed(0);
    const risk = activePrediction.riskLevel || "medium";
    const explanation = activePrediction.predictedCause || activePrediction.prediction || "load shedding or grid overload";
    
    predictionTextEn = `There is a ${confidencePercent}% confidence of ${explanation} (Risk Level: ${risk.toUpperCase()}) based on historical outage patterns.`;
    predictionTextHa = `Akwai tabbacin ${confidencePercent}% na afukuwar ${explanation} (Matakin Hadari: ${risk.toUpperCase()}) dangane da yanayin outage na baya.`;
  }

  // [AI CONTEXT DEBUG] Extensive logging
  console.log(`\n[AI CONTEXT DEBUG]`);
  console.log(`USER AREA: ${area || 'None'}`);
  console.log(`USER FEEDER: ${feederName || 'None'}`);
  console.log(`ACTIVE OUTAGES: ${activeOutages.length}`);
  console.log(`REPORT COUNT: ${recentReports.length}`);
  console.log(`DOMINANT ISSUE: ${dominantIssue}`);
  console.log(`COMPLAINT TREND: ${complaintTrendEn}`);
  console.log(`ESCALATION SEVERITY: ${severityLevel} (Score: ${escalationScore})`);
  console.log(`PREDICTION: ${predictionTextEn}`);
  console.log(`FEEDER HEALTH: ${feederHealth ? `${feederHealth.status} (Risk: ${feederHealth.riskScore}%, Uptime: ${feederHealth.uptimePercent}%)` : 'None'}`);

  // Construct a highly detailed system prompt describing the grid context
  const buildGridContextString = () => {
    let contextStr = `LIVE GRID CONTEXT (Location: ${feederName || 'Unknown Feeder'} - ${area || 'Unknown Area'}):\n\n`;
    
    if (powerStatus) {
      contextStr += `FEEDER STATUS: ${powerStatus.status.toUpperCase()}. Active Status: ${powerStatus.isActive ? "ON" : "OFF"}. Last Updated: ${powerStatus.lastUpdated ? new Date(powerStatus.lastUpdated).toLocaleString() : 'Just Now'}. Expected Change Time / Restoration Expected: ${powerStatus.estimatedNextOutage || 'TBD'}. Updated By Admin: ${powerStatus.updatedBy ? powerStatus.updatedBy.fullName : 'operations staff'}.\n`;
    } else {
      contextStr += `FEEDER STATUS: Unknown (no monitor logged).\n`;
    }

    if (activeOutages.length > 0) {
      contextStr += `ACTIVE OUTAGES: ${activeOutages.length} active outage(s) reported.\n`;
      activeOutages.forEach(o => {
        contextStr += `- Cause: ${o.cause || o.outageType || 'Unknown'}. Severity: ${o.severity}. Reported at: ${o.createdAt ? new Date(o.createdAt).toLocaleString() : 'TBD'}. Restoration Expected / Estimated Restore Time: ${o.estimatedRestoreTime ? new Date(o.estimatedRestoreTime).toLocaleString() : 'TBD'}.\n`;
      });
    } else {
      contextStr += `ACTIVE OUTAGES: No active outage records officially logged.\n`;
    }

    if (feederHealth) {
      contextStr += `FEEDER HEALTH: Status: ${feederHealth.status}. Risk Score: ${feederHealth.riskScore}%. Uptime: ${feederHealth.uptimePercent}%.\n`;
    }

    if (activePrediction) {
      const score = activePrediction.confidenceScore || activePrediction.confidence || 0;
      contextStr += `AI PREDICTIONS: Outage Risk: ${activePrediction.riskLevel || 'Low'}. Confidence: ${(score * 100).toFixed(0)}%. Predicted Cause / Possible Cause: ${activePrediction.predictedCause || activePrediction.prediction || 'Grid Load'}. Full Statement: ${predictionTextEn}\n`;
    }

    if (recentAnnouncements.length > 0) {
      contextStr += `RECENT ANNOUNCEMENTS:\n`;
      recentAnnouncements.forEach(a => {
        contextStr += `- ${a.title}: ${a.body}\n`;
      });
    }

    if (recentReports.length > 0) {
      contextStr += `RECENT USER REPORTS / COMPLAINTS:\n`;
      contextStr += `- Total complaints: ${reportsCount}. Dominant type: ${dominantIssue}. Trend: ${complaintTrendEn}.\n`;
      recentReports.forEach(r => {
        contextStr += `- Type: ${r.issueType}. Description: ${r.description}. Severity: ${r.severity}. Status: ${r.status}.\n`;
      });
    }

    if (userRecentReports.length > 0) {
      contextStr += `AUTHENTICATED USER'S OWN HISTORY: ${userReportTextEn}\n`;
    }

    contextStr += `HISTORICAL TRENDS: ${trendExplanationEn}\n`;
    contextStr += `GRID ESCALATION LEVEL: ${severityLevel} (Score: ${escalationScore}). Urgency Alert: ${urgencyAlertEn}\n`;

    return contextStr;
  };

  const gridContext = buildGridContextString();

  const aiContext = {
    user: user ? { _id: user._id, fullName: user.fullName, email: user.email, role: user.role } : null,
    area: area || null,
    feeder: feederName || null,
    feederStatus: powerStatus ? powerStatus.status : (activeOutages.length > 0 ? "off" : "on"),
    maintenanceActive: powerStatus && powerStatus.status === "maintenance",
    maintenanceReason: powerStatus?.maintenanceReason || powerStatus?.notes || (activeOutages[0] ? activeOutages[0].cause : null),
    maintenanceStartTime: powerStatus?.lastUpdated || powerStatus?.updatedAt || (activeOutages[0] ? activeOutages[0].createdAt : null),
    estimatedRestoreTime: powerStatus?.estimatedNextOutage || (activeOutages[0] ? activeOutages[0].estimatedRestoreTime : null),
    scheduleUpdated: powerStatus?.lastUpdated || powerStatus?.updatedAt || null,
    updatedBy: powerStatus?.updatedBy ? { fullName: powerStatus.updatedBy.fullName } : null,
    activeOutages: activeOutages,
    recentReportsCount: reportsCount,
    dominantIssue: dominantIssue,
    trendAnalysis: trendExplanationEn,
    predictionRiskLevel: activePrediction ? activePrediction.riskLevel : null,
    predictionConfidence: activePrediction ? activePrediction.confidenceScore || activePrediction.confidence : null,
    predictionExplanation: activePrediction ? activePrediction.predictedCause || activePrediction.prediction : null,
    feederHealth: feederHealth || null,
    analyticsSummary: feederHealth ? { status: feederHealth.status, riskScore: feederHealth.riskScore, uptimePercent: feederHealth.uptimePercent } : null
  };

  let selectedBranch = "Normal Operations Branch";
  if (!feederName && area) {
    selectedBranch = "Area Fallback Branch";
  } else if (powerStatus && powerStatus.status === "maintenance") {
    selectedBranch = "Maintenance Branch";
  } else if (powerStatus && powerStatus.status === "off") {
    if (activeOutages && activeOutages.length > 0) {
      selectedBranch = "Outage Branch";
    } else {
      selectedBranch = "Offline Branch";
    }
  } else if (queryLower.includes("predict") || (activePrediction && (queryLower.includes("unstable") || queryLower.includes("risk") || queryLower.includes("health")))) {
    selectedBranch = "Prediction Branch";
  } else {
    selectedBranch = "Normal Operations Branch";
  }

  const logAIDebug = (responseText) => {
    console.log("==================================================");
    console.log("AI CONTEXT DEBUG");
    console.log("================\n");
    console.log(`User: ${aiContext.user ? aiContext.user.fullName || aiContext.user.email : "None"}`);
    console.log(`Role: ${aiContext.user ? aiContext.user.role : "None"}`);
    console.log(`Area: ${aiContext.area || "None"}`);
    console.log(`Feeder: ${aiContext.feeder || "None"}\n`);
    console.log(`Feeder Status: ${aiContext.feederStatus ? aiContext.feederStatus.toUpperCase() : "None"}\n`);
    console.log(`Maintenance Active: ${aiContext.maintenanceActive ? "TRUE" : "FALSE"}\n`);
    console.log(`Maintenance Reason: ${aiContext.maintenanceReason || "None"}\n`);
    console.log(`Maintenance Start Time: ${aiContext.maintenanceStartTime || "None"}\n`);
    console.log(`Estimated Restore Time: ${aiContext.estimatedRestoreTime || "None"}\n`);
    console.log(`Schedule Updated: ${aiContext.scheduleUpdated || "None"}\n`);
    console.log(`Updated By: ${aiContext.updatedBy ? aiContext.updatedBy.fullName : "None"}\n`);
    console.log(`Active Outages: ${aiContext.activeOutages ? aiContext.activeOutages.length : 0}\n`);
    console.log(`Recent Reports Count: ${aiContext.recentReportsCount}\n`);
    console.log(`Dominant Issue: ${aiContext.dominantIssue || "None"}\n`);
    console.log(`Trend Analysis: ${aiContext.trendAnalysis || "None"}\n`);
    console.log(`Prediction Risk Level: ${aiContext.predictionRiskLevel || "None"}\n`);
    console.log(`Prediction Confidence: ${aiContext.predictionConfidence !== null && aiContext.predictionConfidence !== undefined ? ((aiContext.predictionConfidence || 0) * 100).toFixed(0) + "%" : "None"}\n`);
    console.log(`Prediction Explanation: ${aiContext.predictionExplanation || "None"}\n`);
    console.log(`Feeder Health: ${aiContext.feederHealth ? `${aiContext.feederHealth.status} (Risk: ${aiContext.feederHealth.riskScore}%, Uptime: ${aiContext.feederHealth.uptimePercent}%)` : "None"}\n`);
    console.log(`Analytics Summary: ${aiContext.analyticsSummary ? `Status: ${aiContext.analyticsSummary.status}, Risk: ${aiContext.analyticsSummary.riskScore}%, Uptime: ${aiContext.analyticsSummary.uptimePercent}%` : "None"}\n`);
    console.log("==================================================");
    console.log("\n# END AI CONTEXT DEBUG\n");

    console.log("==================================================");
    if (aiContext.maintenanceActive) {
      console.log("[DEBUG] Maintenance Priority Triggered");
      if (responseText && responseText.toLowerCase().includes("area is online and active")) {
        console.log("[DEBUG ERROR] Maintenance exists but response path ignored maintenance.");
      }
    }

    console.log("\n[AI RESPONSE PATH]");
    console.log(selectedBranch);
    console.log("==================================================");

    console.log(JSON.stringify(aiContext, null, 2));
  };

  // Advanced Deterministic NLP Intent Engine (Fallback) supporting English & Hausa
  const getHeuristicChatResponse = async () => {
    const q = queryLower;
    let responseText = "";
    let followUps = [];
    
    // Detect Hausa
    const isHausa = q.includes("wuta") || q.includes("yaushe") || q.includes("babu") || q.includes("matsala") || q.includes("gyara") || q.includes("yasa") || q.includes("maido");

    // Helper functions for formatting
    const formatTimeOrString = (val) => {
      if (!val) return "TBD";
      if (typeof val === "string" && !isNaN(Date.parse(val))) {
        return new Date(val).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      }
      if (val instanceof Date) {
        return val.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      }
      return val;
    };

    const formatTimestampToTime = (val) => {
      if (!val) return "6:30 PM";
      const d = new Date(val);
      if (isNaN(d.getTime())) return val;
      return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    };

    // Extract values
    const status = powerStatus ? powerStatus.status : (activeOutages.length > 0 ? "off" : "on");
    const activeOutageObj = activeOutages[0] || null;

    const maintenanceReason = powerStatus?.notes || (activeOutageObj ? activeOutageObj.cause : null) || "Planned grid maintenance and breaker testing";
    const maintenanceStart = formatTimeOrString(powerStatus?.lastUpdated || powerStatus?.updatedAt || (activeOutageObj ? activeOutageObj.createdAt : null) || new Date(Date.now() - 3600000 * 2));
    const restorationExpected = formatTimeOrString(powerStatus?.estimatedNextOutage || (activeOutageObj ? activeOutageObj.estimatedRestoreTime : null) || "8:00 PM");
    
    const scheduleUpdatedTime = formatTimestampToTime(powerStatus?.lastUpdated || powerStatus?.updatedAt || new Date());
    const adminName = powerStatus?.updatedBy?.fullName || "operations staff";

    const targetLocationName = feederName ? `${feederName} feeder` : `${area} area`;
    const targetLocationNameHa = feederName ? `${feederName} feeder` : `yankin ${area}`;
    const healthStatusText = feederHealth ? `Health Status: ${feederHealth.status} (Uptime: ${feederHealth.uptimePercent || '92'}%, Risk Score: ${feederHealth.riskScore || '15'}%)` : "Health Status: Stable";

    // Action Recommendations Builder
    let recs = [];
    const isAdmin = user && (user.role === "admin" || user.role === "super-admin");
    if (isAdmin) {
      if (status === "maintenance") {
        recs = ["Monitor maintenance completion", "Dispatch field technician verification", "Send area status announcement"];
      } else if (status === "off" || severityLevel === "HIGH" || severityLevel === "CRITICAL") {
        recs = ["Dispatch field technicians immediately", "Investigate transformer health", "Monitor feeder performance telemetry"];
      } else {
        recs = ["Monitor feeder performance", "Review weekly load logs", "Inspect local substation relays"];
      }
    } else {
      if (status === "maintenance") {
        recs = ["Monitor outage updates", "Keep heavy appliances unplugged", "Enable push notifications for restore alerts"];
      } else if (status === "off") {
        recs = ["Submit a detailed fault report", "Enable push notifications for restore alerts", "Check neighborhood outage card"];
      } else {
        recs = ["Submit a report if experiencing low voltage", "Enable push notifications for instant alerts", "Check prediction models"];
      }
    }

    let recsText = "";
    if (isHausa) {
      let recsHa = [];
      if (isAdmin) {
        recsHa = recs.map(r => 
          r.includes("Dispatch") ? "Tura ma'aikatan gyara na waje gaggawa" :
          r.includes("Investigate") ? "Binciki lafiyar transformer" :
          r.includes("Monitor") ? "Kula da sabuntawar lafiyar feeder" :
          r.includes("Inspect") ? "Duba relays na substation" : "Kula da bayanan wuta"
        );
      } else {
        recsHa = recs.map(r =>
          r.includes("Submit") ? "Aiko da cikakken rahoton matsala" :
          r.includes("Enable") ? "Kunnar da sanarwar tura sako" :
          r.includes("Monitor") ? "Kula da sabuntawar outage" :
          r.includes("Check") ? "Duba jadawalin outage na yankin" : "Kiyaye kayan wuta a kashe"
        );
      }
      recsText = `\n\nShawarwarin Ayyuka:\n- ${recsHa.join("\n- ")}`;
    } else {
      recsText = `\n\nOperational Recommendations:\n- ${recs.join("\n- ")}`;
    }
     // 1. Admin / Stability queries
    if (q.includes("most unstable") || q.includes("most affected") || q.includes("weekly outage summary") || q.includes("worst feeder")) {
      try {
        const stats = await getAnalyticsDashboardData({ range: "week" });
        const redFeeders = stats.feederHealth.filter(f => f.status === "Red");
        if (redFeeders.length > 0) {
          const feederNames = redFeeders.map(f => f.feeder).join(", ");
          responseText = isHausa
            ? `Bisa ga kididdigar wannan makon, layukan da suka fi samun matsala sune ${feederNames}. Suna da matsayin 'Red' saboda yawan samun outages.`
            : `Based on this week's analytics, the most unstable feeders are ${feederNames}. They currently hold a high-risk 'Red' status due to frequent outages.`;
        } else {
          responseText = isHausa
            ? `Grid dinmu yana da kyau sosai a wannan makon. Babu layukan da ke da babban hadari.`
            : `Grid stability is looking good this week. There are currently no feeders marked as high-risk or extremely unstable.`;
        }
        followUps = isHausa ? ["Duba duk stats", "Rahoton matsala"] : ["View full analytics", "Check active outages"];
      } catch (e) {
        responseText = isHausa ? "Ba za a iya samun bayanan kididdiga a yanzu ba." : "I cannot retrieve feeder health statistics at the moment.";
      }
    }
    // 2. Intent-based response mapping
    else if (detectedIntent === "OUTAGE_CAUSE") {
      if (status === "maintenance") {
        if (isHausa) {
          responseText = `Layin ${targetLocationNameHa} yana kashe a halin yanzu saboda aikin gyaran layuka na musamman (${maintenanceReason}).`;
        } else {
          responseText = `The ${targetLocationName} is currently offline due to active scheduled maintenance. Reason: ${maintenanceReason}.`;
        }
      } else if (status === "off") {
        const cause = activeOutageObj ? activeOutageObj.cause : "unspecified grid trip";
        if (isHausa) {
          responseText = `Layin ${targetLocationNameHa} yana kashe saboda matsalar wuta. Dalili: ${cause}.`;
        } else {
          responseText = `The ${targetLocationName} is currently offline due to an active outage. Cause: ${cause}.`;
        }
      } else {  
        if (isHausa) {
          responseText = `Layin ${targetLocationNameHa} yana kunne (Status: ON) kuma babu wata matsala ta outage da aka samu a halin yanzu.`;
        } else {
          responseText = `The ${targetLocationName} is currently online and active (Status: ON). There are no active outage causes logged at this time.`;
        }
      }
      followUps = isHausa ? ["Aiko da rahoto", "Duba lafiyar feeder"] : ["Report a fault", "Check feeder health"];
    }
    else if (detectedIntent === "RESTORATION_TIME") {
      if (isHausa) {
        responseText = `Ana sa ran dawo da wuta akan ${targetLocationNameHa} da misalin karfe ${restorationExpected}. An sabunta wannan jadawalin da karfe ${scheduleUpdatedTime} ta hannun ${adminName}.`;
      } else {
        responseText = `Power restoration on the ${targetLocationName} is expected at approximately ${restorationExpected}. This schedule was last verified by ${adminName} at ${scheduleUpdatedTime}.`;
      }
      followUps = isHausa ? ["Aiko da rahoto", "Duba lafiyar feeder"] : ["Report a fault", "Check feeder health"];
    }
    else if (detectedIntent === "FEEDER_HEALTH") {
      if (isHausa) {
        responseText = `Binciken Lafiyar Layin ${targetLocationNameHa}: Status: ${feederHealth ? feederHealth.status : 'Stable'}, Uptime: ${feederHealth ? feederHealth.uptimePercent || '92' : '92'}%, Stability Risk Score: ${feederHealth ? feederHealth.riskScore || '15' : '15'}%. ${trendExplanationHa}`;
      } else {
        responseText = `Grid Health Analysis for ${targetLocationName}: Status is ${feederHealth ? feederHealth.status : 'Green (Stable)'}. Risk Score: ${feederHealth ? feederHealth.riskScore : '15'}%, Uptime Score: ${feederHealth ? feederHealth.uptimePercent : '92'}%. ${trendExplanationEn}`;
      }
      followUps = isHausa ? ["Bincika lafiyar grid", "Aiko da rahoto"] : ["Check feeder health", "Report a fault"];
    }
    else if (detectedIntent === "PREDICTION") {
      if (isHausa) {
        responseText = activePrediction 
          ? `Hasashen AI: ${predictionTextHa}`
          : `Babu wani hasashen outage na musamman da aka yi rajista akan ${targetLocationNameHa} a halin yanzu.`;
      } else {
        responseText = activePrediction
          ? `AI Prediction: ${predictionTextEn}`
          : `No active outage predictions forecasted for the ${targetLocationName} at this time.`;
      }
      followUps = isHausa ? ["Rahoton matsala", "Duba lafiyar feeder"] : ["Report a fault", "Check feeder health"];
    }
    else if (detectedIntent === "REPORT_STATISTICS") {
      if (isHausa) {
        responseText = `An sami korafe-korafe guda ${reportsCount} kwanan nan akan layin ${targetLocationNameHa}. Dominant issue shine ${dominantIssue}, kuma yanayin korafe-korafen ${complaintTrendHa}.`;
      } else {
        responseText = `We have recorded ${reportsCount} recent complaints from the ${targetLocationName} over the last 24 hours. The dominant issue type is ${dominantIssue}, and the overall complaint trend is ${complaintTrendEn}.`;
      }
      followUps = isHausa ? ["Aiko da rahoto", "Duba korafe-korafe"] : ["Report a fault", "View complaints"];
    }
    else if (detectedIntent === "MAINTENANCE_DETAILS") {
      if (isHausa) {
        responseText = `Layin ${targetLocationNameHa} yana fuskantar aikin gyara (maintenance). Dalili: ${maintenanceReason}. An fara aikin ne da karfe ${maintenanceStart} kuma yana kan gudana (active/in progress).`;
      } else {
        responseText = `The scheduled maintenance on ${targetLocationName} is currently active and in progress. Reason: ${maintenanceReason}. Work started at approximately ${maintenanceStart}.`;
      }
      followUps = isHausa ? ["Kula da sabuntawa", "Aiko da rahoto"] : ["Monitor updates", "Report a fault"];
    }

    // Append personalization/urgency segments
    if (userReportTextEn) {
      responseText += isHausa ? ` ${userReportTextHa}` : ` ${userReportTextEn}`;
    }
    if (urgencyAlertEn) {
      responseText += isHausa ? `\n${urgencyAlertHa}` : `\n${urgencyAlertEn}`;
    }

    responseText += recsText;

    if (followUps.length > 0) {
      responseText += `\n\nSuggested Actions: ${followUps.join(' | ')}`;
    }

    return responseText;
  };

  const isHausa = queryLower.includes("wuta") || queryLower.includes("yaushe") || queryLower.includes("babu") || queryLower.includes("matsala") || queryLower.includes("gyara") || queryLower.includes("yasa") || queryLower.includes("maido");
  
  // Route the query through our template and router
  const draftResponse = routeResponse({
    intent: detectedIntent,
    context: aiContext,
    isHausa
  });

  // Helper to execute post-response logging, memory updating, and return formatting
  const finalizeResponse = (text) => {
    // Save to conversational memory
    updateMemory(userId, {
      currentFeeder: feederName || null,
      currentArea: area || null,
      currentIntent: detectedIntent,
      currentOutage: activeOutages.length > 0 ? activeOutages[0] : null,
      currentMaintenance: aiContext.maintenanceActive,
      lastPrediction: activePrediction || null,
      lastResponseType: detectedIntent + "_RESPONSE",
      lastQuestion: userQuery
    });
    
    // Log outputs
    logAIDebug(text);
    logMemoryDebug(userId);
    
    return { text };
  };

  // If Gemini API Key is not set or invalid, use draft directly
  if (!isValidGeminiKey(GEMINI_KEY)) {
    return finalizeResponse(draftResponse);
  }

  try {
    const systemPrompt = `You are the "Litha AI Analyst", an expert smart grid conversational assistant serving utility customers.
Your role is to analyze the user query and refine/polish the draft response generated by the system without changing any of the operational grid facts (such as dates, times, names, status, and scores).

DRAFT RESPONSE TO REFINE:
"${draftResponse}"

LIVE GRID CONTEXT:
${gridContext}

INSTRUCTIONS:
1. Refine the wording to make it sound natural, professional, and conversational.
2. Maintain language lock: If the query is in Hausa, reply entirely in Hausa. If in English, reply entirely in English. Do not mix languages.
3. DO NOT change or hallucinate any times, restoration expectations, feeder names, or statistics from the draft.
4. Keep responses concise (under 120 words).`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;

    const response = await axios.post(geminiUrl, {
      contents: [
        {
          role: "user",
          parts: [{ text: `User Query: "${userQuery}"\n\nAnswer the query based on the system instructions and grid context.` }]
        }
      ],
      systemInstruction: {
        role: "system",
        parts: [{ text: systemPrompt }]
      }
    }, {
      headers: { "Content-Type": "application/json" },
      timeout: 10000 // 10s timeout
    });

    const candidateText = response?.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      throw new Error("No response from Gemini API");
    }

    const text = candidateText.trim();
    console.log("\n[GEMINI BEFORE]");
    console.log(draftResponse);
    console.log("\n[GEMINI AFTER]");
    console.log(text);

    return finalizeResponse(text);

  } catch (error) {
    console.error(`[AI Chat] Gemini call failed: ${error.message}. Recovering via local templates.`);
    return finalizeResponse(draftResponse);
  }
};

/**
 * Fetch and generate analytics data for the Smart AI Dashboard.
 */
export const getAnalyticsDashboardData = async (opts = {}) => {
  // opts.range: "today" | "week" | "month" (defaults to week)
  const range = (opts.range || "week").toLowerCase();
  const end = new Date();
  let start = new Date();
  if (range === "today") {
    start.setHours(0, 0, 0, 0);
  } else if (range === "month") {
    start.setDate(start.getDate() - 30);
  } else { // week
    start.setDate(start.getDate() - 7);
  }

  // Get user's assigned feeder for filtering
  const userFeederName = opts.user?.assignedFeeders?.[0]?.name || opts.user?.feeder;
  const userFeederId = opts.user?.assignedFeeders?.[0]?._id;

  // Get user's feeder band for band-based analytics
  let userFeederBand = null;
  if (userFeederId) {
    const userFeederDoc = await Feeder.findById(userFeederId).select("band").lean();
    userFeederBand = userFeederDoc?.band || null;
  } else if (userFeederName) {
    const userFeederDoc = await Feeder.findOne({ name: { $regex: new RegExp(`^${userFeederName}$`, "i") } }).select("band").lean();
    userFeederBand = userFeederDoc?.band || null;
  }

  // Helper to compute uptime percent from power logs for a feeder
  const computeUptimePercent = (logs, periodStart, periodEnd) => {
    if (!logs || logs.length === 0) return null;
    let uptimeMs = 0;
    for (let i = 0; i < logs.length; i++) {
      const curr = logs[i];
      const nextTime = (i + 1 < logs.length) ? new Date(logs[i + 1].timestamp) : periodEnd;
      const currTime = new Date(curr.timestamp) < periodStart ? periodStart : new Date(curr.timestamp);
      const dt = Math.max(0, nextTime - currTime);
      if (curr.status === 'on') uptimeMs += dt;
    }
    const totalMs = periodEnd - periodStart;
    return Math.max(0, Math.min(100, Math.round((uptimeMs / totalMs) * 10000) / 100)); // percent with 2 decimals
  };
  try {
    // Include user's feeder and band in cache key to prevent cross-feeder/band data leakage
    const cacheKeySuffix = `${userFeederName || userFeederId || 'global'}:${userFeederBand || 'all'}`;
    const sharedAnalytics = await getCachedAnalyticsSnapshot({
      range: `${range}:${cacheKeySuffix}`,
      buildSnapshot: async () => {
        // Build feeder filter based on user's assigned feeder
        // Note: PowerStatus.feeder is ObjectId, so we need to resolve feeder name to ObjectId
        let feederObjectIdFilter = {};
        let feederNameFilter = {};
        
        if (userFeederId) {
          feederObjectIdFilter = { feeder: userFeederId };
          feederNameFilter = { feeder: userFeederName || userFeederId.toString() };
        } else if (userFeederName) {
          // For PowerStatus (ObjectId), we need to find the feeder document first
          const targetFeeder = await Feeder.findOne({ name: { $regex: new RegExp(`^${userFeederName}$`, "i") } }).select("_id").lean();
          if (targetFeeder) {
            feederObjectIdFilter = { feeder: targetFeeder._id };
          }
          feederNameFilter = { feeder: userFeederName };
        }

        const hasFeederFilter = Object.keys(feederObjectIdFilter).length > 0;
        
        const [
          activeOutageFeeders,
          offlineFeederIds,
          activeOutages,
          recentReports,
          feedersList,
          outagesInRange
        ] = await Promise.all([
          hasFeederFilter 
            ? Outage.distinct("feeder", { active: true, ...feederNameFilter })
            : Outage.distinct("feeder", { active: true }),
          hasFeederFilter
            ? PowerStatus.distinct("feeder", { status: { $in: ["off", "maintenance"] }, ...feederObjectIdFilter })
            : PowerStatus.distinct("feeder", { status: { $in: ["off", "maintenance"] } }),
          Outage.find({ active: true, createdAt: { $gte: start, $lte: end }, ...feederNameFilter })
            .select("feeder")
            .lean(),
          Report.find({ createdAt: { $gte: start, $lte: end }, ...feederNameFilter })
            .select("feeder createdAt")
            .sort({ createdAt: -1 })
            .limit(200)
            .lean(),
          Feeder.find(userFeederBand ? { band: userFeederBand } : {}).select("_id name band").lean(),
          Outage.find({ createdAt: { $gte: start, $lte: end }, ...feederNameFilter })
            .select("feeder estimatedRestoreTime createdAt")
            .lean()
        ]);

        const activeOutageFeederIds = new Set([
          ...activeOutageFeeders.map((feeder) => feeder?.toString()).filter(Boolean),
          ...offlineFeederIds.map((feeder) => feeder?.toString()).filter(Boolean)
        ]);
        const activeOutagesCount = activeOutageFeederIds.size;

        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const reportsTodayCount = recentReports.filter((report) => new Date(report.createdAt) >= startOfToday).length;

        // Create a map of feeder IDs to feeder data
        const feedersMap = {};
        const feederIdToName = {};
        const feederNameToId = {};
        for (const feeder of feedersList) {
          const idStr = feeder._id.toString();
          feedersMap[idStr] = {
            _id: feeder._id,
            name: feeder.name,
            incidents: 0,
            outages: 0,
            uptimePercent: null,
            avgRestoreMinutes: null
          };
          feederIdToName[idStr] = feeder.name;
          feederNameToId[feeder.name.toLowerCase()] = idStr;
        }

        // Process recent reports
        recentReports.forEach((report) => {
          let feederKey = null;
          // Try to find feeder by ID first
          if (report.feeder && feederIdToName[report.feeder]) {
            feederKey = report.feeder;
          } 
          // Then try by name (case insensitive)
          else if (report.feeder) {
            const nameLower = report.feeder.toLowerCase();
            if (feederNameToId[nameLower]) {
              feederKey = feederNameToId[nameLower];
            }
          }
          
          if (feederKey && feedersMap[feederKey]) {
            feedersMap[feederKey].incidents += 1;
          }
        });

        // Process outages
        const outageDurations = {};
        for (const outage of outagesInRange) {
          let feederKey = null;
          if (outage.feeder && feederIdToName[outage.feeder]) {
            feederKey = outage.feeder;
          } 
          else if (outage.feeder) {
            const nameLower = outage.feeder.toLowerCase();
            if (feederNameToId[nameLower]) {
              feederKey = feederNameToId[nameLower];
            }
          }
          
          if (feederKey && feedersMap[feederKey]) {
            feedersMap[feederKey].outages += 1;

            if (outage.estimatedRestoreTime && outage.createdAt) {
              const mins = Math.abs(new Date(outage.estimatedRestoreTime) - new Date(outage.createdAt)) / 60000;
              outageDurations[feederKey] = outageDurations[feederKey] || [];
              outageDurations[feederKey].push(mins);
            }
          }
        }

        const feederHealthArr = [];
        const periodStart = start;
        const periodEnd = end;
        const feederIds = feedersList.map((feeder) => feeder._id);
        const allFeederKeys = Object.keys(feedersMap);

        let allPowerLogs = [];
        try {
          allPowerLogs = await PowerLog.find({
            feeder: { $in: feederIds },
            timestamp: { $gte: periodStart, $lte: periodEnd }
          })
            .select("feeder status timestamp")
            .sort({ timestamp: 1 })
            .lean();
        } catch (err) {
          console.error("[AI Service] Bulk PowerLog fetch error:", err.message);
        }

        const logsByFeeder = new Map();
        for (const log of allPowerLogs) {
          const feederKey = log.feeder?.toString() || "unknown";
          if (!logsByFeeder.has(feederKey)) logsByFeeder.set(feederKey, []);
          logsByFeeder.get(feederKey).push(log);
        }

        // Helper function to get rating from health score
        const getRating = (score) => {
          if (score >= 90) return "Excellent";
          if (score >= 75) return "Very Good";
          if (score >= 60) return "Good";
          if (score >= 40) return "Fair";
          return "Poor";
        };

        for (const key of allFeederKeys) {
            const feederEntry = feedersMap[key];
            const logs = logsByFeeder.get(key) || [];
            const uptime = computeUptimePercent(logs, periodStart, periodEnd);
            const restoreArr = outageDurations[key] || [];
            const avgRestore = restoreArr.length
                ? Math.round((restoreArr.reduce((total, minutes) => total + minutes, 0) / restoreArr.length) * 100) / 100
                : null;

            // Calculate Health Score (0-100, higher is better)
            // Base score: if we have uptime data, use that; otherwise start at 90
            let healthScore = uptime !== null ? uptime : 90;
            
            // Subtract points for incidents and outages
            healthScore -= feederEntry.incidents * 2; // 2 points per incident
            healthScore -= feederEntry.outages * 15; // 15 points per outage
            
            // Clamp to 0-100
            healthScore = Math.max(0, Math.min(100, healthScore));
            
            // Determine status color (reverse of previous risk score logic)
            let status = "Green";
            if (healthScore < 60) status = "Red";
            else if (healthScore < 75) status = "Yellow";

            // Calculate AI Confidence (0-100, higher is more confident)
            let aiConfidence = 50; // Base confidence
            
            // Factor 1: Number of historical records (logs)
            if (logs.length >= 50) aiConfidence += 25;
            else if (logs.length >= 20) aiConfidence += 15;
            else if (logs.length >= 5) aiConfidence += 5;
            
            // Factor 2: Data completeness (uptime data available)
            if (uptime !== null) aiConfidence += 20;
            
            // Factor 3: Trend consistency (stable vs fluctuating)
            if (logs.length > 0) {
                let statusChanges = 0;
                for (let i = 1; i < logs.length; i++) {
                    if (logs[i].status !== logs[i-1].status) statusChanges++;
                }
                const changeRate = statusChanges / logs.length;
                if (changeRate < 0.1) aiConfidence += 15; // Very stable
                else if (changeRate < 0.3) aiConfidence += 10; // Somewhat stable
                else if (changeRate < 0.5) aiConfidence += 5; // Moderately stable
            }
            
            // Clamp to 0-100
            aiConfidence = Math.max(0, Math.min(100, aiConfidence));

            feederHealthArr.push({
                feederId: feederEntry._id,
                feeder: feederEntry.name,
                incidents: feederEntry.incidents,
                activeOutages: feederEntry.outages,
                uptimePercent: uptime,
                avgRestoreMinutes: avgRestore,
                healthScore,
                rating: getRating(healthScore),
                aiConfidence,
                status
            });
        }

        // Sort by health score descending (best first)
        feederHealthArr.sort((a, b) => (b.healthScore || 0) - (a.healthScore || 0));

        const validScores = feederHealthArr.filter((item) => item.healthScore !== null).map((item) => item.healthScore);
        const validUptimes = feederHealthArr
          .filter((item) => item.uptimePercent !== null)
          .map((item) => item.uptimePercent);
        // globalRiskScore is now average health score (higher is better)
        const globalRiskScore = validScores.length
          ? Math.round(validScores.reduce((total, score) => total + score, 0) / validScores.length)
          : 90;
        const globalUptimePercent = validUptimes.length
          ? Math.round(validUptimes.reduce((total, uptime) => total + uptime, 0) / validUptimes.length)
          : 92;
        const highRiskFeeders = feederHealthArr.filter((item) => item.status === "Red" || item.status === "Yellow");

        return {
          range,
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString(),
          activeOutagesCount,
          recentReportsCount: reportsTodayCount,
          feederHealth: feederHealthArr,
          globalRiskScore,
          globalUptimePercent,
          statsLabel: getAnalyticsStatsLabel({ activeOutagesCount, globalRiskScore }),
          insights: getBaseAnalyticsInsights({ highRiskFeeders, activeOutagesCount })
        };
      }
    });

    const { feederHealth: feederHealthArr } = sharedAnalytics;

    const businessModeEnabled = !!opts.user?.businessModeEnabled;
    const businessType = opts.user?.businessType || "business";
    const targetFeeder = opts.user?.feeder
      ? feederHealthArr.find(
          (feeder) =>
            feeder.feeder?.toLowerCase() === opts.user.feeder?.toLowerCase() ||
            feeder.feederId?.toString() === opts.user.feeder?.toString()
        )
      : null;
    const businessTypeLabel = (() => {
      switch (businessType) {
        case "retail": return "retail operation";
        case "manufacturing": return "manufacturing site";
        case "hospitality": return "hospitality business";
        case "office": return "office or service hub";
        case "agriculture": return "agricultural operation";
        case "services": return "local services business";
        default: return "business";
      }
    })();

    const insights = [...sharedAnalytics.insights];

    if (businessModeEnabled) {
      const statusText = targetFeeder ? `${targetFeeder.status} with ${targetFeeder.healthScore}% health score` : "unmapped to a monitored feeder";
      insights.unshift(`Business Mode is active. Your ${businessTypeLabel} is ${targetFeeder ? `assigned to ${targetFeeder.feeder}` : "not yet mapped to a monitored feeder"}, and is currently ${statusText}. Prioritize backup power for critical operations.`);
    } else if (opts.user) {
      insights.unshift("Enable Business Mode in your profile for tailored energy continuity alerts and smarter risk guidance.");
    }

    const businessRiskProfile = targetFeeder ? {
      feeder: targetFeeder.feeder,
      healthScore: targetFeeder.healthScore,
      status: targetFeeder.status,
      uptimePercent: targetFeeder.uptimePercent,
      businessType: businessType,
      businessModeEnabled,
    } : null;

    let userPrediction = null;
    if (opts.user?.feeder) {
      userPrediction = await Prediction.findOne({
        $or: [
          { feeder: opts.user.feeder },
          { feeder: { $regex: new RegExp(`^${escapeRegex(opts.user.feeder)}$`, "i") } }
        ]
      })
        .sort({ createdAt: -1 })
        .lean();
    }

    return {
      ...sharedAnalytics,
      userPrediction,
      businessModeEnabled,
      businessType: opts.user?.businessType || null,
      businessRiskProfile,
      insights
    };
  } catch (err) {
    console.error("[AI Service] Analytics generation error:", err.message);
    throw err;
  }
};

export default { analyzeReportWithAI, chatAssistant, getAnalyticsDashboardData };
