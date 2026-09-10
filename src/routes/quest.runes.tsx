import { createFileRoute } from "@tanstack/react-router";
import { FieldCopy } from "@/components/quest/QuestShell";
import { RequireGuest } from "@/components/quest/gates";
import { beatSearch } from "@/lib/quest/search";
import { isUnlocked, useQuest } from "@/lib/quest/store";

export const Route = createFileRoute("/quest/runes")({
  validateSearch: beatSearch,
  component: () => (
    <RequireGuest>
      <RunesScreen />
    </RequireGuest>
  ),
});

function RunesScreen() {
  const { beat: beatQ } = Route.useSearch();
  const pack = useQuest((s) => s.pack);
  const progress = useQuest((s) => s.progress);
  const receiveRune = useQuest((s) => s.receiveRune);
  const revealRune = useQuest((s) => s.revealRune);
  const activateRune = useQuest((s) => s.activateRune);
  const completeBeat = useQuest((s) => s.completeBeat);

  const open = pack.beats.filter((b) => b.screen === "runes" && isUnlocked(progress, b.id));
  const beat = open.find((b) => b.id === beatQ) ?? open.at(-1);

  if (!beat) {
    return (
      <>
        <p className="quest-kicker">G10 · My Runes</p>
        <h1 className="quest-title">Empty</h1>
        <p className="quest-muted">Nothing here until you receive, then reveal, then choose to carry it.</p>
        <div className="quest-rune-empty" />
      </>
    );
  }

  const current = beat;
  const rune = pack.runes.find((r) => r.id === current.runeId);
  const named = current.phase !== "receive" && rune && progress.revealedRuneIds.includes(rune.id);

  function act() {
    if (!rune) return;
    if (current.phase === "receive") receiveRune(rune.id);
    if (current.phase === "reveal") revealRune(rune.id);
    if (current.phase === "activate") activateRune(rune.id);
    completeBeat(current.id);
  }

  return (
    <>
      <p className="quest-kicker">G10 · {beat.phase ?? "carry"}</p>
      <h1 className="quest-title">{named ? rune?.name : beat.title}</h1>
      {named && rune?.glyph ? (
        <img className="quest-rune" src={rune.glyph} alt="" />
      ) : (
        <div className="quest-rune-empty" aria-hidden="true" />
      )}
      <FieldCopy field={beat.field} simply={beat.simply} />
      {named && rune && <p className="quest-echo">{rune.principle}</p>}
      {progress.activatedRuneIds.length > 0 && (
        <p className="quest-muted">
          Carried: {progress.activatedRuneIds.map((id) => pack.runes.find((r) => r.id === id)?.name).join(" · ")}
        </p>
      )}
      <div className="quest-btn-row">
        <button type="button" className="quest-btn" onClick={act}>
          {beat.phase === "receive" ? "It is in my hand" : beat.phase === "reveal" ? "I have heard the name" : "Activate"}
        </button>
        {beat.phase === "activate" && (
          <button type="button" className="quest-btn quest-btn-ghost" onClick={() => completeBeat(beat.id)}>
            Not yet
          </button>
        )}
      </div>
    </>
  );
}
