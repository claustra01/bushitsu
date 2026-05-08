import { useCallback, useEffect, useState } from "react";
import { navigate } from "../App";
import LoadingSpinner from "../components/LoadingSpinner";
import ResponseForm, { type ResponseFormValues } from "../components/ResponseForm";
import { ApiClientError, createResponse, getPoll, type PollReadPayload } from "../lib/api";
import { saveRecentPoll } from "../lib/recentPolls";

type ResponsePageProps = {
  slug: string;
};

function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }
  return "通信に失敗しました";
}

export default function ResponsePage({ slug }: ResponsePageProps) {
  const [payload, setPayload] = useState<PollReadPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
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

  const handleSubmit = async (values: ResponseFormValues) => {
    setSubmitting(true);
    setError("");

    try {
      await createResponse(slug, values);
      navigate(`/p/${slug}`);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  };

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
          <p className="eyebrow">POLL</p>
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
          <h2>回答する</h2>
        </div>
        {payload.poll.isClosed ? (
          <p className="message message-warning">この予定は締め切られています。</p>
        ) : (
          <ResponseForm
            config={payload.config}
            submitLabel="保存"
            idPrefix="new-response"
            busy={submitting}
            onSubmit={handleSubmit}
          />
        )}
      </section>

      <div className="actions">
        <a className="button button-secondary" href={`/p/${slug}`}>
          戻る
        </a>
      </div>
    </section>
  );
}
