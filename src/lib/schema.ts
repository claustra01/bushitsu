export const STATUSES = ["yes", "maybe", "no"] as const;

export type Status = (typeof STATUSES)[number];

export type StatusLabels = Record<Status, string>;

export type DayDefinition = {
  id: string;
  label: string;
  date?: string;
};

export type PeriodDefinition = {
  id: string;
  label: string;
};

export type SlotDefinition = {
  id: string;
  dayId: string;
  periodId: string;
  enabled: boolean;
};

export type PollConfig = {
  schemaVersion: 1;
  timezone: string;
  grid: {
    days: DayDefinition[];
    periods: PeriodDefinition[];
    slots: SlotDefinition[];
  };
  statusLabels: StatusLabels;
};

export type AnswersMap = Partial<Record<string, Status>>;

export type ResponseAnswersJson = {
  schemaVersion: 1;
  answers: AnswersMap;
};

export type PollDto = {
  slug: string;
  title: string;
  description: string | null;
  isClosed: boolean;
  updatedAt?: string;
};

export type ResponseDto = {
  id: string;
  name: string;
  comment: string | null;
  answers: AnswersMap;
  version: number;
  updatedAt?: string;
};

export const DEFAULT_STATUS_LABELS: StatusLabels = {
  yes: "○",
  maybe: "△",
  no: "×"
};

export const UNANSWERED_LABEL = "未回答";
export const PERIOD_MIN = 0;
export const PERIOD_MAX = 9;
export const DEFAULT_START_PERIOD = 1;
export const DEFAULT_END_PERIOD = 7;

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isValidStatus(value: unknown): value is Status {
  return typeof value === "string" && STATUSES.includes(value as Status);
}

export type DateRange = {
  startDate: string;
  endDate: string;
};

export type PeriodRange = {
  startPeriod: number;
  endPeriod: number;
};

export function parseIsoDateParts(value: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }

  return { year, month, day };
}

export function addDaysToIsoDate(value: string, days: number): string {
  const parts = parseIsoDateParts(value);
  if (!parts) {
    throw new Error("Invalid ISO date");
  }

  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return isoDateFromUtcDate(date);
}

export function isoDateFromUtcDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getInclusiveDateRange(startDate: string, endDate: string): string[] {
  const start = parseIsoDateParts(startDate);
  const end = parseIsoDateParts(endDate);
  if (!start || !end) {
    return [];
  }

  const startTime = Date.UTC(start.year, start.month - 1, start.day);
  const endTime = Date.UTC(end.year, end.month - 1, end.day);
  if (endTime < startTime) {
    return [];
  }

  const dates: string[] = [];
  for (let time = startTime; time <= endTime; time += 24 * 60 * 60 * 1000) {
    dates.push(isoDateFromUtcDate(new Date(time)));
  }

  return dates;
}

export function formatDateLabel(value: string): string {
  const parts = parseIsoDateParts(value);
  if (!parts) {
    return value;
  }

  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  const weekday = WEEKDAY_LABELS[date.getUTCDay()];
  return `${parts.month}/${parts.day}(${weekday})`;
}

export function getInclusivePeriodRange(startPeriod: number, endPeriod: number): number[] {
  if (
    !Number.isInteger(startPeriod) ||
    !Number.isInteger(endPeriod) ||
    startPeriod < PERIOD_MIN ||
    endPeriod > PERIOD_MAX ||
    endPeriod < startPeriod
  ) {
    return [];
  }

  return Array.from({ length: endPeriod - startPeriod + 1 }, (_, index) => startPeriod + index);
}

export function formatPeriodLabel(period: number): string {
  return `${period}限`;
}

export function createDefaultDateRange(today = isoDateFromUtcDate(new Date())): DateRange {
  return {
    startDate: today,
    endDate: addDaysToIsoDate(today, 6)
  };
}

export function createDefaultPollConfig(options: {
  timezone?: string;
  startDate: string;
  endDate: string;
  startPeriod?: number;
  endPeriod?: number;
}): PollConfig {
  const dates = getInclusiveDateRange(options.startDate, options.endDate);
  const days: DayDefinition[] = dates.map((date, index) => ({
    id: `d${index}`,
    label: formatDateLabel(date),
    date
  }));

  const periodNumbers = getInclusivePeriodRange(
    options.startPeriod ?? DEFAULT_START_PERIOD,
    options.endPeriod ?? DEFAULT_END_PERIOD
  );
  const periods: PeriodDefinition[] = periodNumbers.map((period) => ({
    id: `p${period}`,
    label: formatPeriodLabel(period)
  }));

  const slots: SlotDefinition[] = days.flatMap((day) =>
    periods.map((period) => ({
      id: `${day.id}${period.id}`,
      dayId: day.id,
      periodId: period.id,
      enabled: true
    }))
  );

  return {
    schemaVersion: 1,
    timezone: options.timezone ?? "Asia/Tokyo",
    grid: {
      days,
      periods,
      slots
    },
    statusLabels: DEFAULT_STATUS_LABELS
  };
}

export function getEnabledSlots(config: PollConfig): SlotDefinition[] {
  return config.grid.slots.filter((slot) => slot.enabled);
}

export function getEnabledSlotIds(config: PollConfig): string[] {
  return getEnabledSlots(config).map((slot) => slot.id);
}

export function isValidSlotId(slotIds: readonly string[], slotId: string): boolean {
  return slotIds.includes(slotId);
}

export function makeResponseAnswersJson(answers: AnswersMap): ResponseAnswersJson {
  return {
    schemaVersion: 1,
    answers
  };
}
