import { type AnswersMap, type Status, isValidStatus } from "./schema";

export type SummaryCell = {
  yes: number;
  maybe: number;
  no: number;
  unanswered: number;
};

export type Summary = Record<string, SummaryCell>;

export type AvailabilityHighlight = "all" | "almost" | "none";

export type SummaryResponseInput = {
  answers: Record<string, unknown> | AnswersMap;
};

export function createEmptySummaryCell(): SummaryCell {
  return {
    yes: 0,
    maybe: 0,
    no: 0,
    unanswered: 0
  };
}

export function computeSummary(
  enabledSlotIds: readonly string[],
  responses: readonly SummaryResponseInput[]
): Summary {
  const summary: Summary = {};

  for (const slotId of enabledSlotIds) {
    summary[slotId] = createEmptySummaryCell();
  }

  for (const response of responses) {
    for (const slotId of enabledSlotIds) {
      const status = response.answers[slotId];
      if (isValidStatus(status)) {
        summary[slotId][status] += 1;
      } else {
        summary[slotId].unanswered += 1;
      }
    }
  }

  return summary;
}

export function countAnswers(enabledSlotIds: readonly string[], answers: AnswersMap): SummaryCell {
  const counts = createEmptySummaryCell();

  for (const slotId of enabledSlotIds) {
    const status = answers[slotId] as Status | undefined;
    if (status === undefined) {
      counts.unanswered += 1;
    } else {
      counts[status] += 1;
    }
  }

  return counts;
}

export function getAvailabilityHighlight(cell: SummaryCell, totalParticipants: number): AvailabilityHighlight {
  if (totalParticipants <= 0) {
    return "none";
  }

  if (cell.yes === totalParticipants) {
    return "all";
  }

  if (totalParticipants >= 2 && cell.yes === totalParticipants - 1) {
    return "almost";
  }

  return "none";
}
