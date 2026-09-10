import { createFileRoute } from "@tanstack/react-router";
import { useQuest } from "@/lib/quest/store";

export const Route = createFileRoute("/quest/admin/after")({
  component: AfterScreen,
});

function AfterScreen() {
  const pack = useQuest((s) => s.pack);
  const progress = useQuest((s) => s.progress);

  const exportable = {
    instanceId: pack.instanceId,
    completedBeats: progress.completedBeatIds,
    specimens: progress.specimensFound.length,
    mirrorBeatsDone: Object.keys(progress.mirror),
    experimentChosen: Boolean(progress.experimentId),
    runesActivated: progress.activatedRuneIds,
    notes: "omitted",
  };

  return (
    <>
      <p className="quest-kicker">A07 · After</p>
      <h1 className="quest-title">Non-private only</h1>
      <p className="quest-muted">Echo notes stay on the guest device. Schedule the thirty-day check from the instance end date.</p>
      <pre className="quest-echo" style={{ fontFamily: "ui-monospace, monospace", fontSize: "0.8rem" }}>
        {JSON.stringify(exportable, null, 2)}
      </pre>
    </>
  );
}
