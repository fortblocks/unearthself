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

  return (
    <>
      <p className="quest-kicker">Today · shell 11b</p>
      <h1 className="quest-title">Sequence</h1>
      <p className="quest-muted">Stations are buttons. Locked stays put.</p>
      {days.map((day) => (
        <section key={day.id} style={{ marginTop: "1.35rem" }}>
          <p className="quest-kicker">{day.label}</p>
          <p className="quest-muted">{day.setting}</p>
          <div className="quest-stack">
            {pack.beats
              .filter((b) => b.dayId === day.id)
              .map((beat) => {
                const open = isUnlocked(progress, beat.id);
                const done = progress.completedBeatIds.includes(beat.id);
                return (
                  <button
                    key={beat.id}
                    type="button"
                    className={open ? "quest-station" : "quest-station is-lock"}
                    disabled={!open}
                    onClick={() => void navigate({ to: beatPath(beat.screen), search: { beat: beat.id } })}
                  >
                    <span>{beat.title}</span>
                    <small>{done ? "Done" : open ? "Open" : "Locked"}</small>
                  </button>
                );
              })}
          </div>
        </section>
      ))}
      <form
        className="quest-stack"
        style={{ marginTop: "1.5rem" }}
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
    </>
  );
}
