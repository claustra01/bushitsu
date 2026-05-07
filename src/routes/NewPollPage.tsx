import { FormEvent, useState } from "react";
import { ApiClientError, createPoll, type CreatePollPayload } from "../lib/api";
import { saveRecentPoll } from "../lib/recentPolls";
import { addDaysToIsoDate } from "../lib/schema";

function localDateInputValue(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }
  return "通信に失敗しました";
}

export default function NewPollPage() {
  const today = localDateInputValue();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(() => addDaysToIsoDate(today, 6));
  const maxEndDate = startDate ? addDaysToIsoDate(startDate, 13) : "";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CreatePollPayload | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const created = await createPoll({ title, description, startDate, endDate });
      saveRecentPoll(created.poll);
      setResult(created);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="page-section">
      <div className="section-heading">
        <p className="eyebrow">NEW</p>
        <h1>新規作成</h1>
      </div>

      <form className="surface form-stack" onSubmit={handleSubmit}>
        <div className="form-row">
          <label htmlFor="poll-title">タイトル</label>
          <input
            id="poll-title"
            value={title}
            onChange={(event) => setTitle(event.currentTarget.value)}
            maxLength={100}
            required
            disabled={busy}
          />
        </div>

        <div className="form-grid">
          <div className="form-row">
            <label htmlFor="poll-start-date">開始日</label>
            <input
              id="poll-start-date"
              type="date"
              value={startDate}
              onChange={(event) => {
                const nextStartDate = event.currentTarget.value;
                setStartDate(nextStartDate);
                if (!nextStartDate) {
                  return;
                }
                const nextMaxEndDate = addDaysToIsoDate(nextStartDate, 13);
                if (endDate < nextStartDate) {
                  setEndDate(nextStartDate);
                } else if (endDate > nextMaxEndDate) {
                  setEndDate(nextMaxEndDate);
                }
              }}
              required
              disabled={busy}
            />
          </div>

          <div className="form-row">
            <label htmlFor="poll-end-date">終了日</label>
            <input
              id="poll-end-date"
              type="date"
              value={endDate}
              min={startDate}
              max={maxEndDate}
              onChange={(event) => setEndDate(event.currentTarget.value)}
              required
              disabled={busy}
            />
          </div>
        </div>

        <div className="form-row">
          <label htmlFor="poll-description">説明</label>
          <textarea
            id="poll-description"
            value={description}
            onChange={(event) => setDescription(event.currentTarget.value)}
            maxLength={1000}
            rows={5}
            disabled={busy}
          />
        </div>

        {error && <p className="message message-error">{error}</p>}

        <div className="actions">
          <button className="button button-primary" type="submit" disabled={busy}>
            {busy ? "作成中..." : "作成する"}
          </button>
        </div>
      </form>

      {result && (
        <section className="surface result-panel" aria-live="polite">
          <h2>作成しました</h2>
          <dl className="link-list">
            <div>
              <dt>公開 URL</dt>
              <dd>
                <a href={result.publicPath}>{result.publicPath}</a>
              </dd>
            </div>
            <div>
              <dt>管理 URL</dt>
              <dd>
                <a href={result.adminPath}>{result.adminPath}</a>
              </dd>
            </div>
          </dl>
        </section>
      )}
    </section>
  );
}
