"use client";

import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { registerQuestWorker } from "@/lib/quest/pwa";
import { useQuest } from "@/lib/quest/store";

const guestNav = [
  { to: "/quest/today", label: "Today" },
  { to: "/quest/play", label: "Field" },
  { to: "/quest/recorder", label: "Watch" },
  { to: "/quest/mirror", label: "Mirror" },
  { to: "/quest/runes", label: "Runes" },
];

const adminNav = [
  { to: "/quest/admin", label: "Instance" },
  { to: "/quest/admin/roster", label: "Roster" },
  { to: "/quest/admin/live", label: "Live" },
  { to: "/quest/admin/broadcast", label: "Call" },
  { to: "/quest/admin/safety", label: "Safety" },
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
        <Link to={admin ? "/quest/admin" : "/quest"} className="quest-mark">
          Trail Quest
        </Link>
        <p className="quest-who">
          {session.role === "facilitator"
            ? session.firstName || "Facilitator"
            : session.firstName || "Not joined"}
        </p>
      </header>

      {!online && (
        <p className="quest-banner" role="status">
          Offline. The pack is on this device.
        </p>
      )}
      {online && ready && (
        <p className="quest-banner quest-banner-quiet" role="status">
          Pack is local. Nothing leaves this phone.
        </p>
      )}
      {progress.broadcast && (
        <p className="quest-banner quest-banner-call" role="alert">
          {progress.broadcast}
        </p>
      )}
      {progress.lateTeam && (
        <p className="quest-banner quest-banner-call" role="status">
          Late-team procedure is in play. Safety outranks the ritual.
        </p>
      )}

      <main className="quest-main">{ready ? children : <p className="quest-loading">Loading pack…</p>}</main>

      {land && (
        <div className="quest-land" role="dialog">
          <p>If this fights the land, put the phone away.</p>
          <p className="quest-muted">The paper pack is the source of truth if two phones die.</p>
          <button type="button" className="quest-btn quest-btn-ghost" onClick={() => setLand(false)}>
            Back
          </button>
        </div>
      )}

      <nav className="quest-nav" aria-label="Trail Quest">
        {nav.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className={pathname === l.to || (l.to !== "/quest/admin" && pathname.startsWith(l.to) && l.to !== "/quest") ? "is-on" : undefined}
          >
            {l.label}
          </Link>
        ))}
        <button type="button" onClick={() => setLand(true)}>
          Land
        </button>
      </nav>
    </div>
  );
}

export function FieldCopy({ field, simply }: { field: string; simply: string }) {
  return (
    <div className="quest-copy">
      <p className="quest-field">{field}</p>
      <p className="quest-simply">
        <span>Simply:</span> {simply}
      </p>
    </div>
  );
}

export function TokenHint({ token }: { token: string }) {
  return (
    <p className="quest-token">
      Paper token <kbd>{token}</kbd>
    </p>
  );
}
