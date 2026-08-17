import { Clock } from "lucide-react";
import { useCountdownEngine } from "../hooks/useCountdownEngine";
import { memo, useCallback } from "react";

// Stable no-op so useCallback never gets a new reference when onExpire is undefined
const NOOP = () => {};

const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === "number") {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const date = new Date(trimmed);
    return isNaN(date.getTime()) ? null : date;
  }
  return null;
};

const getMode = ({ status, expectedOutageTime, expectedRestoreTime, maintenanceEnd, nextScheduledOutage }) => {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "maintenance") return "maintenance";
  if (normalized === "off") return "outage";
  if (normalized === "on") {
    if (expectedOutageTime || nextScheduledOutage) return "available";
    return "none";
  }
  return "none";
};

const getTargetTime = ({ mode, expectedOutageTime, expectedRestoreTime, maintenanceEnd, nextScheduledOutage, estimatedRestoreTime }) => {
  if (mode === "available") return toDate(expectedOutageTime || nextScheduledOutage);
  if (mode === "outage") return toDate(expectedRestoreTime || estimatedRestoreTime);
  if (mode === "maintenance") return toDate(maintenanceEnd || expectedRestoreTime || estimatedRestoreTime);
  return null;
};

const getModeLabel = (mode) => {
  switch (mode) {
    case "available":
      return {
        title: "Power Available",
        statusText: "🟢 Current Status",
        detail: "Expected Outage",
        empty: "There are currently no confirmed ON/OFF or maintenance schedules for your feeder.",
      };
    case "outage":
      return {
        title: "Power Outage",
        statusText: "🔴 Current Status",
        detail: "Expected Restoration",
        empty: "Restoration time unavailable",
      };
    case "maintenance":
      return {
        title: "Maintenance",
        statusText: "🟡 Maintenance",
        detail: "Expected Completion",
        empty: "Completion time unavailable",
      };
    default:
      return {
        title: "Current Status",
        statusText: "Current Status",
        detail: "No schedule available",
        empty: "Nikola is actively monitoring your assigned feeder for upcoming operator updates.",
      };
  }
};

const PowerCountdownInner = ({
  status,
  expectedOutageTime,
  expectedRestoreTime,
  maintenanceStart,
  maintenanceEnd,
  reason,
  updatedBy,
  nextScheduledOutage,
  estimatedRestoreTime,
  onExpire
}) => {
  const mode = getMode({ status, expectedOutageTime, expectedRestoreTime, maintenanceEnd });
  const targetTime = getTargetTime({ mode, expectedOutageTime, expectedRestoreTime, maintenanceEnd });
  
  // Memoize the onExpire callback to prevent hook re-execution
  const memoizedOnExpire = useCallback(onExpire ?? NOOP, [onExpire]);
  
  const countdown = useCountdownEngine(targetTime, mode, memoizedOnExpire);
  const modeLabel = getModeLabel(mode);
  const statusLabel = mode === "available" ? "ON" : mode === "outage" ? "OFF" : mode === "maintenance" ? "MAINTENANCE" : "ON";

  const formattedTarget = targetTime ? targetTime.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "TBD";
  const updatedByName = updatedBy?.fullName || updatedBy || "Grid operations";

  return (
    <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-md transition-all animate-in fade-in duration-300 delay-100">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-widest text-slate-400">{modeLabel.statusText}</span>
          <div className={`mt-3 inline-flex items-center rounded-3xl px-4 py-3 text-lg font-black ${mode === "available" ? "bg-green-50 text-green-800" : mode === "outage" ? "bg-red-50 text-red-800" : mode === "maintenance" ? "bg-yellow-50 text-yellow-800" : "bg-slate-100 text-slate-500"}`}>
            {mode === "available" ? "🟢 ON" : mode === "outage" ? "🔴 OFF" : mode === "maintenance" ? "🟡 MAINTENANCE" : "🟢 ON"}
          </div>
        </div>

        <div className="text-sm text-slate-500 text-left sm:text-right">
          {mode === "none" ? (
            <span>No schedule available</span>
          ) : (
            <>
              <div>{modeLabel.detail}: {formattedTarget}</div>
              <div className="text-[10px] text-slate-400 mt-1 max-w-[250px] leading-relaxed italic">
                * Schedules are estimates and may change due to operational requirements.
              </div>
            </>
          )}
        </div>
      </div>

      {targetTime && countdown.isExpired && (
        <div className="mt-4 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm leading-relaxed flex items-start gap-2.5">
          <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold uppercase tracking-wider text-[10px] text-amber-800 mb-1">Operational Update Delay</p>
            <p>
              The scheduled operation time has passed. Our monitoring system is awaiting confirmation from field operators. Nikola will automatically update this status as soon as operator confirmation is received.
            </p>
          </div>
        </div>
      )}

      {mode === "none" ? (
        <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-slate-600">
          <p className="text-xl font-semibold text-slate-900">{modeLabel.empty}</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
            <p className="text-xs uppercase tracking-widest text-slate-500">Countdown</p>
            <p className="mt-3 text-3xl font-black text-slate-900">{countdown.formatted}</p>
          </div>
          <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
            <p className="text-xs uppercase tracking-widest text-slate-500">Status</p>
            <p className="mt-3 text-lg font-bold text-slate-900">{statusLabel}</p>
          </div>
          <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
            <p className="text-xs uppercase tracking-widest text-slate-500">Reason</p>
            <p className="mt-3 text-sm font-semibold text-slate-900">{reason || "No reason provided"}</p>
          </div>
          <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
            <p className="text-xs uppercase tracking-widest text-slate-500">Updated By</p>
            <p className="mt-3 text-sm font-semibold text-slate-900">{updatedByName}</p>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Memoized PowerCountdown to prevent unnecessary re-renders
 * Only re-renders when props actually change
 */
const PowerCountdown = memo(PowerCountdownInner);

export default PowerCountdown;
