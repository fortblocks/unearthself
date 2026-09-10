import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FieldCopy } from "@/components/quest/QuestShell";
import { RequireGuest } from "@/components/quest/gates";
import { beatSearch } from "@/lib/quest/search";
import { isUnlocked, useQuest } from "@/lib/quest/store";

export const Route = createFileRoute("/quest/shuttle")({
  validateSearch: beatSearch,
  component: () => (
    <RequireGuest>
      <ShuttleScreen />
    </RequireGuest>
  ),
});

function ShuttleScreen() {
  const pack = useQuest((s) => s.pack);
  const progress = useQuest((s) => s.progress);
  const setShuttle = useQuest((s) => s.setShuttle);
  const activateRune = useQuest((s) => s.activateRune);
  const completeBeat = useQuest((s) => s.completeBeat);
  const beat = pack.beats.find((b) => b.id === "shuttle");
  const open = beat ? isUnlocked(progress, beat.id) : false;
  const [moment, setMoment] = useState(progress.shuttle?.moment ?? "");
  const [happened, setHappened] = useState(progress.shuttle?.happened ?? "");
  const [when, setWhen] = useState(progress.shuttle?.when ?? "");
  const [remember, setRemember] = useState(progress.shuttle?.remember ?? "");

  if (!open || !beat) {
    return (
      <>
        <p className="quest-kicker">G11 · Shuttle</p>
        <h1 className="quest-title">Not yet</h1>
        <p className="quest-muted">Digital activation happens after the physical ritual. Phones away in the circle.</p>
      </>
    );
  }

  const adapt = pack.runes.find((r) => r.id === "adaptability");
  const play = pack.runes.find((r) => r.id === "play");

  return (
    <>
      <p className="quest-kicker">G11 · Field record</p>
      <h1 className="quest-title">Rune unearthed</h1>
      {adapt && progress.revealedRuneIds.includes("adaptability") && (
        <p className="quest-echo">
          {adapt.name}. {adapt.principle}
          <br />
          Carried: {play?.name} · {adapt.name}
        </p>
      )}
      <FieldCopy field={beat.field} simply={beat.simply} />
      <label className="quest-label">
        One moment you recognised an automatic response
        <textarea className="quest-area" value={moment} onChange={(e) => setMoment(e.target.value)} />
      </label>
      <p className="quest-muted">What happened when you attempted to make another response available?</p>
      <div className="quest-stack">
        {[
          ["changed", "Something changed in how I participated."],
          ["choice", "I created a small amount of additional choice."],
          ["noticed", "I noticed the automatic response but could not yet change it."],
          ["unclear", "I did not clearly recognise it in the moment."],
          ["else", "Something else."],
        ].map(([id, label]) => (
          <label key={id} className="quest-choice">
            <input type="radio" name="hap" checked={happened === id} onChange={() => setHappened(id)} />
            <span>{label}</span>
          </label>
        ))}
      </div>
      <label className="quest-label" style={{ marginTop: "1rem" }}>
        When I notice
        <input className="quest-input" value={when} onChange={(e) => setWhen(e.target.value)} />
      </label>
      <label className="quest-label">
        I want to remember
        <input className="quest-input" value={remember} onChange={(e) => setRemember(e.target.value)} />
      </label>
      <div className="quest-btn-row">
        <button
          type="button"
          className="quest-btn"
          onClick={() => {
            setShuttle({ moment, happened, when, remember });
            activateRune("adaptability");
            completeBeat(beat.id);
          }}
        >
          Save and lock
        </button>
      </div>
    </>
  );
}
