/**
 * Schedule utilities for checking if rules are active based on time windows and cron expressions
 */

interface TimeWindow {
  day_of_week: number; // 0-6 (Sunday-Saturday)
  start_hour: number; // 0-23
  start_minute: number; // 0-59
  end_hour: number; // 0-23
  end_minute: number; // 0-59
  timezone?: string; // Timezone (e.g., "America/New_York"), defaults to UTC
}

/**
 * Check if a rule is currently active based on its schedule
 */
export function isRuleActive(
  rule: {
    enabled: boolean;
    schedule_type?: "always" | "time_windows" | "cron";
    time_windows?: TimeWindow[];
    cron_expression?: string;
    cron_timezone?: string;
  },
  now: Date = new Date()
): boolean {
  // Rule must be enabled
  if (!rule.enabled) {
    return false;
  }

  // If no schedule type or "always", rule is active when enabled
  if (!rule.schedule_type || rule.schedule_type === "always") {
    return true;
  }

  // Check time windows
  if (rule.schedule_type === "time_windows" && rule.time_windows) {
    return isWithinTimeWindows(rule.time_windows, now);
  }

  // Check cron expression
  if (rule.schedule_type === "cron" && rule.cron_expression) {
    return matchesCronExpression(rule.cron_expression, now, rule.cron_timezone);
  }

  // Default to inactive if schedule type is set but conditions aren't met
  return false;
}

/**
 * Check if current time is within any of the specified time windows
 */
function isWithinTimeWindows(timeWindows: TimeWindow[], now: Date): boolean {
  for (const window of timeWindows) {
    if (isWithinTimeWindow(window, now)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if current time is within a specific time window
 */
function isWithinTimeWindow(window: TimeWindow, now: Date): boolean {
  // Get the date in the specified timezone (or UTC if not specified)
  const tz = window.timezone || "UTC";
  const nowInTz = new Date(now.toLocaleString("en-US", { timeZone: tz }));
  
  const dayOfWeek = nowInTz.getUTCDay(); // 0-6 (Sunday-Saturday)
  const hour = nowInTz.getUTCHours();
  const minute = nowInTz.getUTCMinutes();

  // Check if day of week matches
  if (dayOfWeek !== window.day_of_week) {
    return false;
  }

  // Convert times to minutes for easier comparison
  const currentMinutes = hour * 60 + minute;
  const startMinutes = window.start_hour * 60 + window.start_minute;
  const endMinutes = window.end_hour * 60 + window.end_minute;

  // Handle case where end time is before start time (spans midnight)
  if (endMinutes < startMinutes) {
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }

  // Normal case: start time is before end time
  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}


function matchesCronExpression(
  cronExpression: string,
  now: Date,
  timezone?: string
): boolean {
  try {
    // Get the date in the specified timezone (or UTC if not specified)
    const tz = timezone || "UTC";
    const nowInTz = new Date(now.toLocaleString("en-US", { timeZone: tz }));
    
    const parts = cronExpression.trim().split(/\s+/);
    if (parts.length !== 5) {
      console.error(`Invalid cron expression: ${cronExpression} (expected 5 parts)`);
      return false;
    }

    const [minuteExpr, hourExpr, dayExpr, monthExpr, dayOfWeekExpr] = parts;

    const minute = nowInTz.getUTCMinutes();
    const hour = nowInTz.getUTCHours();
    const day = nowInTz.getUTCDate();
    const month = nowInTz.getUTCMonth() + 1; // getUTCMonth() returns 0-11
    const dayOfWeek = nowInTz.getUTCDay(); // 0-6 (Sunday-Saturday)

    return (
      matchesCronField(minuteExpr, minute, 0, 59) &&
      matchesCronField(hourExpr, hour, 0, 23) &&
      matchesCronField(dayExpr, day, 1, 31) &&
      matchesCronField(monthExpr, month, 1, 12) &&
      matchesCronField(dayOfWeekExpr, dayOfWeek, 0, 6)
    );
  } catch (error) {
    console.error(`Error parsing cron expression ${cronExpression}:`, error);
    return false;
  }
}

function matchesCronField(
  expr: string,
  value: number,
  min: number,
  max: number
): boolean {
  // Handle wildcard
  if (expr === "*") {
    return true;
  }

  // Handle step values (e.g., */5)
  if (expr.includes("/")) {
    const [range, stepStr] = expr.split("/");
    const step = parseInt(stepStr, 10);
    if (isNaN(step) || step <= 0) {
      return false;
    }

    // If range is *, check if value is divisible by step
    if (range === "*") {
      return value % step === 0;
    }

    // Otherwise, check if value is in range and matches step
    if (range.includes("-")) {
      const [startStr, endStr] = range.split("-");
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (isNaN(start) || isNaN(end)) {
        return false;
      }
      return value >= start && value <= end && (value - start) % step === 0;
    }

    const rangeStart = parseInt(range, 10);
    if (isNaN(rangeStart)) {
      return false;
    }
    return value >= rangeStart && value <= max && (value - rangeStart) % step === 0;
  }

  // Handle ranges (e.g., 1-5)
  if (expr.includes("-")) {
    const [startStr, endStr] = expr.split("-");
    const start = parseInt(startStr, 10);
    const end = parseInt(endStr, 10);
    if (isNaN(start) || isNaN(end)) {
      return false;
    }
    return value >= start && value <= end;
  }

  // Handle lists (e.g., 1,3,5)
  if (expr.includes(",")) {
    const values = expr.split(",").map((v) => parseInt(v.trim(), 10));
    return values.some((v) => !isNaN(v) && v === value);
  }

  // Handle specific value
  const num = parseInt(expr, 10);
  return !isNaN(num) && num === value;
}

