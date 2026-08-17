import Report from "../models/Report.js";
import Prediction from "../models/Prediction.js";
import axios from "axios";
import { isValidGeminiKey } from "./aiKeyValidator.js";

const GEMINI_KEY = process.env.GEMINI_API_KEY;

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
 * Heuristic generator to serve as fallback for predictions when the key is missing or invalid.
 */
const getHeuristicFeederPrediction = (feeder, area, reportCount, issueCounts) => {
  let prediction = "";
  let riskLevel = "low";
  let confidence = 0.5;
  let recommendedActions = [];

  const maxIssue = Object.keys(issueCounts).reduce((a, b) => issueCounts[a] > issueCounts[b] ? a : b, "Power Outage");

  if (reportCount > 15) {
    riskLevel = "high";
    confidence = Math.min(0.99, 0.6 + reportCount / 50);
    if (maxIssue === "Transformer Fault") {
      prediction = `High probability of local transformer thermal breakdown or failure on the ${feeder} feeder within 48 hours due to continuous overloading.`;
      recommendedActions = ["Isolate transformer secondary phases", "Conduct instant oil level verification", "Execute phase load balancing"];
    } else if (maxIssue === "Low Voltage") {
      prediction = `Critical voltage drop and distribution line imbalance on the ${feeder} feeder, indicating risk of secondary circuit breakdown.`;
      recommendedActions = ["Measure load on feeder pillar", "Balance phases along the low-tension line", "Tighten high-tension dropouts"];
    } else {
      prediction = `Severe grid instability and frequent breaker tripping on the ${feeder} feeder, indicating imminent system-level shutdown.`;
      recommendedActions = ["Inspect feeder circuit breaker at substation", "Verify line insulation resistance", "Clear overhead vegetation path"];
    }
  } else if (reportCount > 5) {
    riskLevel = "medium";
    confidence = Math.min(0.85, 0.4 + reportCount / 40);
    prediction = `Moderate risk of localized outages or line snaps on the ${feeder} feeder due to secondary distribution vulnerabilities.`;
    recommendedActions = ["Conduct routine physical patrol of the distribution line", "Verify local substations load logbooks"];
  } else {
    riskLevel = "low";
    confidence = Math.min(0.60, 0.1 + reportCount / 20);
    prediction = `Feeder ${feeder} is operating within normal parameters. Minor isolated issues are expected.`;
    recommendedActions = ["Standard preventive maintenance schedule"];
  }

  return { prediction, riskLevel, confidence, recommendedActions };
};

/**
 * AI-powered True Prediction Engine that leverages Gemini API or high-fidelity fallback.
 */
export const generatePredictions = async ({ limit = 10 } = {}) => {
  const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30); // 30 days

  // Aggregate reports to analyze incident density and types by feeder
  const agg = await Report.aggregate([
    { $match: { createdAt: { $gte: since } } },
    { 
      $group: { 
        _id: "$feeder", 
        count: { $sum: 1 }, 
        area: { $first: "$area" },
        reports: { $push: { issueType: "$issueType", description: "$description" } }
      } 
    },
    { $sort: { count: -1 } },
    { $limit: limit },
  ]);

  const created = [];

  for (const item of agg) {
    const feeder = item._id || "unknown";
    const area = item.area || "unknown";
    const reportCount = item.count;

    // Break down incident types
    const issueCounts = {};
    const recentDescriptions = [];
    item.reports.forEach((r) => {
      issueCounts[r.issueType] = (issueCounts[r.issueType] || 0) + 1;
      if (recentDescriptions.length < 5 && r.description) {
        recentDescriptions.push(r.description);
      }
    });

    let predictionText = "";
    let riskLevel = "low";
    let confidence = 0.5;
    let recommendedActions = [];

    // Check key validity
    const hasValidKey = isValidGeminiKey(GEMINI_KEY);

    if (hasValidKey) {
      try {
        const promptText = `Analyze these electricity reports for the ${feeder} feeder serving ${area} over the last 30 days:
- Total reports: ${reportCount}
- Incident Breakdown: ${JSON.stringify(issueCounts)}
- Common issue descriptions reported by residents: ${recentDescriptions.join("; ")}

You are "Litha AI Predictive Maintenance Engine". Generate a high-fidelity prediction of failure risk.
You MUST return a raw, valid JSON object matching this exact schema:
{
  "prediction": "Deep, detailed failure narrative (under 30 words) outlining exactly what component is at risk and why.",
  "riskLevel": "low" | "medium" | "high" | "critical",
  "confidence": 0.0 to 1.0 (float reflecting historical data backing),
  "recommendedActions": ["Mitigation action 1", "Mitigation action 2"]
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
        if (candidateText) {
          const cleanedJson = cleanJSONString(candidateText);
          const parsed = JSON.parse(cleanedJson);

          predictionText = parsed.prediction || `Feeder risk elevated based on ${reportCount} recent reports.`;
          riskLevel = parsed.riskLevel || "medium";
          confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0.7;
          recommendedActions = parsed.recommendedActions || [];
        } else {
          throw new Error("Empty candidate text from Gemini");
        }
      } catch (err) {
        console.error(`[Prediction AI Engine] Error querying Gemini for feeder ${feeder}: ${err.message}. Using heuristic fallback.`);
        const fallback = getHeuristicFeederPrediction(feeder, area, reportCount, issueCounts);
        predictionText = fallback.prediction;
        riskLevel = fallback.riskLevel;
        confidence = fallback.confidence;
        recommendedActions = fallback.recommendedActions;
      }
    } else {
      // Direct heuristic mode
      const fallback = getHeuristicFeederPrediction(feeder, area, reportCount, issueCounts);
      predictionText = fallback.prediction;
      riskLevel = fallback.riskLevel;
      confidence = fallback.confidence;
      recommendedActions = fallback.recommendedActions;
    }

    // Delete older predictions for the same feeder to avoid database clutter and keep data fresh
    await Prediction.deleteMany({ feeder });

    const p = await Prediction.create({
      feeder,
      area,
      prediction: predictionText,
      confidence,
      riskLevel,
      metadata: {
        reportCount,
        issueCounts,
        recommendedActions,
        recentDescriptions
      },
    });

    created.push(p);
  }

  return created;
};

export default { generatePredictions };
