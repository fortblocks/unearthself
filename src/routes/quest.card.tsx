import { createFileRoute, Link } from "@tanstack/react-router";
import { RequireGuest } from "@/components/quest/gates";
import { cardFromProgress } from "@/lib/quest/profile";
import { useQuest } from "@/lib/quest/store";

export const Route = createFileRoute("/quest/card")({
  component: () => (
    <RequireGuest>
      <CardScreen />
    </RequireGuest>
  ),
});

function CardScreen() {
  const pack = useQuest((s) => s.pack);
  const progress = useQuest((s) => s.progress);
  const session = useQuest((s) => s.session);
  const guest = session.participant;
  if (!guest) return null;
  const card = cardFromProgress(pack, guest, progress);

  return (
    <>
      <p className="quest-kicker">Field card</p>
      <h1 className="quest-title">{guest.name}</h1>
      <p className="quest-muted">
        Show this at Basecamp if the facilitator asks. The hall sees these chips. It does not see what you wrote in the Mirror.
      </p>
      <ul className="quest-privacy">
        <li>Beats done · {card.beatsCompleted.length}</li>
        <li>Specimens · {card.specimenCount} · none required for the Rune</li>
        <li>Mirror · {card.mirrorDone ? "completed" : "not yet"}</li>
        <li>Experiment · {card.experimentChosen ? "chosen" : "not yet"}</li>
        <li>Received · {card.runesReceived.length ? card.runesReceived.join(" · ") : "—"}</li>
        <li>Activated · {card.runesActivated.length ? card.runesActivated.join(" · ") : "—"}</li>
      </ul>
      <p className="quest-token">
        Expedition <kbd>{guest.expeditionId}</kbd>
      </p>
      <div className="quest-btn-row">
        <Link to="/quest/today" className="quest-btn quest-btn-ghost">
          Back to today
        </Link>
      </div>
    </>
  );
}
