import predictionService from "../services/predictionService.js";
import Reminder from "../models/Reminder.js";
import { notifyArea } from "./notificationHelper.js";

let _predictionInterval = null;
let _reminderInterval = null;
const schedulerHealth = {
  prediction: { status: "Stopped", lastRunAt: null, lastError: null },
  reminder: { status: "Stopped", lastRunAt: null, lastError: null }
};

export const getSchedulerHealth = () => ({
  prediction: { ...schedulerHealth.prediction },
  reminder: { ...schedulerHealth.reminder }
});

export const startPredictionScheduler = (io, options = {}) => {
  const intervalMs = options.intervalMs || 1000 * 60 * 60 * 6; // default: every 6 hours
  if (_predictionInterval) return;
  schedulerHealth.prediction.status = "Running";
  schedulerHealth.prediction.lastError = null;

  _predictionInterval = setInterval(async () => {
    try {
      const results = await predictionService.generatePredictions({ limit: 20 });
      schedulerHealth.prediction.lastRunAt = new Date().toISOString();
      schedulerHealth.prediction.lastError = null;
      if (io) io.emit("predictions:updated", results);
      console.log(`[Cron] Predictions generated: ${results.length}`);
    } catch (err) {
      schedulerHealth.prediction.status = "Warning";
      schedulerHealth.prediction.lastError = err.message;
      console.error("[Cron] Prediction generation failed:", err.message);
    }
  }, intervalMs);
};

export const stopPredictionScheduler = () => {
  if (_predictionInterval) {
    clearInterval(_predictionInterval);
    _predictionInterval = null;
    schedulerHealth.prediction.status = "Stopped";
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
                let title, message, adminTitle, adminMessage;
                if (reminder.reminderType === "power_off") {
                    title = "Power Off Reminder";
                    message = `Litha would like to inform you that power for ${reminder.feederName} is expected to go OFF in approximately 10 minutes. Please make any necessary preparations.`;
                    adminTitle = "Power Off Reminder";
                    adminMessage = `This is a reminder that ${reminder.feederName} is scheduled for a power status update in approximately 10 minutes. Please verify readiness before the scheduled operation.`;
                } else if (reminder.reminderType === "power_on") {
                    title = "Power On Reminder";
                    message = `Litha would like to inform you that power for ${reminder.feederName} is expected to be restored in approximately 10 minutes.`;
                    adminTitle = "Power On Reminder";
                    adminMessage = `This is a reminder that ${reminder.feederName} is scheduled for a power status update in approximately 10 minutes. Please verify readiness before the scheduled operation.`;
                } else if (reminder.reminderType === "maintenance_start") {
                    title = "Maintenance Start Reminder";
                    message = `Litha would like to inform you that scheduled maintenance on ${reminder.feederName} will start in approximately 10 minutes. Please make any necessary preparations.`;
                    adminTitle = "Maintenance Start Reminder";
                    adminMessage = `This is a reminder that ${reminder.feederName} is scheduled for maintenance in approximately 10 minutes. Please verify readiness before the scheduled operation.`;
                } else if (reminder.reminderType === "maintenance_end") {
                    title = "Maintenance End Reminder";
                    message = `Litha would like to inform you that maintenance on ${reminder.feederName} is expected to end in approximately 10 minutes.`;
                    adminTitle = "Maintenance End Reminder";
                    adminMessage = `This is a reminder that maintenance on ${reminder.feederName} is scheduled to end in approximately 10 minutes. Please verify readiness before the scheduled operation.`;
                }

                await notifyArea({
                    feeder: reminder.feeder,
                    title,
                    message,
                    adminTitle,
                    adminMessage,
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
  schedulerHealth.reminder.status = "Running";
  schedulerHealth.reminder.lastError = null;
  _reminderInterval = setInterval(() => {
    sendPendingReminders(io);
  }, 1000 * 60); // Check every minute
  console.log("[Cron] Reminder scheduler started.");
};

export const stopReminderScheduler = () => {
  if (_reminderInterval) {
    clearInterval(_reminderInterval);
    _reminderInterval = null;
    schedulerHealth.reminder.status = "Stopped";
  }
};

export default { startPredictionScheduler, stopPredictionScheduler, startReminderScheduler, stopReminderScheduler };
