import { describe, expect, it } from "vitest";
import {
  getPollCalendarEndDate,
  isPollExpiredByCalendar
} from "../src/lib/retention";
import { createDefaultPollConfig } from "../src/lib/schema";

describe("calendar retention", () => {
  const now = new Date("2026-05-21T00:00:00+09:00");

  it("uses the latest calendar date in the poll config", () => {
    const config = createDefaultPollConfig({
      startDate: "2026-05-01",
      endDate: "2026-05-07"
    });

    expect(getPollCalendarEndDate(config)).toBe("2026-05-07");
  });

  it("expires a poll when the calendar end date is at least fourteen days old", () => {
    const config = createDefaultPollConfig({
      startDate: "2026-05-01",
      endDate: "2026-05-07"
    });

    expect(isPollExpiredByCalendar(config, now)).toBe(true);
  });

  it("keeps a poll when the calendar end date is newer than fourteen days old", () => {
    const config = createDefaultPollConfig({
      startDate: "2026-05-01",
      endDate: "2026-05-08"
    });

    expect(isPollExpiredByCalendar(config, now)).toBe(false);
  });
});
