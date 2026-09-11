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
  return (
    <>
      <p className="quest-kicker">Map</p>
      <h1 className="quest-title">Line</h1>
      <p className="quest-muted">You on the trail we walked. No arrow to a hidden bone.</p>
      <QuestMap fences={pack.geofences} trails={pack.trails ?? []} follow />
    </>
  );
}
