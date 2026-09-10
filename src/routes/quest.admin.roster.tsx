import { createFileRoute } from "@tanstack/react-router";
import { useQuest } from "@/lib/quest/store";

export const Route = createFileRoute("/quest/admin/roster")({
  component: RosterScreen,
});

function RosterScreen() {
  const pack = useQuest((s) => s.pack);
  return (
    <>
      <p className="quest-kicker">A02 · Roster</p>
      <h1 className="quest-title">Ridge team</h1>
      <p className="quest-muted">Identities must exist before leaving Basecamp. Reprint from Paper.</p>
      <table className="quest-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Code</th>
            <th>Detects</th>
          </tr>
        </thead>
        <tbody>
          {pack.roster.map((p) => (
            <tr key={p.id}>
              <td>
                {p.name}
                <div className="quest-muted">{p.expeditionId}</div>
              </td>
              <td>
                <kbd>{p.joinCode}</kbd>
              </td>
              <td>{pack.roster.find((x) => x.id === p.detects)?.name}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="quest-muted" style={{ marginTop: "1rem" }}>
        Facilitator code <kbd>{pack.facilitatorCode}</kbd>
      </p>
    </>
  );
}
