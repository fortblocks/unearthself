import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FieldCopy } from "@/components/quest/QuestShell";
import { RequireGuest } from "@/components/quest/gates";
import { beatSearch } from "@/lib/quest/search";
import { isUnlocked, useQuest } from "@/lib/quest/store";

export const Route = createFileRoute("/quest/thirty")({
  validateSearch: beatSearch,
  component: () => (
    <RequireGuest>
      <ThirtyScreen />
    </RequireGuest>
  ),
});

function ThirtyScreen() {
  const pack = useQuest((s) => s.pack);
  const progress = useQuest((s) => s.progress);
  const setThirty = useQuest((s) => s.setThirty);
  const completeBeat = useQuest((s) => s.completeBeat);
  const beat = pack.beats.find((b) => b.id === "thirty");
  const open = beat ? isUnlocked(progress, beat.id) : false;
  const [used, setUsed] = useState(progress.thirty?.used ?? "");
  const [note, setNote] = useState(progress.thirty?.note ?? "");

  if (!open || !beat) {
    return (
      <>
        <p className="quest-kicker">G12 · Thirty days</p>
        <h1 className="quest-title">Later</h1>
        <p className="quest-muted">A light check after the expedition. Not a course. Not a feed.</p>
      </>
    );
  }

  return (
    <>
      <p className="quest-kicker">G12 · Thirty days</p>
      <h1 className="quest-title">Did it show up?</h1>
      <FieldCopy field={beat.field} simply={beat.simply} />
      <div className="quest-stack">
        {[
          ["yes", "Yes — I used the chosen response."],
          ["noticed", "I noticed the old one. I did not yet change it."],
          ["no", "It did not come up."],
        ].map(([id, label]) => (
          <label key={id} className="quest-choice">
            <input type="radio" name="used" checked={used === id} onChange={() => setUsed(id)} />
            <span>{label}</span>
          </label>
        ))}
      </div>
      <label className="quest-label" style={{ marginTop: "1rem" }}>
        Optional
        <textarea className="quest-area" value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <div className="quest-btn-row">
        <button
          type="button"
          className="quest-btn"
          onClick={() => {
            setThirty({ used, note });
            completeBeat(beat.id);
          }}
        >
          Save on this device
        </button>
      </div>
    </>
  );
}
