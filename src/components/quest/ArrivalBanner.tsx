"use client";

import { useQuest } from "@/lib/quest/store";

export function ArrivalBanner() {
  const pack = useQuest((s) => s.pack);
  const arrival = useQuest((s) => s.progress.lastArrival);
  const dismiss = useQuest((s) => s.dismissArrival);
  if (!arrival) return null;
  const fence = pack.geofences.find((g) => g.id === arrival.fenceId);
  const beat = pack.beats.find((b) => b.id === arrival.beatId);
  const prompt = beat?.arrival ?? beat?.simply ?? fence?.label ?? "You are in a zone.";
  return (
    <div className="quest-banner quest-banner-call" role="alert">
      <p style={{ margin: 0 }}>{beat?.title ?? fence?.label}</p>
      <p style={{ margin: "0.35rem 0 0", fontWeight: 500 }}>{prompt}</p>
      <button type="button" className="quest-btn" style={{ marginTop: "0.6rem" }} onClick={() => dismiss()}>
        Continue
      </button>
    </div>
  );
}
