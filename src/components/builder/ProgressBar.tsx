"use client";

import { useBuilderStore } from "@/lib/store";
import { retreatCompletion } from "@/lib/time";

export function ProgressBar() {
  const days = useBuilderStore((s) => s.days);
  const pct = retreatCompletion(days);

  return (
    <div className="progress-wrap" aria-label="Retreat completeness">
      <div className="progress-meta">
        <span>Retreat forge progress</span>
        <strong>{pct}%</strong>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
