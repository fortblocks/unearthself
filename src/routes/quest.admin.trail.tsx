import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { QuestMap } from "@/components/quest/QuestMap";
import { hapticPulse, readFieldFix, watchField } from "@/lib/quest/native";
import { useQuest } from "@/lib/quest/store";

export const Route = createFileRoute("/quest/admin/trail")({
  component: TrailWalkScreen,
});

function TrailWalkScreen() {
  const pack = useQuest((s) => s.pack);
  const recordingTrailId = useQuest((s) => s.recordingTrailId);
  const startTrailWalk = useQuest((s) => s.startTrailWalk);
  const appendTrailFix = useQuest((s) => s.appendTrailFix);
  const stopTrailWalk = useQuest((s) => s.stopTrailWalk);
  const addFence = useQuest((s) => s.addFence);
  const [label, setLabel] = useState("Horseshoe line");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!recordingTrailId) return;
    return watchField((fix) => {
      if (fix.ok && fix.lat !== null && fix.lng !== null) appendTrailFix(fix.lat, fix.lng);
    });
  }, [recordingTrailId, appendTrailFix]);

  const live = pack.trails?.find((t) => t.id === recordingTrailId);

  return (
    <>
      <p className="quest-kicker">A11 · Walk the line</p>
      <h1 className="quest-title">Record trail</h1>
      <p className="quest-muted">
        Walk it. The line is yours. Drop pins as you go. Guests see this line and a dot — not a route to a hidden bone.
      </p>
      <QuestMap fences={pack.geofences} trails={pack.trails ?? []} follow />
      {recordingTrailId ? (
        <>
          <p className="quest-field">{live ? `${live.label} · ${live.points.length} points` : "Recording"}</p>
          <div className="quest-btn-row">
            <button
              type="button"
              className="quest-btn"
              onClick={() => {
                void (async () => {
                  const fix = await readFieldFix();
                  if (!fix.ok || fix.lat === null || fix.lng === null) {
                    setNote("No fix.");
                    return;
                  }
                  addFence({
                    id: `pin-${Date.now().toString(36)}`,
                    kind: "station",
                    lat: fix.lat,
                    lng: fix.lng,
                    radiusM: 20,
                    requiredForRune: false,
                    label: "Pin",
                    showOnMap: true,
                    active: true,
                  });
                  await hapticPulse();
                  setNote("Pin dropped on the line.");
                })();
              }}
            >
              Drop pin here
            </button>
            <button type="button" className="quest-btn quest-btn-ghost" onClick={() => stopTrailWalk()}>
              Stop recording
            </button>
          </div>
        </>
      ) : (
        <>
          <label className="quest-label">
            Trail name
            <input className="quest-input" value={label} onChange={(e) => setLabel(e.target.value)} />
          </label>
          <div className="quest-btn-row">
            <button type="button" className="quest-btn" onClick={() => startTrailWalk(label || "Trail")}>
              Start walking
            </button>
          </div>
        </>
      )}
      {note && <p className="quest-muted">{note}</p>}
    </>
  );
}
