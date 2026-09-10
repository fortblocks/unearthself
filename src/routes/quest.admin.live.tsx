import { createFileRoute } from "@tanstack/react-router";
import { useQuest } from "@/lib/quest/store";

export const Route = createFileRoute("/quest/admin/live")({
  component: LiveScreen,
});

function LiveScreen() {
  const pack = useQuest((s) => s.pack);
  const progress = useQuest((s) => s.progress);
  const unlockBeat = useQuest((s) => s.unlockBeat);
  const recorder = pack.roster.find((p) => p.id === progress.recorderId);
  const last = pack.beats.filter((b) => progress.unlockedBeatIds.includes(b.id)).at(-1);

  return (
    <>
      <p className="quest-kicker">A04 · Live</p>
      <h1 className="quest-title">On course</h1>
      <p className="quest-muted">Station, timer, specimen count, Mirror Y/N, Recorder name. Never note text.</p>
      <table className="quest-table">
        <tbody>
          <tr>
            <th>Open beat</th>
            <td>{last?.title ?? "—"}</td>
          </tr>
          <tr>
            <th>Specimens</th>
            <td>{progress.specimensFound.length} held · required for Rune: no</td>
          </tr>
          <tr>
            <th>Mirror</th>
            <td>{Object.keys(progress.mirror).length ? "Started" : "Not yet"} · text hidden</td>
          </tr>
          <tr>
            <th>Recorder</th>
            <td>{recorder?.name ?? "None"}</td>
          </tr>
          <tr>
            <th>Auth</th>
            <td>
              {progress.assignedLocated ? "located" : "—"} / {progress.personalAuthenticated ? "authenticated" : "—"}
            </td>
          </tr>
        </tbody>
      </table>
      <p className="quest-kicker" style={{ marginTop: "1.5rem" }}>
        Unlock next
      </p>
      <div className="quest-stack">
        {pack.beats.map((b) => {
          const on = progress.unlockedBeatIds.includes(b.id);
          return (
            <button
              key={b.id}
              type="button"
              className="quest-btn quest-btn-ghost"
              disabled={on}
              onClick={() => unlockBeat(b.id)}
            >
              {on ? "Open · " : "Unlock · "}
              {b.title}
            </button>
          );
        })}
      </div>
    </>
  );
}
