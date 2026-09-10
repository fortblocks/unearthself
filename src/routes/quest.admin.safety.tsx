import { createFileRoute } from "@tanstack/react-router";
import { useQuest } from "@/lib/quest/store";

export const Route = createFileRoute("/quest/admin/safety")({
  component: SafetyScreen,
});

function SafetyScreen() {
  const markLate = useQuest((s) => s.markLate);
  const late = useQuest((s) => s.progress.lateTeam);

  return (
    <>
      <p className="quest-kicker">A06 · Safety</p>
      <h1 className="quest-title">Land wins</h1>
      <ul className="quest-privacy">
        <li>If an instruction fights the canyon, paper wins.</li>
        <li>No one travels alone. Do not run on uneven ground.</li>
        <li>Failure Bow is for mistakes, not injuries.</li>
        <li>Late-team and field-safety outrank the full-group ritual. Target 12:15, latest 12:20. Begin anyway.</li>
        <li>Two dead phones: finish the day on paper.</li>
      </ul>
      <div className="quest-btn-row">
        <button type="button" className="quest-btn" onClick={() => markLate(!late)}>
          {late ? "Clear late-team" : "Mark team late"}
        </button>
      </div>
    </>
  );
}
