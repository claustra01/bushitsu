import { useEffect, useMemo, useState } from "react";
import AdminPage from "./routes/AdminPage";
import EditResponsePage from "./routes/EditResponsePage";
import HomePage from "./routes/HomePage";
import NewPollPage from "./routes/NewPollPage";
import PollPage from "./routes/PollPage";

type Route =
  | { name: "home" }
  | { name: "new" }
  | { name: "poll"; slug: string }
  | { name: "admin"; slug: string; token: string }
  | { name: "edit"; slug: string; responseId: string }
  | { name: "notFound" };

function parseRoute(location: Location): Route {
  const segments = location.pathname.split("/").filter(Boolean).map(decodeURIComponent);
  const token = new URLSearchParams(location.search).get("token") ?? "";

  if (segments.length === 0) {
    return { name: "home" };
  }

  if (segments.length === 1 && segments[0] === "new") {
    return { name: "new" };
  }

  if (segments[0] === "p" && segments.length === 2) {
    return { name: "poll", slug: segments[1] };
  }

  if (segments[0] === "p" && segments.length === 3 && segments[2] === "admin") {
    return { name: "admin", slug: segments[1], token };
  }

  if (segments[0] === "p" && segments.length === 4 && segments[2] === "edit") {
    return { name: "edit", slug: segments[1], responseId: segments[3] };
  }

  return { name: "notFound" };
}

export function navigate(path: string): void {
  window.history.pushState(null, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export default function App() {
  const [locationKey, setLocationKey] = useState(() => window.location.pathname + window.location.search);

  useEffect(() => {
    const handlePopState = () => setLocationKey(window.location.pathname + window.location.search);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const route = useMemo(() => parseRoute(window.location), [locationKey]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/">
          みんなの空きコマ
        </a>
        <nav className="topnav" aria-label="主要ナビゲーション">
          <a href="/">ホーム</a>
          <a href="/new">新規作成</a>
        </nav>
      </header>

      <main>
        {route.name === "home" && <HomePage />}
        {route.name === "new" && <NewPollPage />}
        {route.name === "poll" && <PollPage slug={route.slug} />}
        {route.name === "admin" && <AdminPage slug={route.slug} token={route.token} />}
        {route.name === "edit" && <EditResponsePage slug={route.slug} responseId={route.responseId} />}
        {route.name === "notFound" && (
          <section className="page-section">
            <h1>ページが見つかりません</h1>
            <p>URL を確認してください。</p>
            <a className="button button-primary" href="/">
              ホームへ
            </a>
          </section>
        )}
      </main>
    </div>
  );
}
