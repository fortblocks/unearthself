import { createFileRoute } from "@tanstack/react-router";
import { useQuest } from "@/lib/quest/store";

export const Route = createFileRoute("/quest/admin/pack")({
  component: PackScreen,
});

function PackScreen() {
  const pack = useQuest((s) => s.pack);
  const json = JSON.stringify(
    {
      packVersion: pack.packVersion,
      instanceId: pack.instanceId,
      days: pack.days,
      beats: pack.beats.map((b) => ({
        id: b.id,
        unlock: b.unlock,
        concealRune: b.concealRune,
        paperToken: b.paperToken,
        latlng: "null until walked",
      })),
    },
    null,
    2,
  );

  return (
    <>
      <p className="quest-kicker">A03 · Pack editor</p>
      <h1 className="quest-title">v0.1</h1>
      <p className="quest-muted">
        Concealment flags on. lat/lng null. Tess writes Simply lines. Do not invent town partners.
      </p>
      <pre
        className="quest-echo"
        style={{ overflow: "auto", fontSize: "0.75rem", fontFamily: "ui-monospace, monospace" }}
      >
        {json}
      </pre>
    </>
  );
}
