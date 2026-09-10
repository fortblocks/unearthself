import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuest } from "@/lib/quest/store";

export const Route = createFileRoute("/quest/")({
  component: JoinScreen,
});

function JoinScreen() {
  const join = useQuest((s) => s.join);
  const acceptPrivacy = useQuest((s) => s.acceptPrivacy);
  const completeDeviceCheck = useQuest((s) => s.completeDeviceCheck);
  const session = useQuest((s) => s.session);
  const progress = useQuest((s) => s.progress);
  const ready = useQuest((s) => s.ready);
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [step, setStep] = useState<"join" | "privacy" | "device">("join");

  useEffect(() => {
    if (!ready || !session.role) return;
    if (!progress.privacyAccepted) setStep("privacy");
    else if (!progress.deviceChecked) setStep("device");
    else if (session.role === "facilitator") void navigate({ to: "/quest/admin" });
    else void navigate({ to: "/quest/today" });
  }, [ready, session.role, progress.privacyAccepted, progress.deviceChecked, navigate]);

  function onJoin(e: React.FormEvent) {
    e.preventDefault();
    const res = join(code, name);
    if (!res.ok) {
      setErr(res.reason ?? "Could not join.");
      return;
    }
    setErr("");
    setStep("privacy");
  }

  if (step === "privacy") {
    return (
      <>
        <p className="quest-kicker">G01 · Privacy</p>
        <h1 className="quest-title">What stays on this phone</h1>
        <div className="quest-privacy">
          <p>Echo notes are yours. They are stored on this device. The facilitator sees whether a Mirror is done, not what you wrote.</p>
          <ul>
            <li>Pass is always available. A pass counts as a turn.</li>
            <li>No forced dancing, running, disclosure, or approaching an unbriefed stranger.</li>
            <li>Notice, don’t excavate.</li>
            <li>If this fights the land, put the phone away.</li>
            <li>Bots never read Echo notes.</li>
          </ul>
        </div>
        <div className="quest-btn-row">
          <button type="button" className="quest-btn" onClick={() => { acceptPrivacy(); setStep("device"); }}>
            I understand
          </button>
        </div>
      </>
    );
  }

  if (step === "device") {
    return (
      <>
        <p className="quest-kicker">Device check · before the descent</p>
        <h1 className="quest-title">Pack is on this phone</h1>
        <p className="quest-field">
          Location, haptics and a full battery matter on the trail. In this October test the geofences have not been walked, so a facilitator token stands in for GPS.
        </p>
        <ul className="quest-privacy">
          <li>Trail Quest can stay open during a challenge.</li>
          <li>Clock is yours to check.</li>
          <li>Paper pack in the facilitator’s bag if this dies.</li>
        </ul>
        <div className="quest-btn-row">
          <button
            type="button"
            className="quest-btn"
            onClick={() => {
              completeDeviceCheck();
              if (session.role === "facilitator") void navigate({ to: "/quest/admin" });
              else void navigate({ to: "/quest/today" });
            }}
          >
            Ready
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <p className="quest-kicker">G01 · Join</p>
      <h1 className="quest-title">Enter the instance</h1>
      <p className="quest-muted">October test. No account. The pack downloads onto this device and stays there.</p>
      <form className="quest-stack" onSubmit={onJoin} style={{ marginTop: "1.25rem" }}>
        <label className="quest-label">
          Join code
          <input
            className="quest-input"
            autoCapitalize="characters"
            autoCorrect="off"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="ALEX"
          />
        </label>
        <label className="quest-label">
          First name
          <input className="quest-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="As you want it said" />
        </label>
        {err && <p className="quest-warn">{err}</p>}
        <button type="submit" className="quest-btn">
          Join
        </button>
      </form>
      <p className="quest-muted" style={{ marginTop: "1.5rem" }}>
        Demo codes: ALEX, BRIA, CARL, DANA. Facilitator: FACIL.
      </p>
    </>
  );
}
