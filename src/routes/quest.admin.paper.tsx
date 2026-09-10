import { createFileRoute } from "@tanstack/react-router";
import { useQuest } from "@/lib/quest/store";

export const Route = createFileRoute("/quest/admin/paper")({
  component: PaperScreen,
});

function PaperScreen() {
  const pack = useQuest((s) => s.pack);

  return (
    <div className="quest-paper">
      <p className="quest-kicker quest-no-print" style={{ color: "var(--color-shale)" }}>
        A08 · Nine sheets
      </p>
      <h1 className="quest-title" style={{ color: "var(--color-coal)" }}>
        Paper pack
      </h1>
      <p className="quest-no-print">
        <button type="button" className="quest-btn" onClick={() => window.print()}>
          Print
        </button>
      </p>

      <h2>1. Join codes</h2>
      <p>Facilitator {pack.facilitatorCode}</p>
      {pack.roster.map((p) => (
        <p key={p.id}>
          {p.name} · {p.expeditionId} · {p.joinCode} · detects {pack.roster.find((x) => x.id === p.detects)?.name}
        </p>
      ))}

      <h2>2. Today’s sequence</h2>
      {pack.beats.map((b) => (
        <p key={b.id}>
          {b.title} · token {b.paperToken} · {b.unlock}
        </p>
      ))}

      <h2>3. Field transmissions</h2>
      {pack.beats.map((b) => (
        <p key={b.id}>
          <strong>{b.title}.</strong> {b.field} Simply: {b.simply}
        </p>
      ))}

      <h2>4. Boundary map</h2>
      <p>Approved search field. No prize pins. Coordinates after the 15 Oct walk. Do not copy onto Horseshoe.</p>

      <h2>5. Station / specimen cards</h2>
      {pack.geofences.map((g) => (
        <p key={g.id}>
          {g.kind} · {g.label} · requiredForRune: no
        </p>
      ))}

      <h2>6. Echo Mirror prompts</h2>
      {pack.mirrors.map((m) => (
        <p key={m.id}>
          {m.beatId} · {m.stage} · {m.text}
        </p>
      ))}

      <h2>7. Reveal tokens</h2>
      {pack.beats
        .filter((b) => b.phase)
        .map((b) => (
          <p key={b.id}>
            {b.phase} · {b.paperToken} · {b.runeId}
          </p>
        ))}

      <h2>8. Safety</h2>
      <p>Land wins. Notice, don’t excavate. Pass counts. No one alone. Do not run. Two dead phones: finish here.</p>

      <h2>9. Facilitator run sheet</h2>
      <p>
        Unlock with tokens. Claim-watch if a Recorder dies. Late-team outranks ritual. Target 12:15, latest 12:20. Digital
        activation on the shuttle, not in the circle.
      </p>
    </div>
  );
}
