import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuest } from "@/lib/quest/store";

export const Route = createFileRoute("/quest/admin/broadcast")({
  component: BroadcastScreen,
});

function BroadcastScreen() {
  const setBroadcast = useQuest((s) => s.setBroadcast);
  const current = useQuest((s) => s.progress.broadcast);
  const [msg, setMsg] = useState(current ?? "");

  return (
    <>
      <p className="quest-kicker">A05 · Broadcast</p>
      <h1 className="quest-title">The route has changed</h1>
      <p className="quest-muted">Do not say why. Falls back to voice and printed tokens if the phones are dead.</p>
      <label className="quest-label">
        Field call
        <input className="quest-input" value={msg} onChange={(e) => setMsg(e.target.value)} />
      </label>
      <div className="quest-btn-row">
        <button type="button" className="quest-btn" onClick={() => setBroadcast(msg || "The route has changed.")}>
          Send call
        </button>
        <button type="button" className="quest-btn quest-btn-ghost" onClick={() => { setBroadcast(null); setMsg(""); }}>
          Clear
        </button>
      </div>
    </>
  );
}
