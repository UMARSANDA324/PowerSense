import predictionService from "../services/predictionService.js";

let _interval = null;

export const startPredictionScheduler = (io, options = {}) => {
  const intervalMs = options.intervalMs || 1000 * 60 * 60 * 6; // default: every 6 hours
  if (_interval) return;

  _interval = setInterval(async () => {
    try {
      const results = await predictionService.generatePredictions({ limit: 20 });
      if (io) io.emit("predictions:updated", results);
      console.log(`[Cron] Predictions generated: ${results.length}`);
    } catch (err) {
      console.error("[Cron] Prediction generation failed:", err.message);
    }
  }, intervalMs);
};

export const stopPredictionScheduler = () => {
  if (_interval) {
    clearInterval(_interval);
    _interval = null;
  }
};

export default { startPredictionScheduler, stopPredictionScheduler };
