import { FormEvent, useEffect, useState } from "react";
import type { AnswersMap, PollConfig } from "../lib/schema";
import ScheduleGrid from "./ScheduleGrid";

export type ResponseFormValues = {
  name: string;
  comment: string;
  answers: AnswersMap;
};

type ResponseFormProps = {
  config: PollConfig;
  initialValues?: ResponseFormValues;
  submitLabel: string;
  idPrefix: string;
  disabled?: boolean;
  busy?: boolean;
  onSubmit: (values: ResponseFormValues) => Promise<void>;
};

const EMPTY_VALUES: ResponseFormValues = {
  name: "",
  comment: "",
  answers: {}
};

export default function ResponseForm({
  config,
  initialValues = EMPTY_VALUES,
  submitLabel,
  idPrefix,
  disabled = false,
  busy = false,
  onSubmit
}: ResponseFormProps) {
  const [name, setName] = useState(initialValues.name);
  const [comment, setComment] = useState(initialValues.comment);
  const [answers, setAnswers] = useState<AnswersMap>(initialValues.answers);

  useEffect(() => {
    setName(initialValues.name);
    setComment(initialValues.comment);
    setAnswers(initialValues.answers);
  }, [initialValues]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await onSubmit({ name, comment, answers });
  };

  return (
    <form className="form-stack" onSubmit={handleSubmit}>
      <div className="form-row">
        <label htmlFor={`${idPrefix}-name`}>名前</label>
        <input
          id={`${idPrefix}-name`}
          value={name}
          onChange={(event) => setName(event.currentTarget.value)}
          maxLength={50}
          required
          disabled={disabled || busy}
        />
      </div>

      <div className="form-row">
        <label htmlFor={`${idPrefix}-comment`}>コメント</label>
        <textarea
          id={`${idPrefix}-comment`}
          value={comment}
          onChange={(event) => setComment(event.currentTarget.value)}
          maxLength={500}
          rows={3}
          disabled={disabled || busy}
        />
      </div>

      <ScheduleGrid
        config={config}
        answers={answers}
        onChange={setAnswers}
        disabled={disabled || busy}
        idPrefix={`${idPrefix}-slot`}
      />

      <div className="actions">
        <button className="button button-primary" type="submit" disabled={disabled || busy}>
          {busy ? "送信中" : submitLabel}
        </button>
      </div>
    </form>
  );
}
