import { describe, expect, it } from "vitest";
import { createDefaultPollConfig, isValidSlotId, isValidStatus } from "../src/lib/schema";
import { validateAnswersInput, validatePollCreateInput, validateResponseCreateInput } from "../src/lib/validation";

const slots = ["d0p0", "d0p1"];

describe("status validation", () => {
  it("accepts allowed statuses", () => {
    expect(isValidStatus("yes")).toBe(true);
    expect(isValidStatus("maybe")).toBe(true);
    expect(isValidStatus("no")).toBe(true);
  });

  it("rejects invalid statuses", () => {
    expect(isValidStatus("unknown")).toBe(false);
    expect(validateAnswersInput({ d0p0: "busy" }, slots).ok).toBe(false);
  });
});

describe("slot validation", () => {
  it("accepts known slot IDs", () => {
    expect(isValidSlotId(slots, "d0p0")).toBe(true);
  });

  it("rejects unknown slot IDs", () => {
    expect(isValidSlotId(slots, "d9p9")).toBe(false);
    expect(validateAnswersInput({ d9p9: "yes" }, slots).ok).toBe(false);
  });
});

describe("response validation", () => {
  it("rejects overlong name", () => {
    const result = validateResponseCreateInput(
      {
        name: "あ".repeat(51),
        comment: "",
        answers: {}
      },
      slots
    );

    expect(result.ok).toBe(false);
  });

  it("rejects malformed answer object", () => {
    expect(validateAnswersInput([], slots).ok).toBe(false);
    expect(validateAnswersInput(null, slots).ok).toBe(false);
  });

  it("accepts partial answers", () => {
    const result = validateResponseCreateInput(
      {
        name: "山田",
        comment: "",
        answers: {
          d0p0: "yes"
        }
      },
      slots
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.answers).toEqual({ d0p0: "yes" });
    }
  });
});

describe("poll creation validation", () => {
  it("accepts a valid date range", () => {
    const result = validatePollCreateInput({
      title: "来週の予定",
      description: "",
      startDate: "2026-05-07",
      endDate: "2026-05-10",
      startPeriod: 0,
      endPeriod: 9
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.startDate).toBe("2026-05-07");
      expect(result.value.endDate).toBe("2026-05-10");
      expect(result.value.startPeriod).toBe(0);
      expect(result.value.endPeriod).toBe(9);
    }
  });

  it("rejects an end date before the start date", () => {
    const result = validatePollCreateInput({
      title: "来週の予定",
      startDate: "2026-05-10",
      endDate: "2026-05-07"
    });

    expect(result.ok).toBe(false);
  });

  it("rejects date ranges longer than fourteen days", () => {
    const result = validatePollCreateInput({
      title: "来週の予定",
      startDate: "2026-05-01",
      endDate: "2026-05-15"
    });

    expect(result.ok).toBe(false);
  });

  it("rejects an end period before the start period", () => {
    const result = validatePollCreateInput({
      title: "来週の予定",
      startDate: "2026-05-07",
      endDate: "2026-05-10",
      startPeriod: 7,
      endPeriod: 6
    });

    expect(result.ok).toBe(false);
  });

  it("rejects periods outside zero through nine", () => {
    const result = validatePollCreateInput({
      title: "来週の予定",
      startDate: "2026-05-07",
      endDate: "2026-05-10",
      startPeriod: -1,
      endPeriod: 9
    });

    expect(result.ok).toBe(false);
  });
});

describe("poll config generation", () => {
  it("uses selected dates and selected periods without a night period", () => {
    const config = createDefaultPollConfig({
      startDate: "2026-05-07",
      endDate: "2026-05-08",
      startPeriod: 0,
      endPeriod: 2
    });

    expect(config.grid.days).toEqual([
      { id: "d0", label: "5/7(木)", date: "2026-05-07" },
      { id: "d1", label: "5/8(金)", date: "2026-05-08" }
    ]);
    expect(config.grid.periods).toEqual([
      { id: "p0", label: "0限" },
      { id: "p1", label: "1限" },
      { id: "p2", label: "2限" }
    ]);
    expect(config.grid.slots).toHaveLength(6);
  });

  it("defaults to first through seventh period", () => {
    const config = createDefaultPollConfig({
      startDate: "2026-05-07",
      endDate: "2026-05-07"
    });

    expect(config.grid.periods.at(0)).toEqual({ id: "p1", label: "1限" });
    expect(config.grid.periods.at(-1)).toEqual({ id: "p7", label: "7限" });
    expect(config.grid.slots).toHaveLength(7);
  });
});
