import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { RequireGuest } from "@/components/quest/gates";
import { buildHandoff, useQuest } from "@/lib/quest/store";

export const Route = createFileRoute("/quest/handoff")({
  component: () => (
    <RequireGuest>
      <HandoffScreen />
    </RequireGuest>
  ),
});

function HandoffScreen() {
  const progress = useQuest((s) => s.progress);
  const releaseNotes = useQuest((s) => s.releaseNotes);
  const started = progress.questStartedAt;
  const elapsed = started ? Math.round((Date.now() - started) / 60000) : 0;
  const [blob, setBlob] = useState("");

  return (
    <>
      <p className="quest-kicker">End · Basecamp</p>
      <h1 className="quest-title">Handoff</h1>
      <p className="quest-muted">
        Performance always goes to the hall. Introspection stays here unless you release it.
      </p>
      <ul className="quest-privacy">
        <li>{elapsed} min on the clock</li>
        <li>{progress.enteredZoneIds?.length ?? 0} zones</li>
        <li>{progress.specimensFound.length} bones</li>
        <li>Mirror {Object.keys(progress.mirror).length ? "done" : "not yet"}</li>
      </ul>
      <div className="quest-btn-row">
        {!progress.notesReleased && (
          <button type="button" className="quest-btn quest-btn-ghost" onClick={() => releaseNotes()}>
            Release my notes to Basecamp
          </button>
        )}
        <button type="button" className="quest-btn" onClick={() => void buildHandoff().then((h) => setBlob(JSON.stringify(h, null, 2)))}>
          Build handoff
        </button>
      </div>
      {blob && (
        <pre className="quest-echo" style={{ fontFamily: "ui-monospace, monospace", fontSize: "0.72rem", overflow: "auto" }}>
          {blob}
        </pre>
      )}
    </>
  );
}
