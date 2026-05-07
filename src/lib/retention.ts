import { addDaysToIsoDate, parseIsoDateParts, type PollConfig } from "./schema";

export const POLL_RETENTION_DAYS = 14;
export const DEFAULT_RETENTION_TIMEZONE = "Asia/Tokyo";

export function getIsoDateInTimezone(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    return "1970-01-01";
  }

  return `${year}-${month}-${day}`;
}

export function getPollCalendarEndDate(config: PollConfig): string | null {
  const dates = config.grid.days
    .map((day) => day.date)
    .filter((date): date is string => typeof date === "string" && parseIsoDateParts(date) !== null);

  if (dates.length === 0) {
    return null;
  }

  return dates.sort().at(-1) ?? null;
}

export function isPollExpiredByCalendar(
  config: PollConfig,
  now = new Date(),
  retentionDays = POLL_RETENTION_DAYS
): boolean {
  const endDate = getPollCalendarEndDate(config);
  if (!endDate) {
    return false;
  }

  const timezone = config.timezone || DEFAULT_RETENTION_TIMEZONE;
  const today = getIsoDateInTimezone(now, timezone);
  const cutoffDate = addDaysToIsoDate(today, -retentionDays);
  return endDate <= cutoffDate;
}
