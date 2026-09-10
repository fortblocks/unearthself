"use client";

import { useEffect, useState } from "react";
import { useQuest } from "@/lib/quest/store";

function fmt(sec: number) {
  const s = Math.max(0, sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function FieldClock() {
  const started = useQuest((s) => s.progress.questStartedAt);
  const cap = useQuest((s) => s.pack.brief?.durationMin ?? 180);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!started) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [started]);

  if (!started) return null;
  const elapsed = Math.floor((now - started) / 1000);
  const budget = cap * 60;
  const over = elapsed > budget;

  return (
    <p className={over ? "quest-who quest-warn" : "quest-who"} aria-live="polite">
      {fmt(elapsed)} / {fmt(budget)}
    </p>
  );
}
