import predictionService from "../services/predictionService.js";
import Reminder from "../models/Reminder.js";
import { notifyArea } from "./notificationHelper.js";

let _predictionInterval = null;
let _reminderInterval = null;

export const startPredictionScheduler = (io, options = {}) => {
  const intervalMs = options.intervalMs || 1000 * 60 * 60 * 6; // default: every 6 hours
  if (_predictionInterval) return;

  _predictionInterval = setInterval(async () => {
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
  if (_predictionInterval) {
    clearInterval(_predictionInterval);
    _predictionInterval = null;
  }
};

const sendPendingReminders = async (io) => {
  console.log("[Cron] Checking for pending reminders...");
  const now = new Date();
  const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

  Reminder.find({
    isSent: false,
    isCancelled: false,
    scheduledTime: {
      $gte: tenMinutesAgo,
      $lte: now }
  })
  .populate('feeder', 'name')
  .then(async (reminders) => {
    for (const reminder of reminders) {
      try {
        console.log(`[Reminder] Sending ${reminder.reminderType} for feeder ${reminder.feederName}`);
        let title, message;
        if (reminder.reminderType === "power_off") {
          title = "Power Off Reminder";
          message = `Power on ${reminder.feederName} is scheduled to go OFF in approximately 10 minutes. Please prepare accordingly.`;
        } else if (reminder.reminderType === "power_on") {
          title = "Power On Reminder";
          message = `Power on ${reminder.feederName} is expected to be restored in approximately 10 minutes.`;
        } else if (reminder.reminderType === "maintenance_start") {
          title = "Maintenance Start Reminder";
          message = `Scheduled maintenance on ${reminder.feederName} will start in approximately 10 minutes.`;
        } else if (reminder.reminderType === "maintenance_end") {
          title = "Maintenance End Reminder";
          message = `Maintenance on ${reminder.feederName} is expected to end in approximately 10 minutes.`;
        }

        await notifyArea({
          feeder: reminder.feeder,
          title,
          message,
          io,
          isCustom: false
        });

        reminder.isSent = true;
        reminder.sentAt = now;
        await reminder.save();
      } catch (error) {
        console.error(`[Reminder] Failed to send reminder for feeder ${reminder.feederName}:`, error);
      }
    }
  })
  .catch(err => {
    console.error("[Cron] Error checking reminders:", err);
  });
};

export const startReminderScheduler = (io) => {
  if (_reminderInterval) return;
  _reminderInterval = setInterval(() => {
    sendPendingReminders(io);
  }, 1000 * 60); // Check every minute
  console.log("[Cron] Reminder scheduler started.");
};

export const stopReminderScheduler = () => {
  if (_reminderInterval) {
    clearInterval(_reminderInterval);
    _reminderInterval = null;
  }
};

export default { startPredictionScheduler, stopPredictionScheduler, startReminderScheduler, stopReminderScheduler };
