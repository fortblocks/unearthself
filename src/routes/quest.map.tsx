import { createFileRoute } from "@tanstack/react-router";
import { QuestStage } from "@/components/quest/QuestStage";
import { RequireGuest } from "@/components/quest/gates";
import { useQuest } from "@/lib/quest/store";

export const Route = createFileRoute("/quest/map")({
  component: () => (
    <RequireGuest>
      <MapStage />
    </RequireGuest>
  ),
});

const LINE = [
  [12, 18],
  [28, 32],
  [40, 38],
  [55, 52],
  [68, 61],
  [82, 78],
];

function MapStage() {
  const name = useQuest((s) => s.session.firstName) || "You";
  const d = LINE.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ");
  return (
    <QuestStage>
      <div style={{ flex: 1, position: "relative", background: "#1a1614" }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
          <path d={d} fill="none" stroke="#C99A4A" strokeWidth="1.6" />
          <circle cx="12" cy="18" r="1.8" fill="#F2684C" />
          <circle cx="82" cy="78" r="1.8" fill="#F2684C" />
          <circle cx="40" cy="38" r="2.2" fill="#F8F0ED" />
        </svg>
        <p style={{ position: "absolute", left: "1.1rem", bottom: "1.4rem", margin: 0, fontSize: "0.72rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#C99A4A" }}>
          {name} · on the line · no arrow
        </p>
      </div>
    </QuestStage>
  );
}
