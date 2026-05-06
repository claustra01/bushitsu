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
        <p className="eyebrow">少人数向けの予定調整</p>
        <h1>日付範囲を選んで、授業時間と夜間の都合を集めます。</h1>
        <p>
          アカウントなしで予定表を作成し、公開 URL を共有できます。回答は参加者ごとにまとめて保存されます。
        </p>
        <a className="button button-primary" href="/new">
          予定調整を作成
        </a>
      </div>

      {recentPolls.length > 0 && (
        <section className="surface recent-section">
          <div className="section-heading">
            <h2>最近アクセスした調整ページ</h2>
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
