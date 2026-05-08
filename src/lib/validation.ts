import {
  DEFAULT_STATUS_LABELS,
  DEFAULT_END_PERIOD,
  DEFAULT_START_PERIOD,
  PERIOD_MAX,
  PERIOD_MIN,
  addDaysToIsoDate,
  getInclusiveDateRange,
  getInclusivePeriodRange,
  parseIsoDateParts,
  type AnswersMap,
  type PollConfig,
  type ResponseAnswersJson,
  type StatusLabels,
  isRecord,
  isValidStatus
} from "./schema";

export const LIMITS = {
  requestBodyBytes: 32 * 1024,
  titleMax: 100,
  descriptionMax: 1000,
  nameMax: 50,
  commentMax: 500,
  answersJsonMax: 16 * 1024,
  daysMax: 14,
  periodsMax: 10,
  enabledSlotsMax: 140,
  timezoneMax: 64
} as const;

export type ValidationResult<T> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      message: string;
    };

export type PollCreateInput = {
  title: string;
  description: string | null;
  timezone: string;
  startDate: string;
  endDate: string;
  startPeriod: number;
  endPeriod: number;
};

export type ResponseCreateInput = {
  name: string;
  comment: string | null;
  answers: AnswersMap;
};

export type ResponseUpdateInput = ResponseCreateInput & {
  version: number;
};

export type ClosePollInput = {
  isClosed: boolean;
};

function valid<T>(value: T): ValidationResult<T> {
  return { ok: true, value };
}

function invalid<T>(message: string): ValidationResult<T> {
  return { ok: false, message };
}

function cleanRequiredString(value: unknown, field: string, maxLength: number): ValidationResult<string> {
  if (typeof value !== "string") {
    return invalid(`${field} は文字列で入力してください`);
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return invalid(`${field} は必須です`);
  }

  if (trimmed.length > maxLength) {
    return invalid(`${field} は ${maxLength} 文字以内で入力してください`);
  }

  return valid(trimmed);
}

function cleanOptionalString(
  value: unknown,
  field: string,
  maxLength: number
): ValidationResult<string | null> {
  if (value === undefined || value === null) {
    return valid(null);
  }

  if (typeof value !== "string") {
    return invalid(`${field} は文字列で入力してください`);
  }

  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    return invalid(`${field} は ${maxLength} 文字以内で入力してください`);
  }

  return valid(trimmed.length > 0 ? trimmed : null);
}

function isKnownTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("ja-JP", { timeZone: value }).format(new Date(0));
    return true;
  } catch {
    return false;
  }
}

function getTodayIsoInTimezone(timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    return "1970-01-01";
  }

  return `${year}-${month}-${day}`;
}

function validateDateRange(
  startDateValue: unknown,
  endDateValue: unknown,
  timezone: string
): ValidationResult<{ startDate: string; endDate: string }> {
  const today = getTodayIsoInTimezone(timezone);
  const startDate = startDateValue ?? today;
  const endDate = endDateValue ?? addDaysToIsoDate(today, 6);

  if (typeof startDate !== "string" || typeof endDate !== "string") {
    return invalid("開始日と終了日は YYYY-MM-DD 形式で入力してください");
  }

  if (!parseIsoDateParts(startDate) || !parseIsoDateParts(endDate)) {
    return invalid("開始日と終了日は YYYY-MM-DD 形式で入力してください");
  }

  const dates = getInclusiveDateRange(startDate, endDate);
  if (dates.length === 0) {
    return invalid("終了日は開始日以降にしてください");
  }

  if (dates.length > LIMITS.daysMax) {
    return invalid(`日付範囲は ${LIMITS.daysMax} 日以内にしてください`);
  }

  return valid({ startDate, endDate });
}

function cleanPeriodValue(value: unknown, field: string): ValidationResult<number> {
  const numberValue = typeof value === "string" && value.trim() !== "" ? Number(value) : value;

  if (typeof numberValue !== "number" || !Number.isInteger(numberValue)) {
    return invalid(`${field} は ${PERIOD_MIN} から ${PERIOD_MAX} の整数で入力してください`);
  }

  if (numberValue < PERIOD_MIN || numberValue > PERIOD_MAX) {
    return invalid(`${field} は ${PERIOD_MIN} から ${PERIOD_MAX} の範囲で入力してください`);
  }

  return valid(numberValue);
}

function validatePeriodRange(
  startPeriodValue: unknown,
  endPeriodValue: unknown
): ValidationResult<{ startPeriod: number; endPeriod: number }> {
  const startPeriod = cleanPeriodValue(startPeriodValue ?? DEFAULT_START_PERIOD, "開始時限");
  if (!startPeriod.ok) {
    return startPeriod;
  }

  const endPeriod = cleanPeriodValue(endPeriodValue ?? DEFAULT_END_PERIOD, "終了時限");
  if (!endPeriod.ok) {
    return endPeriod;
  }

  const periods = getInclusivePeriodRange(startPeriod.value, endPeriod.value);
  if (periods.length === 0) {
    return invalid("終了時限は開始時限以降にしてください");
  }

  if (periods.length > LIMITS.periodsMax) {
    return invalid(`時限範囲は ${LIMITS.periodsMax} 件以内にしてください`);
  }

  return valid({ startPeriod: startPeriod.value, endPeriod: endPeriod.value });
}

export function validatePollCreateInput(input: unknown): ValidationResult<PollCreateInput> {
  if (!isRecord(input)) {
    return invalid("リクエスト本文は JSON オブジェクトにしてください");
  }

  const title = cleanRequiredString(input.title, "title", LIMITS.titleMax);
  if (!title.ok) {
    return title;
  }

  const description = cleanOptionalString(input.description, "description", LIMITS.descriptionMax);
  if (!description.ok) {
    return description;
  }

  const timezoneValue = input.timezone ?? "Asia/Tokyo";
  if (typeof timezoneValue !== "string") {
    return invalid("timezone は文字列で入力してください");
  }

  const timezone = timezoneValue.trim() || "Asia/Tokyo";
  if (timezone.length > LIMITS.timezoneMax || !isKnownTimezone(timezone)) {
    return invalid("timezone が正しくありません");
  }

  const dateRange = validateDateRange(input.startDate, input.endDate, timezone);
  if (!dateRange.ok) {
    return dateRange;
  }

  const periodRange = validatePeriodRange(input.startPeriod, input.endPeriod);
  if (!periodRange.ok) {
    return periodRange;
  }

  return valid({
    title: title.value,
    description: description.value,
    timezone,
    startDate: dateRange.value.startDate,
    endDate: dateRange.value.endDate,
    startPeriod: periodRange.value.startPeriod,
    endPeriod: periodRange.value.endPeriod
  });
}

export function validatePollConfig(input: unknown): ValidationResult<PollConfig> {
  if (!isRecord(input) || input.schemaVersion !== 1 || !isRecord(input.grid)) {
    return invalid("config_json の形式が正しくありません");
  }

  if (typeof input.timezone !== "string" || input.timezone.length === 0) {
    return invalid("timezone が正しくありません");
  }

  const days = input.grid.days;
  const periods = input.grid.periods;
  const slots = input.grid.slots;
  if (!Array.isArray(days) || !Array.isArray(periods) || !Array.isArray(slots)) {
    return invalid("grid の形式が正しくありません");
  }

  if (days.length === 0 || days.length > LIMITS.daysMax) {
    return invalid(`days は 1 から ${LIMITS.daysMax} 件にしてください`);
  }

  if (periods.length === 0 || periods.length > LIMITS.periodsMax) {
    return invalid(`periods は 1 から ${LIMITS.periodsMax} 件にしてください`);
  }

  const dayIds = new Set<string>();
  for (const day of days) {
    if (!isRecord(day) || typeof day.id !== "string" || typeof day.label !== "string") {
      return invalid("days の形式が正しくありません");
    }
    if (dayIds.has(day.id)) {
      return invalid("day id が重複しています");
    }
    dayIds.add(day.id);
  }

  const periodIds = new Set<string>();
  for (const period of periods) {
    if (!isRecord(period) || typeof period.id !== "string" || typeof period.label !== "string") {
      return invalid("periods の形式が正しくありません");
    }
    if (periodIds.has(period.id)) {
      return invalid("period id が重複しています");
    }
    periodIds.add(period.id);
  }

  const slotIds = new Set<string>();
  let enabledSlotCount = 0;
  for (const slot of slots) {
    if (
      !isRecord(slot) ||
      typeof slot.id !== "string" ||
      typeof slot.dayId !== "string" ||
      typeof slot.periodId !== "string" ||
      typeof slot.enabled !== "boolean"
    ) {
      return invalid("slots の形式が正しくありません");
    }
    if (slotIds.has(slot.id)) {
      return invalid("slot id が重複しています");
    }
    if (!dayIds.has(slot.dayId) || !periodIds.has(slot.periodId)) {
      return invalid("slot が存在しない dayId または periodId を参照しています");
    }
    if (slot.enabled) {
      enabledSlotCount += 1;
    }
    slotIds.add(slot.id);
  }

  if (enabledSlotCount > LIMITS.enabledSlotsMax) {
    return invalid(`enabled slots は ${LIMITS.enabledSlotsMax} 件以内にしてください`);
  }

  const statusLabelsResult = validateStatusLabels(input.statusLabels);
  if (!statusLabelsResult.ok) {
    return statusLabelsResult;
  }

  return valid({
    schemaVersion: 1,
    timezone: input.timezone,
    grid: {
      days: days.map((day) => ({
        id: String(day.id),
        label: String(day.label),
        ...(typeof day.date === "string" ? { date: day.date } : {})
      })),
      periods: periods.map((period) => ({ id: String(period.id), label: String(period.label) })),
      slots: slots.map((slot) => ({
        id: String(slot.id),
        dayId: String(slot.dayId),
        periodId: String(slot.periodId),
        enabled: Boolean(slot.enabled)
      }))
    },
    statusLabels: statusLabelsResult.value
  });
}

function validateStatusLabels(input: unknown): ValidationResult<StatusLabels> {
  if (input === undefined) {
    return valid(DEFAULT_STATUS_LABELS);
  }

  if (!isRecord(input)) {
    return invalid("statusLabels の形式が正しくありません");
  }

  const yes = input.yes;
  const maybe = input.maybe;
  const no = input.no;
  if (typeof yes !== "string" || typeof maybe !== "string" || typeof no !== "string") {
    return invalid("statusLabels の形式が正しくありません");
  }

  return valid({ yes, maybe, no });
}

export function validateAnswersInput(
  input: unknown,
  enabledSlotIds: readonly string[]
): ValidationResult<AnswersMap> {
  if (!isRecord(input)) {
    return invalid("answers は JSON オブジェクトにしてください");
  }

  const slotIdSet = new Set(enabledSlotIds);
  const answers: AnswersMap = {};

  for (const [slotId, status] of Object.entries(input)) {
    if (!slotIdSet.has(slotId)) {
      return invalid(`不明な slot id です: ${slotId}`);
    }

    if (!isValidStatus(status)) {
      return invalid(`不正な回答ステータスです: ${slotId}`);
    }

    answers[slotId] = status;
  }

  const serialized = JSON.stringify({ schemaVersion: 1, answers });
  if (new TextEncoder().encode(serialized).byteLength > LIMITS.answersJsonMax) {
    return invalid(`answers_json は ${LIMITS.answersJsonMax} bytes 以内にしてください`);
  }

  return valid(answers);
}

export function validateResponseAnswersJson(
  input: unknown,
  enabledSlotIds: readonly string[]
): ValidationResult<ResponseAnswersJson> {
  if (!isRecord(input) || input.schemaVersion !== 1) {
    return invalid("answers_json の形式が正しくありません");
  }

  const answers = validateAnswersInput(input.answers, enabledSlotIds);
  if (!answers.ok) {
    return answers;
  }

  return valid({
    schemaVersion: 1,
    answers: answers.value
  });
}

export function validateResponseCreateInput(
  input: unknown,
  enabledSlotIds: readonly string[]
): ValidationResult<ResponseCreateInput> {
  if (!isRecord(input)) {
    return invalid("リクエスト本文は JSON オブジェクトにしてください");
  }

  const name = cleanRequiredString(input.name, "name", LIMITS.nameMax);
  if (!name.ok) {
    return name;
  }

  const comment = cleanOptionalString(input.comment, "comment", LIMITS.commentMax);
  if (!comment.ok) {
    return comment;
  }

  const answers = validateAnswersInput(input.answers, enabledSlotIds);
  if (!answers.ok) {
    return answers;
  }

  return valid({
    name: name.value,
    comment: comment.value,
    answers: answers.value
  });
}

export function validateResponseUpdateInput(
  input: unknown,
  enabledSlotIds: readonly string[]
): ValidationResult<ResponseUpdateInput> {
  const response = validateResponseCreateInput(input, enabledSlotIds);
  if (!response.ok) {
    return response;
  }

  if (!isRecord(input) || typeof input.version !== "number" || !Number.isInteger(input.version) || input.version < 1) {
    return invalid("version は 1 以上の整数で入力してください");
  }

  const version = input.version;

  return valid({
    ...response.value,
    version
  });
}

export function validateClosePollInput(input: unknown): ValidationResult<ClosePollInput> {
  if (!isRecord(input) || typeof input.isClosed !== "boolean") {
    return invalid("isClosed は真偽値で入力してください");
  }

  return valid({ isClosed: input.isClosed });
}
