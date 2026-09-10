import { createFileRoute } from "@tanstack/react-router";
import { useQuest } from "@/lib/quest/store";

export const Route = createFileRoute("/quest/admin/")({
  component: InstanceScreen,
});

function InstanceScreen() {
  const pack = useQuest((s) => s.pack);
  const resetDemo = useQuest((s) => s.resetDemo);
  const leave = useQuest((s) => s.leave);

  return (
    <>
      <p className="quest-kicker">A01 · Instance</p>
      <h1 className="quest-title">{pack.title}</h1>
      <p className="quest-muted">
        {pack.instanceId} · pack {pack.packVersion} · {pack.product}
      </p>
      <p className="quest-field" style={{ marginTop: "1rem" }}>
        Clone yesterday by keeping this pack. Archive by leaving. October test has no sync endpoint. Progress lives on the phones in the room.
      </p>
      <table className="quest-table">
        <tbody>
          <tr>
            <th>Days</th>
            <td>{pack.days.filter((d) => !d.stub).length} live · {pack.days.filter((d) => d.stub).length} stub</td>
          </tr>
          <tr>
            <th>Guests</th>
            <td>{pack.roster.length}</td>
          </tr>
          <tr>
            <th>Host</th>
            <td>{pack.host}</td>
          </tr>
        </tbody>
      </table>
      <div className="quest-btn-row">
        <button type="button" className="quest-btn quest-btn-ghost" onClick={resetDemo}>
          Reset this device
        </button>
        <button type="button" className="quest-btn quest-btn-ghost" onClick={leave}>
          Leave facilitator
        </button>
      </div>
    </>
  );
}
