import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FieldCopy } from "@/components/quest/QuestShell";
import { RequireGuest } from "@/components/quest/gates";
import { beatSearch } from "@/lib/quest/search";
import { isUnlocked, useQuest } from "@/lib/quest/store";

export const Route = createFileRoute("/quest/specimen")({
  validateSearch: beatSearch,
  component: () => (
    <RequireGuest>
      <SpecimenScreen />
    </RequireGuest>
  ),
});

function SpecimenScreen() {
  const pack = useQuest((s) => s.pack);
  const progress = useQuest((s) => s.progress);
  const findSpecimen = useQuest((s) => s.findSpecimen);
  const completeBeat = useQuest((s) => s.completeBeat);
  const beat = pack.beats.find((b) => b.id === "transit-specimens");
  const bones = pack.geofences.filter((g) => g.kind === "specimen");
  const [flash, setFlash] = useState<string | null>(null);
  const open = beat ? isUnlocked(progress, beat.id) : false;

  useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(() => setFlash(null), 2800);
    return () => window.clearTimeout(t);
  }, [flash]);

  function capture(id: string) {
    findSpecimen(id);
    try {
      navigator.vibrate?.([40, 40, 80]);
    } catch {
      /* ignore */
    }
    setFlash(id);
  }

  if (!open) {
    return (
      <>
        <p className="quest-kicker">G05 · Specimen</p>
        <h1 className="quest-title">Not yet</h1>
        <p className="quest-muted">Transit recoveries open when the facilitator starts the canyon sequence.</p>
      </>
    );
  }

  return (
    <>
      <p className="quest-kicker">G05 · Digital specimen</p>
      <h1 className="quest-title">Field recovery</h1>
      {beat && <FieldCopy field={beat.field} simply={beat.simply} />}
      {flash && (
        <p className="quest-banner quest-banner-call" role="alert">
          Signal held. Capture stored on this device.
        </p>
      )}
      <div className="quest-stack">
        {bones.map((b) => {
          const got = progress.specimensFound.includes(b.id);
          return (
            <button
              key={b.id}
              type="button"
              className={got ? "quest-btn quest-btn-ghost" : "quest-btn"}
              onClick={() => capture(b.id)}
              disabled={got}
            >
              {got ? "Held" : "Facilitator stand-in · capture"}
            </button>
          );
        })}
      </div>
      <p className="quest-muted" style={{ marginTop: "1rem" }}>
        GPS radius is null until the walk. A stable reading will replace this stand-in. Bones are not required for the Rune.
      </p>
      <div className="quest-btn-row">
        {beat && (
          <button type="button" className="quest-btn quest-btn-ghost" onClick={() => completeBeat(beat.id)}>
            Continue the trail
          </button>
        )}
      </div>
    </>
  );
}
