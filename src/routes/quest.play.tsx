import { createFileRoute } from "@tanstack/react-router";
import { FieldCopy, TokenHint } from "@/components/quest/QuestShell";
import { RequireGuest } from "@/components/quest/gates";
import { beatSearch } from "@/lib/quest/search";
import { isUnlocked, useQuest } from "@/lib/quest/store";

export const Route = createFileRoute("/quest/play")({
  validateSearch: beatSearch,
  component: () => (
    <RequireGuest>
      <PlayScreen />
    </RequireGuest>
  ),
});

function PlayScreen() {
  const { beat: beatId } = Route.useSearch();
  const pack = useQuest((s) => s.pack);
  const progress = useQuest((s) => s.progress);
  const completeBeat = useQuest((s) => s.completeBeat);
  const beats = pack.beats.filter((b) => b.screen === "quest" && isUnlocked(progress, b.id));
  const beat = beats.find((b) => b.id === beatId) ?? beats.at(-1) ?? pack.beats.find((b) => b.screen === "quest");

  if (!beat || !isUnlocked(progress, beat.id)) {
    return (
      <>
        <p className="quest-kicker">G03 · Field</p>
        <h1 className="quest-title">Not yet</h1>
        <p className="quest-muted">This beat is locked. The facilitator will open it, or use a paper token.</p>
      </>
    );
  }

  return (
    <>
      <p className="quest-kicker">G03 · Field transmission</p>
      <h1 className="quest-title">{beat.title}</h1>
      <FieldCopy field={beat.field} simply={beat.simply} />
      <TokenHint token={beat.paperToken} />
      <div className="quest-btn-row">
        <button type="button" className="quest-btn" onClick={() => completeBeat(beat.id)}>
          Phones away
        </button>
      </div>
    </>
  );
}
