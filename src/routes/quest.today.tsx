import { createFileRoute, Link } from "@tanstack/react-router";
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
  const [token, setToken] = useState("");
  const [tokenMsg, setTokenMsg] = useState("");
  const days = pack.days.filter((d) => !d.stub);

  return (
    <>
      <p className="quest-kicker">G02 · Today</p>
      <h1 className="quest-title">Sequence</h1>
      <p className="quest-muted">What is open, what is locked. Language for a Rune comes after the encounter.</p>
      {days.map((day) => (
        <section key={day.id} style={{ marginTop: "1.5rem" }}>
          <p className="quest-kicker">{day.label}</p>
          <p className="quest-muted">{day.setting}</p>
          {pack.beats
            .filter((b) => b.dayId === day.id)
            .map((beat) => {
              const open = isUnlocked(progress, beat.id);
              const done = progress.completedBeatIds.includes(beat.id);
              return (
                <Link
                  key={beat.id}
                  to={beatPath(beat.screen)}
                  search={{ beat: beat.id }}
                  className={`quest-beat ${open ? "" : "is-lock"}`}
                >
                  <span>{beat.title}</span>
                  <small>{done ? "Done" : open ? "Open" : "Locked"}</small>
                </Link>
              );
            })}
        </section>
      ))}
      <form
        className="quest-stack"
        style={{ marginTop: "1.75rem" }}
        onSubmit={(e) => {
          e.preventDefault();
          const res = unlockWithToken(token);
          setTokenMsg(res.ok ? "Opened." : "Not a token in this pack.");
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
      {pack.days.some((d) => d.stub) && (
        <p className="quest-muted" style={{ marginTop: "1.75rem" }}>
          Later days are in the pack as stubs. Town partners and the final route are not invented here.
        </p>
      )}
    </>
  );
}
