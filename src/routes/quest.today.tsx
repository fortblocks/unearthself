import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RequireGuest } from "@/components/quest/gates";
import { useQuest } from "@/lib/quest/store";

export const Route = createFileRoute("/quest/today")({
  component: () => (
    <RequireGuest>
      <HomeRunes />
    </RequireGuest>
  ),
});

const RUNES = [
  { id: "play", name: "Play", line: "Start before you have the right answer.", to: "/quest/play", slot: "open" },
  { id: "adaptability", name: "Adaptability", line: "The plan will not survive the coulee.", to: "/quest/adapt", slot: "open" },
  { id: "connection", name: "Connection", line: "Who you are with when the map and the weather disagree.", to: "/quest/today", slot: "locked" },
  { id: "experience", name: "Experience", line: "Be in the thing that is happening.", to: "/quest/today", slot: "locked" },
];

function HomeRunes() {
  const progress = useQuest((s) => s.progress);
  const navigate = useNavigate();
  return (
    <div style={{ padding: "0.2rem 0 1rem" }}>
      <p style={{ fontFamily: "Oswald, system-ui, sans-serif", fontWeight: 800, letterSpacing: "0.16em", fontSize: "1.15rem", margin: "0 0 1.4rem" }}>
        TRAIL<span style={{ color: "#F2684C" }}>QUEST</span>
      </p>
      <div style={{ display: "grid", gap: "1.15rem" }}>
        {RUNES.map((r) => {
          const done = progress.receivedRuneIds.includes(r.id) || progress.activatedRuneIds.includes(r.id);
          const state = done ? "done" : r.slot;
          const color = state === "done" ? "#F2684C" : state === "open" ? "#F8F0ED" : "rgba(248,240,237,0.28)";
          return (
            <button
              key={r.id}
              type="button"
              disabled={state === "locked"}
              onClick={() => state !== "locked" && void navigate({ to: r.to })}
              style={{
                display: "flex",
                gap: "0.9rem",
                alignItems: "flex-start",
                textAlign: "left",
                background: "none",
                border: 0,
                borderTop: "1px solid rgba(248,240,237,0.12)",
                padding: "1.05rem 0 0.2rem",
                color,
                WebkitAppearance: "none",
              }}
            >
              <img
                src={`runes/${r.id}.svg`}
                alt=""
                style={{
                  width: "2.6rem",
                  height: "2.6rem",
                  flex: "none",
                  filter: state === "locked" ? "invert(1) opacity(0.28)" : state === "done" ? "invert(48%) sepia(80%) saturate(2000%) hue-rotate(330deg)" : "invert(1)",
                }}
              />
              <span>
                <strong style={{ display: "block", fontFamily: "Oswald, system-ui", fontSize: "1.35rem", letterSpacing: "0.06em", textTransform: "uppercase" }}>{r.name}</strong>
                <span style={{ display: "block", marginTop: "0.3rem", fontSize: "0.9rem", lineHeight: 1.4, color: state === "open" ? "rgba(248,240,237,0.62)" : "inherit" }}>{r.line}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
