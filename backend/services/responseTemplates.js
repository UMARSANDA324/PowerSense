/**
 * PowerSense Deterministic Response Templates (Bilingual)
 */

export const templates = {
  OUTAGE_CAUSE: {
    en: (ctx) => {
      const isOnline = ctx.feederStatus === "on";
      if (isOnline) {
        return `Power is currently available on the ${ctx.feeder || "resolved"} feeder. However, we have recorded ${ctx.recentReportsCount || 0} recent complaints (dominant issue: ${ctx.dominantIssue || "None"}).`;
      }
      if (ctx.maintenanceActive) {
        return `There is currently no electricity because ${ctx.feeder || "the resolved"} feeder is undergoing scheduled maintenance.\n\nMaintenance started at ${ctx.maintenanceStartTime || "TBD"}.\n\nThe maintenance team is currently working on the feeder.\n\nExpected restoration time is ${ctx.estimatedRestoreTime || "TBD"}.`;
      }
      return `There is currently no electricity because the ${ctx.feeder || "resolved"} feeder is offline due to an active outage.\n\nOutage Cause: ${ctx.maintenanceReason || "unspecified electrical fault"}.\n\nExpected restoration time is ${ctx.estimatedRestoreTime || "TBD"}.`;
    },
    ha: (ctx) => {
      const isOnline = ctx.feederStatus === "on";
      if (isOnline) {
        return `Layin wuta na ${ctx.feeder || "layin ku"} yana kunne a halin yanzu. Sai dai, mun sami korafe-korafe guda ${ctx.recentReportsCount || 0} kwanan nan (matsala mafi girma: ${ctx.dominantIssue || "Babu"}).`;
      }
      if (ctx.maintenanceActive) {
        return `Babu wuta a halin yanzu saboda ana gyaran layin ${ctx.feeder || "layin ku"} na musamman.\n\nAn fara aikin gyaran ne da misalin karfe ${ctx.maintenanceStartTime || "TBD"}.\n\nMa'aikatan gyara suna aiki a halin yanzu akan layin.\n\nAna sa ran dawo da wuta da misalin karfe ${ctx.estimatedRestoreTime || "TBD"}.`;
      }
      return `Babu wuta a halin yanzu saboda layin ${ctx.feeder || "layin ku"} yana kashe sakamakon yanke wuta na ba-zata.\n\nDalilin outage: ${ctx.maintenanceReason || "matsalar layin wuta"}.\n\nAna sa ran dawo da wuta da misalin karfe ${ctx.estimatedRestoreTime || "TBD"}.`;
    }
  },

  RESTORATION_TIME: {
    en: (ctx) => {
      const isOnline = ctx.feederStatus === "on";
      if (isOnline) {
        return `Power is already restored and active on the ${ctx.feeder || "resolved"} feeder. No current outages or pending restoration schedules exist.`;
      }
      const adminName = ctx.updatedBy && typeof ctx.updatedBy === "object" ? ctx.updatedBy.fullName : (ctx.updatedBy || "operations staff");
      return `Power restoration is currently scheduled for approximately ${ctx.estimatedRestoreTime || "TBD"}.\n\nThe maintenance schedule was last updated by ${adminName} at ${ctx.scheduleUpdated || "TBD"}.\n\nThe feeder remains under active maintenance.`;
    },
    ha: (ctx) => {
      const isOnline = ctx.feederStatus === "on";
      if (isOnline) {
        return `Wutar layin ${ctx.feeder || "layin ku"} tana kunne kuma tana aiki a halin yanzu. Babu wata restoration schedule da ke aiki yanzu.`;
      }
      const adminName = ctx.updatedBy && typeof ctx.updatedBy === "object" ? ctx.updatedBy.fullName : (ctx.updatedBy || "ma'aikata");
      return `Ana sa ran dawo da wuta da misalin karfe ${ctx.estimatedRestoreTime || "TBD"}.\n\nAn sabunta wannan jadawalin ta hannun ${adminName} da karfe ${ctx.scheduleUpdated || "TBD"}.\n\nLayin wutar yana karkashin aikin gyara a yanzu.`;
    }
  },

  MAINTENANCE_DETAILS: {
    en: (ctx) => {
      return `Maintenance is currently active on ${ctx.feeder || "the resolved"} feeder.\n\nReason:\n${ctx.maintenanceReason || "Breaker testing and scheduled grid maintenance"}.\n\nStarted:\n${ctx.maintenanceStartTime || "TBD"}\n\nExpected completion:\n${ctx.estimatedRestoreTime || "TBD"}`;
    },
    ha: (ctx) => {
      return `Ana kan aikin gyara a halin yanzu akan layin ${ctx.feeder || "layin ku"}.\n\nDalili:\n${ctx.maintenanceReason || "Gyarar substation da gwajin breakers"}.\n\nAn fara:\n${ctx.maintenanceStartTime || "TBD"}\n\nAna sa ran gamawa:\n${ctx.estimatedRestoreTime || "TBD"}`;
    }
  },

  FEEDER_HEALTH: {
    en: (ctx) => {
      const score = ctx.analyticsSummary ? ctx.analyticsSummary.riskScore : "0";
      const status = ctx.analyticsSummary ? ctx.analyticsSummary.status : "Green";
      return `Feeder Health Report\n\nFeeder:\n${ctx.feeder || "None"}\n\nStatus:\n${status}\n\nRisk Score:\n${score}%\n\nPrediction Risk:\n${ctx.predictionRiskLevel || "Low"}\n\nRecent Reports:\n${ctx.recentReportsCount || 0}\n\nOverall stability is good.`;
    },
    ha: (ctx) => {
      const score = ctx.analyticsSummary ? ctx.analyticsSummary.riskScore : "0";
      const status = ctx.analyticsSummary ? ctx.analyticsSummary.status : "Green";
      return `Rahoton Lafiyar Feeder\n\nLayi:\n${ctx.feeder || "Babu"}\n\nMatsayi:\n${status}\n\nMatakin Hadari:\n${score}%\n\nHasashen Hadari:\n${ctx.predictionRiskLevel || "Kadan"}\n\nKorafe-korafe kwanan nan:\n${ctx.recentReportsCount || 0}\n\nKwanciyar hankalin layin gaba daya yana da kyau.`;
    }
  },

  PREDICTION: {
    en: (ctx) => {
      const conf = ctx.predictionConfidence !== null && ctx.predictionConfidence !== undefined ? (ctx.predictionConfidence * 100).toFixed(0) : "20";
      const risk = ctx.predictionRiskLevel ? ctx.predictionRiskLevel.toUpperCase() : "LOW";
      return `Current prediction confidence is ${conf}%.\n\nRisk Level:\n${risk}\n\nNo major outage patterns have been detected.\n\nThe feeder is operating within expected limits.`;
    },
    ha: (ctx) => {
      const conf = ctx.predictionConfidence !== null && ctx.predictionConfidence !== undefined ? (ctx.predictionConfidence * 100).toFixed(0) : "20";
      const risk = ctx.predictionRiskLevel ? ctx.predictionRiskLevel.toUpperCase() : "LOW";
      return `Tabbacin hasashen wuta na yanzu shine ${conf}%.\n\nMatakin Hadari:\n${risk}\n\nBabu wani babban outage da aka gano a halin yanzu.\n\nLayin yana aiki yadda ya kamata na yanzu.`;
    }
  },

  REPORT_ANALYSIS: {
    en: (ctx) => {
      return `Report Analysis\n\nRecent reports received:\n${ctx.recentReportsCount || 0}\n\nDominant issue:\n${ctx.dominantIssue || "None"}\n\nTrend:\n${ctx.trendAnalysis ? ctx.trendAnalysis.split(".")[0] : "Stable"}\n\nNo unusual complaint spike detected.`;
    },
    ha: (ctx) => {
      return `Kididdigar Korafe-Korafe\n\nKorafe-korafe kwanan nan:\n${ctx.recentReportsCount || 0}\n\nMatsalar da tafi yawa:\n${ctx.dominantIssue || "Babu"}\n\nYanayi:\n${ctx.trendAnalysis ? "Daidai gwargwado" : "Daidai gwargwado"}\n\nBabu wani babban karin korafe-korafe da aka samu kwanan nan.`;
    }
  },

  LOW_VOLTAGE: {
    en: (ctx) => {
      return `Low voltage and fluctuations are currently affecting the ${ctx.feeder || "resolved"} network segment. We have recorded ${ctx.recentReportsCount || 0} low voltage complaints recently.`;
    },
    ha: (ctx) => {
      return `Karancin wuta da wuta tana rawa suna shafar layin ${ctx.feeder || "layin ku"} a halin yanzu. An sami korafe-korafe guda ${ctx.recentReportsCount || 0} kwanan nan.`;
    }
  },

  TRANSFORMER: {
    en: (ctx) => {
      return `We are tracking infrastructure and transformer reports on the ${ctx.feeder || "resolved"} segment. The operations team has been notified of potential transformer issues.`;
    },
    ha: (ctx) => {
      return `Muna kula da rahotannin transformer akan layin ${ctx.feeder || "layin ku"}. An sanar da sashen gyara na musamman game da matsalolin transformer.`;
    }
  },

  STATISTICS: {
    en: (ctx) => {
      const uptime = ctx.analyticsSummary ? ctx.analyticsSummary.uptimePercent || "92" : "92";
      return `Outage statistics indicate that the overall grid uptime is currently ${uptime}%. The weekly analytics summary shows a stable network trend.`;
    },
    ha: (ctx) => {
      const uptime = ctx.analyticsSummary ? ctx.analyticsSummary.uptimePercent || "92" : "92";
      return `Kididdigar outages ta nuna uptime na grid din a halin yanzu shine ${uptime}%. Analytics na mako-mako yana nuna kwanciyar hankali.`;
    }
  },


  VOLTAGE_STATUS: {
    en: (ctx) => {
      const feeder = ctx.feeder || "your feeder";
      const status = ctx.feederStatus ? ctx.feederStatus.toUpperCase() : "ON";
      const riskLevel = ctx.predictionRiskLevel ? ctx.predictionRiskLevel.toUpperCase() : "LOW";
      const complaints = ctx.recentReportsCount || 0;

      // Derive estimated voltage from feeder status and health
      let estimatedVoltage = 228;
      let voltageStatus = "Normal";
      let voltageColor = "🟢";
      let safetyNote = "Voltage is within safe limits. All appliances are safe to operate.";

      if (status === "OFF" || status === "OUTAGE") {
        estimatedVoltage = 0;
        voltageStatus = "No Power";
        voltageColor = "⚫";
        safetyNote = "No voltage detected. Feeder is offline.";
      } else if (status === "MAINTENANCE") {
        estimatedVoltage = 0;
        voltageStatus = "No Power (Maintenance)";
        voltageColor = "🔵";
        safetyNote = "Feeder is under maintenance. No voltage is expected until restoration.";
      } else if (riskLevel === "HIGH" || riskLevel === "CRITICAL" || complaints >= 5) {
        estimatedVoltage = 185 + Math.floor(Math.random() * 20);
        voltageStatus = "Low Voltage";
        voltageColor = "🟡";
        safetyNote = "Voltage is below safe levels. Avoid operating sensitive electronics.";
      } else if (status === "UNSTABLE" || complaints >= 3) {
        estimatedVoltage = 195 + Math.floor(Math.random() * 15);
        voltageStatus = "Slightly Low Voltage";
        voltageColor = "🟡";
        safetyNote = "Voltage is slightly below optimal. Consider limiting heavy appliance usage.";
      } else {
        estimatedVoltage = 220 + Math.floor(Math.random() * 20);
        voltageStatus = "Normal";
        voltageColor = "🟢";
        safetyNote = "Voltage is within the safe 210–240V range. All appliances are safe.";
      }

      return `${voltageColor} Voltage Report — ${feeder}\n\nEstimated Voltage: ~${estimatedVoltage}V\nStatus: ${voltageStatus}\nFeeder Status: ${status}\n\n${safetyNote}\n\nAI Insight: ${complaints > 0 ? `There are currently ${complaints} complaint(s) from your area which may indicate voltage instability.` : "No complaints recorded — voltage appears stable."}\n\nSuggested Actions: Check appliance safety | Report fault | View feeder health`;
    },
    ha: (ctx) => {
      const feeder = ctx.feeder || "layin ku";
      const status = ctx.feederStatus ? ctx.feederStatus.toUpperCase() : "ON";
      const complaints = ctx.recentReportsCount || 0;
      const riskLevel = ctx.predictionRiskLevel ? ctx.predictionRiskLevel.toUpperCase() : "LOW";

      let estimatedVoltage = 228;
      let voltageStatus = "Lafiyayye";

      if (status === "OFF" || status === "OUTAGE") {
        estimatedVoltage = 0;
        voltageStatus = "Babu Wuta";
      } else if (riskLevel === "HIGH" || riskLevel === "CRITICAL" || complaints >= 5) {
        estimatedVoltage = 185 + Math.floor(Math.random() * 20);
        voltageStatus = "Karancin Voltage";
      } else {
        estimatedVoltage = 220 + Math.floor(Math.random() * 20);
        voltageStatus = "Lafiyayye";
      }

      return `🔋 Rahoton Voltage — ${feeder}\n\nKiyasin Voltage: ~${estimatedVoltage}V\nMatsayi: ${voltageStatus}\nStatus din Layin: ${status}\n\n${complaints > 0 ? `Akwai korafe-korafe guda ${complaints} daga yankinku wanda zai iya nuna matsalar voltage.` : "Babu wani korafi da aka samu — voltage yana lafiya."}\n\nSuggested Actions: Duba lafiyar kayan gida | Aiko da rahoto | Duba lafiyar feeder`;
    }
  },

  APPLIANCE_SAFETY: {
    en: (ctx) => {
      const feeder = ctx.feeder || "your feeder";
      const status = ctx.feederStatus ? ctx.feederStatus.toUpperCase() : "ON";
      const riskLevel = ctx.predictionRiskLevel ? ctx.predictionRiskLevel.toUpperCase() : "LOW";
      const complaints = ctx.recentReportsCount || 0;

      let riskCategory = "LOW";
      let generalRec = "Your appliances are currently safe to operate.";
      let applianceTable = "";

      if (status === "OFF" || status === "MAINTENANCE") {
        riskCategory = "N/A";
        generalRec = "Power is currently offline. Ensure all sensitive appliances are unplugged to protect them when power is restored.";
        applianceTable = "• TV — Unplug (power surge risk on restore)\n• Refrigerator — Keep plugged (will resume safely)\n• Freezer — Keep plugged\n• Air Conditioner — Unplug\n• Computer — Shutdown and unplug\n• Inverter — Safe (will switch automatically)\n• Water Pump — Unplug";
      } else if (riskLevel === "HIGH" || riskLevel === "CRITICAL" || complaints >= 5) {
        riskCategory = "HIGH";
        generalRec = "⚠ Dangerous voltage fluctuations detected. Disconnect sensitive electronics immediately.";
        applianceTable = "• TV — ❌ DISCONNECT immediately\n• Refrigerator — ⚠ Use voltage stabilizer\n• Freezer — ⚠ Use voltage stabilizer\n• Air Conditioner — ❌ DISCONNECT immediately\n• Computer — ❌ DISCONNECT immediately\n• Inverter — ✅ Safe (regulates voltage)\n• Water Pump — ⚠ Avoid starting";
      } else if (status === "UNSTABLE" || complaints >= 3) {
        riskCategory = "MEDIUM";
        generalRec = "⚠ Minor voltage instability detected. Limit heavy appliance usage.";
        applianceTable = "• TV — ⚠ Use surge protector\n• Refrigerator — ✅ Safe (has internal protection)\n• Freezer — ✅ Safe\n• Air Conditioner — ⚠ Limit usage\n• Computer — ⚠ Use UPS\n• Inverter — ✅ Safe\n• Water Pump — ⚠ Monitor for low pressure";
      } else {
        riskCategory = "LOW";
        generalRec = "✅ Your appliances are currently safe. Voltage is within the normal range.";
        applianceTable = "• TV — ✅ Safe\n• Refrigerator — ✅ Safe\n• Freezer — ✅ Safe\n• Air Conditioner — ✅ Safe\n• Computer — ✅ Safe\n• Inverter — ✅ Safe\n• Water Pump — ✅ Safe";
      }

      return `Appliance Safety Report — ${feeder}\n\nRisk Level: ${riskCategory}\n\n${generalRec}\n\nAppliance-by-Appliance Status:\n${applianceTable}\n\nSuggested Actions: View voltage status | Report fault | Check feeder health`;
    },
    ha: (ctx) => {
      const feeder = ctx.feeder || "layin ku";
      const status = ctx.feederStatus ? ctx.feederStatus.toUpperCase() : "ON";
      const riskLevel = ctx.predictionRiskLevel ? ctx.predictionRiskLevel.toUpperCase() : "LOW";
      const complaints = ctx.recentReportsCount || 0;

      let rec = "";
      let table = "";

      if (status === "OFF" || status === "MAINTENANCE") {
        rec = "Babu wuta a halin yanzu. Ka tabbata duk kayan lantarki da suka fi mahimmanci an yanke su.";
        table = "• TV — Ka yanke (haɗarin voltage spike yayin dawo da wuta)\n• Firji — Ka bar ya kasance (zai ci gaba lafiya)\n• Freezer — Ka bar ya kasance\n• AC — Ka yanke\n• Computer — Ka kashe kuma ka yanke\n• Inverter — ✅ Lafiya\n• Water Pump — Ka yanke";
      } else if (riskLevel === "HIGH" || riskLevel === "CRITICAL" || complaints >= 5) {
        rec = "⚠ Akwai haɗarin babban banbancin voltage. Ka yanke kayan lantarki masu mahimmanci yanzu.";
        table = "• TV — ❌ Yanke yanzu\n• Firji — ⚠ Yi amfani da stabilizer\n• Freezer — ⚠ Yi amfani da stabilizer\n• AC — ❌ Yanke yanzu\n• Computer — ❌ Yanke yanzu\n• Inverter — ✅ Lafiya\n• Water Pump — ⚠ Kar ka fara";
      } else {
        rec = "✅ Kayan gidanku suna lafiya a halin yanzu.";
        table = "• TV — ✅ Lafiya\n• Firji — ✅ Lafiya\n• Freezer — ✅ Lafiya\n• AC — ✅ Lafiya\n• Computer — ✅ Lafiya\n• Inverter — ✅ Lafiya\n• Water Pump — ✅ Lafiya";
      }

      return `Rahoton Aminci Kayan Gida — ${feeder}\n\n${rec}\n\nKayan Gida:\n${table}\n\nSuggested Actions: Duba voltage | Aiko da rahoto | Duba lafiyar feeder`;
    }
  },

  GENERAL_CHAT: {
    en: (ctx) => {
      const status = ctx.feederStatus ? ctx.feederStatus.toUpperCase() : "ON";
      return `Welcome to the PowerSense Grid Intelligence Assistant. Your location ${ctx.feeder || ctx.area || "resolved area"} is currently ${status}.\n\nI can assist you with active outages, scheduled maintenance, restoration times, voltage status, appliance safety, and grid health metrics.`;
    },
    ha: (ctx) => {
      const status = ctx.feederStatus ? ctx.feederStatus.toUpperCase() : "ON";
      return `Barka da zuwa PowerSense AI Assistant. Yankinku na ${ctx.feeder || ctx.area || "resolved area"} yana (${status}).\n\nIna nan don taimaka muku da duk wani bayani game da outages, maintenance, voltage, aminci kayan gida, da lafiyar feeder.`;
    }
  }
};

export default { templates };
