import { createFileRoute } from "@tanstack/react-router";
import { FieldCopy } from "@/components/quest/QuestShell";
import { RequireGuest } from "@/components/quest/gates";
import { targetName } from "@/lib/quest/derive";
import { beatSearch } from "@/lib/quest/search";
import { isUnlocked, useQuest } from "@/lib/quest/store";

export const Route = createFileRoute("/quest/recover")({
  validateSearch: beatSearch,
  component: () => (
    <RequireGuest>
      <RecoverScreen />
    </RequireGuest>
  ),
});

function RecoverScreen() {
  const pack = useQuest((s) => s.pack);
  const session = useQuest((s) => s.session);
  const progress = useQuest((s) => s.progress);
  const markAssignedLocated = useQuest((s) => s.markAssignedLocated);
  const markAuthenticated = useQuest((s) => s.markAuthenticated);
  const completeBeat = useQuest((s) => s.completeBeat);
  const beat = pack.beats.find((b) => b.id === "station-3");
  const me = session.participant;
  const open = beat ? isUnlocked(progress, beat.id) : false;

  if (!open || !me) {
    return (
      <>
        <p className="quest-kicker">G06 · Recover</p>
        <h1 className="quest-title">Not yet</h1>
        <p className="quest-muted">The final recovery opens after the field Mirror and your experiment.</p>
      </>
    );
  }

  const target = targetName(pack, me);
  const done = progress.assignedLocated && progress.personalAuthenticated;

  return (
    <>
      <p className="quest-kicker">G06 · Two-person auth</p>
      <h1 className="quest-title">Cross-calibrated</h1>
      {beat && <FieldCopy field={beat.field} simply={beat.simply} />}
      {progress.experimentId && (
        <p className="quest-echo">
          Your field experiment: {pack.experiments.find((e) => e.id === progress.experimentId)?.label}
        </p>
      )}
      <p className="quest-field">
        You are calibrated to detect <strong>{target}</strong>. Stay until they arrive. Their phone does not reveal this place on its own.
      </p>
      <div className="quest-btn-row">
        <button type="button" className="quest-btn" onClick={markAssignedLocated} disabled={progress.assignedLocated}>
          {progress.assignedLocated ? "Assigned signal located" : `I found ${target}’s fragment`}
        </button>
        <button type="button" className="quest-btn quest-btn-ghost" onClick={markAuthenticated} disabled={progress.personalAuthenticated}>
          {progress.personalAuthenticated ? "Personal fragment authenticated" : "Authenticate my fragment"}
        </button>
      </div>
      <p className="quest-muted" style={{ marginTop: "1rem" }}>
        No data passes between phones. Both already hold their assignments. GPS stand-in until radii are walked.
      </p>
      {done && beat && (
        <div className="quest-btn-row">
          <button type="button" className="quest-btn" onClick={() => completeBeat(beat.id)}>
            Recovery complete
          </button>
        </div>
      )}
    </>
  );
}
