import { createFileRoute } from "@tanstack/react-router";
import { FieldCopy } from "@/components/quest/QuestShell";
import { RequireGuest } from "@/components/quest/gates";
import { beatSearch } from "@/lib/quest/search";
import { useQuest } from "@/lib/quest/store";

export const Route = createFileRoute("/quest/recorder")({
  validateSearch: beatSearch,
  component: () => (
    <RequireGuest>
      <RecorderScreen />
    </RequireGuest>
  ),
});

function RecorderScreen() {
  const pack = useQuest((s) => s.pack);
  const progress = useQuest((s) => s.progress);
  const session = useQuest((s) => s.session);
  const setRecorder = useQuest((s) => s.setRecorder);
  const claimWatch = useQuest((s) => s.claimWatch);
  const beat = pack.beats.find((b) => b.id === "recorder");
  const team = pack.roster.filter((p) => p.teamId === session.participant?.teamId);
  const holder = team.find((p) => p.id === progress.recorderId);
  const minutes = pack.fieldRecorderMinutes;
  const elapsed = progress.recorderStartedAt ? Math.floor((Date.now() - progress.recorderStartedAt) / 60000) : 0;
  const due = progress.recorderStartedAt && elapsed >= minutes;

  return (
    <>
      <p className="quest-kicker">G07 · Field Recorder</p>
      <h1 className="quest-title">One watched phone</h1>
      {beat && <FieldCopy field={beat.field} simply={beat.simply} />}
      <p className="quest-echo">
        {holder
          ? `${holder.name} holds the watch${progress.claimedWatch ? " (claimed after a dead phone)" : ""}.`
          : "No Recorder yet. The app will pick at random, or the team can appoint."}
      </p>
      {due && <p className="quest-warn">Twenty minutes. Pick a new Recorder.</p>}
      <div className="quest-stack">
        {team.map((p) => (
          <button key={p.id} type="button" className="quest-btn quest-btn-ghost" onClick={() => setRecorder(p.id)}>
            {p.name} holds the watch
          </button>
        ))}
        <button
          type="button"
          className="quest-btn"
          onClick={() => {
            const pick = team[Math.floor(Math.random() * team.length)];
            if (pick) setRecorder(pick.id);
          }}
        >
          Random first pick
        </button>
        <button type="button" className="quest-btn quest-btn-ghost" onClick={claimWatch}>
          Claim-watch — this phone died
        </button>
      </div>
      <p className="quest-muted" style={{ marginTop: "1rem" }}>
        Everyone opens their own device at a station. On the trail, everyone else: pocket.
      </p>
    </>
  );
}
