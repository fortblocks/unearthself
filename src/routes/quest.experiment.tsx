import { createFileRoute } from "@tanstack/react-router";
import { FieldCopy } from "@/components/quest/QuestShell";
import { RequireGuest } from "@/components/quest/gates";
import { beatSearch } from "@/lib/quest/search";
import { isUnlocked, useQuest } from "@/lib/quest/store";

export const Route = createFileRoute("/quest/experiment")({
  validateSearch: beatSearch,
  component: () => (
    <RequireGuest>
      <ExperimentScreen />
    </RequireGuest>
  ),
});

function ExperimentScreen() {
  const pack = useQuest((s) => s.pack);
  const progress = useQuest((s) => s.progress);
  const setExperiment = useQuest((s) => s.setExperiment);
  const completeBeat = useQuest((s) => s.completeBeat);
  const beat =
    pack.beats.find((b) => b.screen === "experiment" && isUnlocked(progress, b.id) && !progress.completedBeatIds.includes(b.id)) ??
    pack.beats.find((b) => b.screen === "experiment" && isUnlocked(progress, b.id));

  if (!beat) {
    return (
      <>
        <p className="quest-kicker">G09 · Experiment</p>
        <h1 className="quest-title">Not yet</h1>
        <p className="quest-muted">Choose an experiment after the Mirror. Keep it private.</p>
      </>
    );
  }

  return (
    <>
      <p className="quest-kicker">G09 · One change</p>
      <h1 className="quest-title">{beat.title}</h1>
      <FieldCopy field={beat.field} simply={beat.simply} />
      <div className="quest-stack">
        {pack.experiments.map((e) => (
          <label key={e.id} className="quest-choice">
            <input
              type="radio"
              name="exp"
              checked={progress.experimentId === e.id}
              onChange={() => setExperiment(e.id)}
            />
            <span>{e.label}</span>
          </label>
        ))}
      </div>
      <div className="quest-btn-row">
        <button
          type="button"
          className="quest-btn"
          disabled={!progress.experimentId}
          onClick={() => completeBeat(beat.id)}
        >
          Carry it privately
        </button>
      </div>
    </>
  );
}
