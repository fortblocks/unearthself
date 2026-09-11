import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { RequireGuest } from "@/components/quest/gates";
import { beatPath, isUnlocked, useQuest } from "@/lib/quest/store";

export const Route = createFileRoute("/quest/today")({
  component: () => (
    <RequireGuest>
      <TodayScreen />
    </RequireGuest>
  ),
});

function TodayScreen() {
  const pack = useQuest((s) => s.pack);
  const progress = useQuest((s) => s.progress);
  const unlockWithToken = useQuest((s) => s.unlockWithToken);
  const navigate = useNavigate();
  const [token, setToken] = useState("");
  const [tokenMsg, setTokenMsg] = useState("");
  const days = pack.days.filter((d) => !d.stub);
  const open = pack.beats.find((b) => isUnlocked(progress, b.id) && !progress.completedBeatIds.includes(b.id));

  return (
    <>
      <p className="quest-kicker">Today · shell 11c</p>
      <h1 className="quest-title">Now</h1>
      {open ? (
        <button
          type="button"
          className="quest-now"
          onClick={() => void navigate({ to: beatPath(open.screen), search: { beat: open.id } })}
        >
          <span className="quest-chip">Open</span>
          <strong>{open.title}</strong>
          <em>{open.simply}</em>
        </button>
      ) : (
        <p className="quest-muted">Nothing open. Token below, or wait for the facilitator.</p>
      )}
      {days.map((day) => {
        const beats = pack.beats.filter((b) => b.dayId === day.id);
        return (
          <section key={day.id} className="quest-chapter">
            <p className="quest-kicker">{day.label}</p>
            <p className="quest-muted">{day.setting}</p>
            <ol className="quest-later">
              {beats.map((b) => {
                const done = progress.completedBeatIds.includes(b.id);
                const isOpen = isUnlocked(progress, b.id);
                return (
                  <li key={b.id} className={done ? "is-done" : isOpen ? "is-open" : undefined}>
                    {b.title}
                    <span>{done ? "Done" : isOpen ? "Now" : ""}</span>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
      <form
        className="quest-stack"
        style={{ marginTop: "1.5rem" }}
        onSubmit={(e) => {
          e.preventDefault();
          setTokenMsg(unlockWithToken(token).ok ? "Opened." : "Not a token in this pack.");
          setToken("");
        }}
      >
        <label className="quest-label">
          Paper token
          <input className="quest-input" value={token} onChange={(e) => setToken(e.target.value)} placeholder="WEL1" />
        </label>
        <button type="submit" className="quest-btn quest-btn-ghost">
          Unlock from paper
        </button>
        {tokenMsg && <p className="quest-muted">{tokenMsg}</p>}
      </form>
    </>
  );
}
