import { useCallback, useEffect, useMemo, useState } from "react";
import ResponseForm, { type ResponseFormValues } from "../components/ResponseForm";
import { navigate } from "../App";
import {
  ApiClientError,
  deleteResponse,
  getPoll,
  updateResponse,
  type PollReadPayload
} from "../lib/api";
import { saveRecentPoll } from "../lib/recentPolls";
import type { ResponseDto } from "../lib/schema";

type EditResponsePageProps = {
  slug: string;
  responseId: string;
};

function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }
  return "通信に失敗しました";
}

export default function EditResponsePage({ slug, responseId }: EditResponsePageProps) {
  const [payload, setPayload] = useState<PollReadPayload | null>(null);
  const [response, setResponse] = useState<ResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadPoll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const next = await getPoll(slug);
      setPayload(next);
      setResponse(next.responses.find((item) => item.id === responseId) ?? null);
      saveRecentPoll(next.poll);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [responseId, slug]);

  useEffect(() => {
    void loadPoll();
  }, [loadPoll]);

  const initialValues = useMemo(
    () =>
      response
        ? {
            name: response.name,
            comment: response.comment ?? "",
            answers: response.answers
          }
        : undefined,
    [response]
  );

  const handleSubmit = async (values: ResponseFormValues) => {
    if (!response) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      await updateResponse(slug, responseId, {
        ...values,
        version: response.version
      });
      navigate(`/p/${slug}?tab=summary`);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    setError("");

    try {
      await deleteResponse(slug, responseId);
      navigate(`/p/${slug}`);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <section className="page-section">
        <p className="muted">読み込み中...</p>
      </section>
    );
  }

  if (error && !payload) {
    return (
      <section className="page-section">
        <p className="message message-error">{error}</p>
      </section>
    );
  }

  if (!payload || !response || !initialValues) {
    return (
      <section className="page-section">
        <p className="message message-error">指定された回答は見つかりません。</p>
        <a className="button button-secondary" href={`/p/${slug}`}>
          公開ページへ
        </a>
      </section>
    );
  }

  return (
    <section className="page-section">
      <div className="section-heading split-heading">
        <div>
          <p className="eyebrow">回答編集</p>
          <h1>{payload.poll.title}</h1>
        </div>
        <span className={`state-badge ${payload.poll.isClosed ? "state-closed" : "state-open"}`}>
          {payload.poll.isClosed ? "締め切り済み" : "受付中"}
        </span>
      </div>

      {error && <p className="message message-error">{error}</p>}

      <section className="surface">
        {payload.poll.isClosed ? (
          <p className="message message-warning">この予定調整は締め切られているため、回答を更新できません。</p>
        ) : (
          <ResponseForm
            config={payload.config}
            initialValues={initialValues}
            submitLabel="回答を更新"
            idPrefix="edit-response"
            busy={busy}
            onSubmit={handleSubmit}
          />
        )}
      </section>

      <div className="actions">
        <button className="button button-danger" type="button" onClick={handleDelete} disabled={busy}>
          回答を削除
        </button>
        <a className="button button-secondary" href={`/p/${slug}`}>
          公開ページへ
        </a>
      </div>
    </section>
  );
}
