import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RequireGuest } from "@/components/quest/gates";
import { useQuest } from "@/lib/quest/store";

export const Route = createFileRoute("/quest/brief")({
  component: () => (
    <RequireGuest>
      <BriefScreen />
    </RequireGuest>
  ),
});

function BriefScreen() {
  const pack = useQuest((s) => s.pack);
  const start = useQuest((s) => s.startQuestClock);
  const started = useQuest((s) => s.progress.questStartedAt);
  const navigate = useNavigate();
  const brief = pack.brief;
  const work =
    brief?.work === "team"
      ? "As a team. One Field Recorder. Nobody walks alone."
      : brief?.work === "solo"
        ? "On your own device. Stay in sight of the team."
        : "Solo beats and team beats. The pack will say which.";

  return (
    <>
      <p className="quest-kicker">Beginning</p>
      <h1 className="quest-title">{pack.title}</h1>
      <p className="quest-field">{brief?.goal ?? "The land first. Language after."}</p>
      <p className="quest-simply">
        <span>How you work</span>
        {work}
      </p>
      {brief && (
        <div className="quest-copy">
          <p className="quest-field">Beginning — {brief.beginning}</p>
          <p className="quest-field">Middle — {brief.middle}</p>
          <p className="quest-field">End — {brief.end}</p>
          <p className="quest-token">{brief.durationMin} min on the clock</p>
        </div>
      )}
      <div className="quest-btn-row">
        <button
          type="button"
          className="quest-btn"
          onClick={() => {
            start();
            void navigate({ to: "/quest/today" });
          }}
        >
          {started ? "Back to the field" : "Start the clock"}
        </button>
      </div>
    </>
  );
}
