import { useCallback, useEffect, useState } from "react";
import ResponseForm, { type ResponseFormValues } from "../components/ResponseForm";
import ResponseList from "../components/ResponseList";
import SummaryGrid from "../components/SummaryGrid";
import { ApiClientError, createResponse, getPoll, type PollReadPayload } from "../lib/api";
import { saveRecentPoll } from "../lib/recentPolls";

type PollPageProps = {
  slug: string;
};

type ActiveTab = "summary" | "response";

function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }
  return "通信に失敗しました";
}

export default function PollPage({ slug }: PollPageProps) {
  const initialTab = new URLSearchParams(window.location.search).get("tab") === "summary" ? "summary" : "response";
  const [payload, setPayload] = useState<PollReadPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [formKey, setFormKey] = useState(0);
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab);

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

  useEffect(() => {
    if (payload?.poll.isClosed) {
      setActiveTab("summary");
    }
  }, [payload?.poll.isClosed]);

  const handleSubmit = async (values: ResponseFormValues) => {
    setSubmitting(true);
    setError("");
    setNotice("");

    try {
      await createResponse(slug, values);
      setNotice("回答を保存しました。");
      setFormKey((current) => current + 1);
      await loadPoll();
      setActiveTab("summary");
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && payload === null) {
    return (
      <section className="page-section">
        <p className="muted">読み込み中...</p>
      </section>
    );
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
          <p className="eyebrow">公開ページ</p>
          <h1>{payload.poll.title}</h1>
          {payload.poll.description && <p>{payload.poll.description}</p>}
        </div>
        <span className={`state-badge ${payload.poll.isClosed ? "state-closed" : "state-open"}`}>
          {payload.poll.isClosed ? "締め切り済み" : "受付中"}
        </span>
      </div>

      {notice && <p className="message message-success">{notice}</p>}
      {error && <p className="message message-error">{error}</p>}

      <div className="tabs" role="tablist" aria-label="公開ページの表示切り替え">
        <button
          className={`tab-button${activeTab === "summary" ? " is-active" : ""}`}
          type="button"
          role="tab"
          aria-selected={activeTab === "summary"}
          aria-controls="summary-tab-panel"
          id="summary-tab"
          onClick={() => setActiveTab("summary")}
        >
          集計・回答一覧
        </button>
        <button
          className={`tab-button${activeTab === "response" ? " is-active" : ""}`}
          type="button"
          role="tab"
          aria-selected={activeTab === "response"}
          aria-controls="response-tab-panel"
          id="response-tab"
          onClick={() => setActiveTab("response")}
          disabled={payload.poll.isClosed}
        >
          回答する
        </button>
      </div>

      {activeTab === "summary" && (
        <section
          className="surface tab-panel"
          id="summary-tab-panel"
          role="tabpanel"
          aria-labelledby="summary-tab"
        >
          <div className="section-heading">
            <h2>集計</h2>
          </div>
          <SummaryGrid config={payload.config} summary={payload.summary} />

          <div className="section-heading section-heading-nested">
            <h2>回答一覧</h2>
          </div>
          <ResponseList slug={slug} config={payload.config} responses={payload.responses} />
        </section>
      )}

      {activeTab === "response" && (
        <section
          className="surface tab-panel"
          id="response-tab-panel"
          role="tabpanel"
          aria-labelledby="response-tab"
        >
          <div className="section-heading">
            <h2>回答する</h2>
          </div>
          {payload.poll.isClosed ? (
            <p className="message message-warning">この予定調整は締め切られています。</p>
          ) : (
            <ResponseForm
              key={formKey}
              config={payload.config}
              submitLabel="回答を保存"
              idPrefix="new-response"
              busy={submitting}
              onSubmit={handleSubmit}
            />
          )}
        </section>
      )}
    </section>
  );
}
