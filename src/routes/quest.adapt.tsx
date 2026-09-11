import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { QuestStage } from "@/components/quest/QuestStage";
import { RequireGuest } from "@/components/quest/gates";

export const Route = createFileRoute("/quest/adapt")({
  component: () => (
    <RequireGuest>
      <AdaptQuest />
    </RequireGuest>
  ),
});

const LINE = [
  [14, 16],
  [30, 28],
  [44, 40],
  [58, 55],
  [74, 70],
  [86, 84],
];

function AdaptQuest() {
  const [page, setPage] = useState<"story" | "field" | "alert">("story");
  const [sec, setSec] = useState(0);

  useEffect(() => {
    if (page !== "field" && page !== "alert") return;
    const t = window.setInterval(() => setSec((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, [page]);

  const mm = String(Math.floor(sec / 60)).padStart(2, "0");
  const ss = String(sec % 60).padStart(2, "0");
  const d = LINE.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ");

  if (page === "story") {
    return (
      <QuestStage>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "4.6rem 1.35rem 1.3rem" }}>
          <p style={{ letterSpacing: "0.14em", textTransform: "uppercase", color: "#C99A4A", fontSize: "0.68rem", margin: 0 }}>Adaptability</p>
          <h1 style={{ fontFamily: "Oswald, system-ui, sans-serif", fontWeight: 800, fontSize: "2.35rem", textTransform: "uppercase", lineHeight: 0.92, margin: "0.45rem 0 1rem" }}>An incomplete skeleton</h1>
          <p style={{ fontSize: "1.05rem", lineHeight: 1.5, margin: "0 0 0.85rem" }}>
            Bones along Horseshoe. If the team recovers them, the record of this place changes. You leave without a facilitator. One phone watches. The land leads.
          </p>
          <p style={{ fontSize: "0.95rem", lineHeight: 1.45, color: "rgba(248,240,237,0.62)", margin: "0 0 auto" }}>
            Stay together. No arrow to a hidden bone. When you enter a station the phone will speak.
          </p>
          <button type="button" onClick={() => setPage("field")} style={{ minHeight: "3.2rem", background: "#F2684C", color: "#161718", border: 0, fontWeight: 600, WebkitAppearance: "none" }}>
            Begin the expedition
          </button>
        </div>
      </QuestStage>
    );
  }

  return (
    <QuestStage>
      <div style={{ flex: 1, position: "relative", background: "#1a1614" }}>
        <p style={{ position: "absolute", top: "3.4rem", left: "1.1rem", margin: 0, fontFamily: "Oswald, system-ui", letterSpacing: "0.08em", fontSize: "1.35rem" }}>
          {mm}:{ss}
        </p>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
          <path d={d} fill="none" stroke="#C99A4A" strokeWidth="1.6" />
          <circle cx="14" cy="16" r="1.7" fill="#F2684C" />
          <circle cx="58" cy="55" r="1.7" fill="#F2684C" />
          <circle cx="44" cy="40" r="2.2" fill="#F8F0ED" />
        </svg>
        {page === "alert" && (
          <div style={{ position: "absolute", left: "1rem", right: "1rem", bottom: "1.3rem", background: "#F2684C", color: "#161718", padding: "1.1rem" }}>
            <p style={{ margin: 0, fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase" }}>Station</p>
            <p style={{ margin: "0.35rem 0 0.8rem", fontWeight: 600 }}>A bone is near. Notice the first thirty seconds. Do not name a capacity.</p>
            <button type="button" onClick={() => setPage("field")} style={{ minHeight: "2.8rem", width: "100%", border: 0, background: "#161718", color: "#F8F0ED", WebkitAppearance: "none" }}>
              Continue on the line
            </button>
          </div>
        )}
        {page === "field" && (
          <button type="button" onClick={() => setPage("alert")} style={{ position: "absolute", left: "1rem", right: "1rem", bottom: "1.3rem", minHeight: "3rem", border: "1px solid rgba(248,240,237,0.28)", background: "transparent", color: "#F8F0ED", WebkitAppearance: "none" }}>
            Arrive at station
          </button>
        )}
      </div>
    </QuestStage>
  );
}
