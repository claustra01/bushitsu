import { useEffect, useState } from "react";
import { readRecentPolls, type RecentPoll } from "../lib/recentPolls";

function formatAccessedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export default function HomePage() {
  const [recentPolls, setRecentPolls] = useState<RecentPoll[]>([]);

  useEffect(() => {
    setRecentPolls(readRecentPolls());
  }, []);

  return (
    <section className="page-section">
      <div className="intro">
        <p className="eyebrow">HOME</p>
        <h1>みんなの空きコマ</h1>
        <p>
          みんなの空きコマを自動で集計！
        </p>
        <a className="button button-primary" href="/new">
          新規作成
        </a>
      </div>

      {recentPolls.length > 0 && (
        <section className="surface recent-section">
          <div className="section-heading">
            <h2>最近のアクセス</h2>
          </div>
          <div className="recent-list">
            {recentPolls.map((poll) => (
              <RecentPollLink poll={poll} key={poll.slug} />
            ))}
          </div>
        </section>
      )}
    </section>
  );
}

function RecentPollLink({ poll }: { poll: RecentPoll }) {
  const accessedAt = formatAccessedAt(poll.lastAccessedAt);

  return (
    <a className="recent-item" href={`/p/${poll.slug}`}>
      <span className="recent-title">{poll.title}</span>
      <span className="recent-meta">
        {poll.isClosed ? "締め切り済み" : "受付中"}
        {accessedAt && `・${accessedAt}`}
      </span>
    </a>
  );
}
