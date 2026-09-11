"use client";

import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { registerQuestWorker } from "@/lib/quest/pwa";
import { useQuest } from "@/lib/quest/store";

const guestNav = [
  { to: "/quest/today", label: "Today" },
  { to: "/quest/play", label: "Field" },
  { to: "/quest/map", label: "Map" },
  { to: "/quest/mirror", label: "Mirror" },
];

const adminNav = [
  { to: "/quest/admin", label: "Desk" },
  { to: "/quest/admin/trail", label: "Trail" },
  { to: "/quest/admin/live", label: "Live" },
  { to: "/quest/admin/paper", label: "Paper" },
];

export function QuestShell({ children, admin }: { children: ReactNode; admin?: boolean }) {
  const hydrate = useQuest((s) => s.hydrate);
  const ready = useQuest((s) => s.ready);
  const progress = useQuest((s) => s.progress);
  const session = useQuest((s) => s.session);
  const [online, setOnline] = useState(true);
  const [land, setLand] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    void hydrate();
    registerQuestWorker();
    const on = () => setOnline(navigator.onLine);
    on();
    window.addEventListener("online", on);
    window.addEventListener("offline", on);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", on);
    };
  }, [hydrate]);

  const nav = admin ? adminNav : guestNav;

  return (
    <div className="quest-app">
      <header className="quest-top">
        <Link to={admin ? "/quest/admin" : "/quest/today"} className="quest-mark">
          Trail Quest
        </Link>
        <button type="button" className="quest-land-btn" onClick={() => setLand(true)}>
          Land
        </button>
      </header>
      {session.firstName ? <p className="quest-who">{session.firstName}</p> : null}
      {!online && (
        <p className="quest-banner" role="status">
          Offline. Pack is on this phone.
        </p>
      )}
      {progress.broadcast && (
        <p className="quest-banner quest-banner-call" role="alert">
          {progress.broadcast}
        </p>
      )}
      <main className="quest-main">{ready ? children : <p className="quest-muted">Loading pack…</p>}</main>
      {land && (
        <div className="quest-land" role="dialog">
          <p>If this fights the land, put the phone away.</p>
          <button type="button" className="quest-btn quest-btn-ghost" onClick={() => setLand(false)}>
            Back
          </button>
        </div>
      )}
      <nav className="quest-nav" aria-label="Trail Quest">
        {nav.map((l) => (
          <Link key={l.to} to={l.to} className={pathname === l.to || pathname.startsWith(l.to + "/") ? "is-on" : undefined}>
            {l.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function FieldCopy({ field, simply }: { field: string; simply: string }) {
  return (
    <div className="quest-copy">
      <p className="quest-field">{field}</p>
      <p className="quest-simply">
        <span>Simply</span>
        {simply}
      </p>
    </div>
  );
}

export function TokenHint({ token }: { token: string }) {
  return (
    <p className="quest-token">
      Paper <kbd>{token}</kbd>
    </p>
  );
}
