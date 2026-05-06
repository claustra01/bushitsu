import { UNANSWERED_LABEL, type PollConfig } from "../lib/schema";
import { getAvailabilityHighlight, type Summary } from "../lib/summary";

type SummaryGridProps = {
  config: PollConfig;
  summary: Summary;
};

export default function SummaryGrid({ config, summary }: SummaryGridProps) {
  const slotByPosition = new Map(config.grid.slots.map((slot) => [`${slot.dayId}:${slot.periodId}`, slot]));
  const getCell = (slotId: string) =>
    summary[slotId] ?? {
      yes: 0,
      maybe: 0,
      no: 0,
      unanswered: 0
    };

  const getHighlightClassName = (slotId: string) => {
    const cell = getCell(slotId);
    const totalParticipants = cell.yes + cell.maybe + cell.no + cell.unanswered;
    const highlight = getAvailabilityHighlight(cell, totalParticipants);
    return highlight !== "none" ? `summary-highlight summary-highlight-${highlight}` : "";
  };

  const renderHighlightBadge = (slotId: string) => {
    const cell = getCell(slotId);
    const totalParticipants = cell.yes + cell.maybe + cell.no + cell.unanswered;
    const highlight = getAvailabilityHighlight(cell, totalParticipants);
    if (highlight === "all") {
      return <span className="summary-badge">全員OK</span>;
    }
    if (highlight === "almost") {
      return <span className="summary-badge">あと1人</span>;
    }
    return null;
  };

  const renderCounts = (slotId: string) => {
    const cell = getCell(slotId);
    return (
      <>
        <span>{config.statusLabels.yes} {cell.yes}</span>
        <span>{config.statusLabels.maybe} {cell.maybe}</span>
        <span>{config.statusLabels.no} {cell.no}</span>
        <span>{UNANSWERED_LABEL} {cell.unanswered}</span>
      </>
    );
  };

  return (
    <>
      <div className="grid-scroll summary-grid-desktop" role="region" aria-label="集計表" tabIndex={0}>
        <table className="summary-table">
          <thead>
            <tr>
              <th scope="col">時限</th>
              {config.grid.days.map((day) => (
                <th scope="col" key={day.id}>
                  {day.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {config.grid.periods.map((period) => (
              <tr key={period.id}>
                <th scope="row">{period.label}</th>
                {config.grid.days.map((day) => {
                  const slot = slotByPosition.get(`${day.id}:${period.id}`);
                  if (!slot || !slot.enabled) {
                    return (
                      <td key={day.id} className="disabled-cell">
                        対象外
                      </td>
                    );
                  }

                  return (
                    <td key={day.id} className={getHighlightClassName(slot.id) || undefined}>
                      <div className="summary-cell" aria-label={`${day.label} ${period.label} の集計`}>
                        {renderHighlightBadge(slot.id)}
                        {renderCounts(slot.id)}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="summary-mobile-list" aria-label="集計リスト">
        {config.grid.days.map((day) => (
          <section className="summary-mobile-day" key={day.id}>
            <h3>{day.label}</h3>
            <div className="summary-mobile-slots">
              {config.grid.periods.map((period) => {
                const slot = slotByPosition.get(`${day.id}:${period.id}`);
                if (!slot || !slot.enabled) {
                  return null;
                }

                return (
                  <div className={`summary-mobile-slot ${getHighlightClassName(slot.id)}`} key={period.id}>
                    <div className="summary-mobile-slot-head">
                      <span className="summary-mobile-period">{period.label}</span>
                      {renderHighlightBadge(slot.id)}
                    </div>
                    <div className="summary-mobile-counts">{renderCounts(slot.id)}</div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
