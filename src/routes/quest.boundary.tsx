import { createFileRoute } from "@tanstack/react-router";
import { FieldCopy } from "@/components/quest/QuestShell";
import { RequireGuest } from "@/components/quest/gates";
import { beatSearch } from "@/lib/quest/search";
import { useQuest } from "@/lib/quest/store";

export const Route = createFileRoute("/quest/boundary")({
  validateSearch: beatSearch,
  component: () => (
    <RequireGuest>
      <BoundaryScreen />
    </RequireGuest>
  ),
});

function BoundaryScreen() {
  const pack = useQuest((s) => s.pack);
  const beat = pack.beats.find((b) => b.id === "boundary");
  const fence = pack.geofences.find((g) => g.kind === "boundary");

  return (
    <>
      <p className="quest-kicker">G04 · Boundary</p>
      <h1 className="quest-title">Approved field</h1>
      {beat && <FieldCopy field={beat.field} simply={beat.simply} />}
      <div className="quest-map" aria-hidden="true">
        <div className="quest-map-field" />
        <p>No pin on the prize</p>
      </div>
      <p className="quest-muted">
        {fence?.lat == null
          ? "Coordinates empty until Horsethief is walked. Paper map is valid. Do not copy a radius onto Horseshoe."
          : fence.label}
      </p>
    </>
  );
}
