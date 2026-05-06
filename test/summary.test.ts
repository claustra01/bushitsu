import { describe, expect, it } from "vitest";
import { computeSummary, getAvailabilityHighlight } from "../src/lib/summary";

const slots = ["d0p0", "d0p1", "d1p0"];

describe("computeSummary", () => {
  it("counts yes maybe and no correctly", () => {
    const summary = computeSummary(slots, [
      { answers: { d0p0: "yes", d0p1: "maybe", d1p0: "no" } },
      { answers: { d0p0: "yes", d0p1: "no", d1p0: "maybe" } }
    ]);

    expect(summary.d0p0).toEqual({ yes: 2, maybe: 0, no: 0, unanswered: 0 });
    expect(summary.d0p1).toEqual({ yes: 0, maybe: 1, no: 1, unanswered: 0 });
    expect(summary.d1p0).toEqual({ yes: 0, maybe: 1, no: 1, unanswered: 0 });
  });

  it("counts unanswered for missing answers", () => {
    const summary = computeSummary(slots, [{ answers: { d0p0: "yes" } }, { answers: {} }]);

    expect(summary.d0p0).toEqual({ yes: 1, maybe: 0, no: 0, unanswered: 1 });
    expect(summary.d0p1).toEqual({ yes: 0, maybe: 0, no: 0, unanswered: 2 });
  });

  it("ignores unknown statuses by treating them as unanswered", () => {
    const summary = computeSummary(slots, [
      { answers: { d0p0: "busy", d0p1: "maybe" } as Record<string, unknown> }
    ]);

    expect(summary.d0p0).toEqual({ yes: 0, maybe: 0, no: 0, unanswered: 1 });
    expect(summary.d0p1).toEqual({ yes: 0, maybe: 1, no: 0, unanswered: 0 });
  });

  it("handles zero responses", () => {
    const summary = computeSummary(slots, []);

    expect(summary.d0p0).toEqual({ yes: 0, maybe: 0, no: 0, unanswered: 0 });
    expect(summary.d0p1).toEqual({ yes: 0, maybe: 0, no: 0, unanswered: 0 });
  });
});

describe("getAvailabilityHighlight", () => {
  it("marks a slot where everyone can attend", () => {
    expect(getAvailabilityHighlight({ yes: 3, maybe: 0, no: 0, unanswered: 0 }, 3)).toBe("all");
  });

  it("marks a slot where everyone except one can attend", () => {
    expect(getAvailabilityHighlight({ yes: 2, maybe: 1, no: 0, unanswered: 0 }, 3)).toBe("almost");
    expect(getAvailabilityHighlight({ yes: 2, maybe: 0, no: 1, unanswered: 0 }, 3)).toBe("almost");
    expect(getAvailabilityHighlight({ yes: 2, maybe: 0, no: 0, unanswered: 1 }, 3)).toBe("almost");
  });

  it("does not highlight empty or weak candidates", () => {
    expect(getAvailabilityHighlight({ yes: 0, maybe: 0, no: 0, unanswered: 0 }, 0)).toBe("none");
    expect(getAvailabilityHighlight({ yes: 0, maybe: 1, no: 0, unanswered: 0 }, 1)).toBe("none");
    expect(getAvailabilityHighlight({ yes: 1, maybe: 1, no: 1, unanswered: 0 }, 3)).toBe("none");
  });
});
