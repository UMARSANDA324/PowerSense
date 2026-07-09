import { createCountdown } from "./countdownEngine.js";

const assert = (condition, message) => {
  if (!condition) {
    console.error("TEST FAILED:", message);
    process.exitCode = 1;
    throw new Error(message);
  }
};

const run = () => {
  const now = new Date("2026-06-26T13:00:00.000Z");
  const target = new Date("2026-06-26T14:00:00.000Z");
  const countdown = createCountdown({ currentTime: now, targetTime: target });

  assert(countdown.remainingMinutes === 60, `expected 60 minutes, got ${countdown.remainingMinutes}`);
  assert(countdown.remainingHours === 1, `expected 1 hour, got ${countdown.remainingHours}`);
  assert(countdown.formatted === "1h 0m 0s", `unexpected formatted value: ${countdown.formatted}`);
  assert(!countdown.isExpired, "Countdown should not be expired");

  const after10 = new Date("2026-06-26T13:10:00.000Z");
  const countdownAfter10 = createCountdown({ currentTime: after10, targetTime: target });
  assert(countdownAfter10.remainingMinutes === 50, `expected 50 minutes, got ${countdownAfter10.remainingMinutes}`);

  const after59 = new Date("2026-06-26T13:59:00.000Z");
  const countdownAfter59 = createCountdown({ currentTime: after59, targetTime: target });
  assert(countdownAfter59.remainingMinutes === 1, `expected 1 minute, got ${countdownAfter59.remainingMinutes}`);

  const expired = new Date("2026-06-26T14:00:01.000Z");
  const countdownExpired = createCountdown({ currentTime: expired, targetTime: target });
  assert(countdownExpired.isExpired, "Expected countdown to be expired");
  assert(countdownExpired.formatted === "0s", `expected 0s on expired countdown, got ${countdownExpired.formatted}`);

  console.log("All countdown engine tests passed.");
};

run();
