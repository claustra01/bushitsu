import { type AnswersMap, type PollConfig, type Status } from "../lib/schema";

type ScheduleGridProps = {
  config: PollConfig;
  answers: AnswersMap;
  onChange: (answers: AnswersMap) => void;
  disabled?: boolean;
  idPrefix: string;
};

const STATUS_OPTIONS: Status[] = ["yes", "maybe", "no"];

export default function ScheduleGrid({ config, answers, onChange, disabled = false, idPrefix }: ScheduleGridProps) {
  const slotByPosition = new Map(config.grid.slots.map((slot) => [`${slot.dayId}:${slot.periodId}`, slot]));

  const updateAnswer = (slotId: string, status: Status) => {
    const next = { ...answers };

    if (next[slotId] === status) {
      delete next[slotId];
    } else {
      next[slotId] = status;
    }

    onChange(next);
  };

  return (
    <div className="grid-scroll" role="region" aria-label="予定入力表" tabIndex={0}>
      <table className="schedule-table">
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
                  <td key={day.id}>
                    <div
                      className="status-buttons"
                      role="group"
                      aria-label={`${day.label} ${period.label}`}
                    >
                      {STATUS_OPTIONS.map((status) => {
                        const selected = answers[slot.id] === status;
                        return (
                          <button
                            key={status}
                            id={`${idPrefix}-${slot.id}-${status}`}
                            className={`status-button status-${status}${selected ? " is-selected" : ""}`}
                            type="button"
                            aria-pressed={selected}
                            aria-label={`${day.label} ${period.label} ${config.statusLabels[status]}`}
                            onClick={() => updateAnswer(slot.id, status)}
                            disabled={disabled}
                          >
                            {config.statusLabels[status]}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
