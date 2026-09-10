"use client";

import { useEffect, useRef } from "react";
import { insideFence } from "@/lib/quest/geo";
import { hapticPulse, watchField } from "@/lib/quest/native";
import { useQuest } from "@/lib/quest/store";

export function FieldWatch() {
  const role = useQuest((s) => s.session.role);
  const fences = useQuest((s) => s.pack.geofences);
  const enterZone = useQuest((s) => s.enterZone);
  const entered = useQuest((s) => s.progress.enteredZoneIds);
  const enteredRef = useRef(entered);
  enteredRef.current = entered;

  useEffect(() => {
    if (role !== "guest") return;
    const stop = watchField((fix) => {
      for (const fence of fences) {
        if (enteredRef.current.includes(fence.id)) continue;
        if (!insideFence(fix, fence)) continue;
        enterZone(fence.id);
        void hapticPulse();
      }
    });
    return stop;
  }, [role, fences, enterZone]);

  return null;
}
