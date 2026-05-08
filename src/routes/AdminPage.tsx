import { useCallback, useEffect, useState } from "react";
import { navigate } from "../App";
import LoadingSpinner from "../components/LoadingSpinner";
import { ApiClientError, closePoll, deletePoll, getPoll, type PollReadPayload } from "../lib/api";
import { removeRecentPoll, saveRecentPoll } from "../lib/recentPolls";

type AdminPageProps = {
  slug: string;
  token: string;
};

function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }
  return "通信に失敗しました";
}

export default function AdminPage({ slug, token }: AdminPageProps) {
  const [payload, setPayload] = useState<PollReadPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

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

  const handleToggle = async () => {
    if (!payload) {
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const next = await closePoll(slug, token, !payload.poll.isClosed);
      setPayload({
        ...payload,
        poll: {
          ...payload.poll,
          isClosed: next.poll.isClosed,
          updatedAt: next.poll.updatedAt
        }
      });
      setNotice(next.poll.isClosed ? "回答受付を締め切りました。" : "回答受付を再開しました。");
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!payload || !window.confirm("この予定調整を削除します。回答もすべて削除されます。")) {
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");

    try {
      await deletePoll(slug, token);
      removeRecentPoll(slug);
      navigate("/");
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
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

  return (
    <section className="page-section">
      <div className="section-heading split-heading">
        <div>
          <p className="eyebrow">MODERATION</p>
          <h1>{payload?.poll.title ?? "読み込み中..."}</h1>
        </div>
        {payload && (
          <span className={`state-badge ${payload.poll.isClosed ? "state-closed" : "state-open"}`}>
            {payload.poll.isClosed ? "締切済み" : "受付中"}
          </span>
        )}
      </div>

      {!token && <p className="message message-error">管理トークンが URL に含まれていません。</p>}
      {notice && <p className="message message-success">{notice}</p>}
      {error && <p className="message message-error">{error}</p>}

      {payload && (
        <section className="surface form-stack">
          <dl className="link-list">
            <div>
              <dt>公開ページ</dt>
              <dd>
                <a href={`/p/${slug}`}>{`/p/${slug}`}</a>
              </dd>
            </div>
            <div>
              <dt>最終更新</dt>
              <dd>{payload.poll.updatedAt ?? ""}</dd>
            </div>
          </dl>

          <div className="actions">
            <button className="button button-primary" type="button" onClick={handleToggle} disabled={busy || !token}>
              {payload.poll.isClosed ? "受付再開" : "受付締切"}
            </button>
            <button className="button button-danger" type="button" onClick={handleDelete} disabled={busy || !token}>
              予定を削除
            </button>
          </div>
        </section>
      )}
    </section>
  );
}
