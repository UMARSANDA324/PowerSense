const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (date) => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};

const endOfDay = (date) => {
  const value = startOfDay(date);
  value.setDate(value.getDate() + 1);
  return value;
};

const normalizeCustomDate = (value, fallback) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : fallback;
};

export const resolveDateRange = ({ range = "last30", startDate, endDate } = {}) => {
  const now = new Date();
  const today = startOfDay(now);
  let start = today;
  let end = new Date(now);

  switch (range) {
    case "today":
      end = endOfDay(now);
      break;
    case "yesterday":
      start = new Date(today.getTime() - DAY_MS);
      end = today;
      break;
    case "last7":
    case "7d":
    case "week":
      start = new Date(today.getTime() - 6 * DAY_MS);
      break;
    case "last30":
    case "30d":
    case "month":
      start = new Date(today.getTime() - 29 * DAY_MS);
      break;
    case "thisMonth":
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      break;
    case "lastMonth":
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end = new Date(today.getFullYear(), today.getMonth(), 1);
      break;
    case "custom": {
      const fallbackStart = new Date(today.getTime() - 30 * DAY_MS);
      start = startOfDay(normalizeCustomDate(startDate, fallbackStart));
      end = endOfDay(normalizeCustomDate(endDate, now));
      break;
    }
    case "quarter":
      start = new Date(today.getTime() - 89 * DAY_MS);
      break;
    case "year":
      start = new Date(today.getTime() - 364 * DAY_MS);
      break;
    default:
      start = new Date(today.getTime() - 30 * DAY_MS);
  }

  if (end <= start) end = new Date(start.getTime() + DAY_MS);
  const durationMs = end.getTime() - start.getTime();
  return {
    start,
    end,
    previousStart: new Date(start.getTime() - durationMs),
    previousEnd: start,
    days: Math.max(1, Math.ceil(durationMs / DAY_MS)),
    range
  };
};

export const toDateKey = (date) => new Date(date).toISOString().slice(0, 10);