import { useCallback, useEffect, useState } from "react";
import LoadingSpinner from "../components/LoadingSpinner";
import ResponseList from "../components/ResponseList";
import SummaryGrid from "../components/SummaryGrid";
import { ApiClientError, getPoll, type PollReadPayload } from "../lib/api";
import { saveRecentPoll } from "../lib/recentPolls";

type PollPageProps = {
  slug: string;
};

function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }
  return "通信に失敗しました";
}

export default function PollPage({ slug }: PollPageProps) {
  const [payload, setPayload] = useState<PollReadPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPoll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const next = await getPoll(slug);
      setPayload(next);
      saveRecentPoll(next.poll);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void loadPoll();
  }, [loadPoll]);

  if (loading && payload === null) {
    return <LoadingSpinner />;
  }

  if (error && payload === null) {
    return (
      <section className="page-section">
        <p className="message message-error">{error}</p>
      </section>
    );
  }

  if (payload === null) {
    return null;
  }

  return (
    <section className="page-section">
      <div className="section-heading split-heading">
        <div>
          <p className="eyebrow">CALENDAR</p>
          <h1>{payload.poll.title}</h1>
          {payload.poll.description && <p>{payload.poll.description}</p>}
        </div>
        <span className={`state-badge ${payload.poll.isClosed ? "state-closed" : "state-open"}`}>
          {payload.poll.isClosed ? "締切済み" : "受付中"}
        </span>
      </div>

      {error && <p className="message message-error">{error}</p>}

      <section className="surface">
        <div className="section-heading">
          <h2>集計</h2>
        </div>
        <SummaryGrid config={payload.config} summary={payload.summary} />
        {!payload.poll.isClosed && (
          <div className="actions summary-actions">
            <a className="button button-primary" href={`/p/${slug}/poll`}>
              回答する
            </a>
          </div>
        )}

        <div className="section-heading section-heading-nested">
          <h2>回答一覧</h2>
        </div>
        <ResponseList slug={slug} config={payload.config} responses={payload.responses} />
      </section>
    </section>
  );
}
