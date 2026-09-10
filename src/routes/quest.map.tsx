import { createFileRoute } from "@tanstack/react-router";
import { QuestMap } from "@/components/quest/QuestMap";
import { RequireGuest } from "@/components/quest/gates";
import { useQuest } from "@/lib/quest/store";

export const Route = createFileRoute("/quest/map")({
  component: () => (
    <RequireGuest>
      <MapScreen />
    </RequireGuest>
  ),
});

function MapScreen() {
  const pack = useQuest((s) => s.pack);
  const town = pack.days.some((d) => d.map === "orient");
  const visible = pack.geofences.filter((g) => g.showOnMap !== false);

  return (
    <>
      <p className="quest-kicker">Map</p>
      <h1 className="quest-title">{town ? "Town" : "Field"}</h1>
      <p className="quest-muted">
        Orientation. The map does not tell you how to walk. Hidden bones stay off this view until a facilitator marks them.
      </p>
      <QuestMap fences={visible} follow />
    </>
  );
}
