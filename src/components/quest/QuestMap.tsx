"use client";

import { useEffect, useMemo, useState } from "react";
import type { Geofence, Trail } from "@/data/quest/types";
import { insideFence } from "@/lib/quest/geo";
import { watchField, type FieldFix } from "@/lib/quest/native";

const PREVIEW: Trail = {
  id: "preview-horseshoe",
  label: "Preview line",
  points: [
    { lat: 51.4212, lng: -112.5624 },
    { lat: 51.4198, lng: -112.5591 },
    { lat: 51.4181, lng: -112.5566 },
    { lat: 51.4164, lng: -112.5539 },
    { lat: 51.4149, lng: -112.5512 },
  ],
};

export function QuestMap({
  fences,
  trails = [],
  follow,
}: {
  fences: Geofence[];
  trails?: Trail[];
  follow: boolean;
}) {
  const [fix, setFix] = useState<FieldFix | null>(null);
  useEffect(() => {
    if (!follow) return;
    return watchField(setFix);
  }, [follow]);

  const lines = trails.some((t) => t.points.length > 1) ? trails : [PREVIEW];
  const preview = lines[0]?.id === "preview-horseshoe";
  const pins = useMemo(
    () => fences.filter((f) => f.showOnMap !== false && f.lat !== null && f.lng !== null),
    [fences],
  );
  const linePts = lines.flatMap((t) => t.points);

  const box = useMemo(() => {
    const pts = [
      ...linePts,
      ...pins.map((p) => ({ lat: p.lat as number, lng: p.lng as number })),
      ...(fix?.lat != null && fix.lng != null ? [{ lat: fix.lat, lng: fix.lng }] : []),
    ];
    const lats = pts.map((p) => p.lat);
    const lngs = pts.map((p) => p.lng);
    const pad = 0.0012;
    return {
      minLat: Math.min(...lats) - pad,
      maxLat: Math.max(...lats) + pad,
      minLng: Math.min(...lngs) - pad,
      maxLng: Math.max(...lngs) + pad,
    };
  }, [linePts, pins, fix]);

  function xy(lat: number, lng: number) {
    const x = ((lng - box.minLng) / Math.max(1e-6, box.maxLng - box.minLng)) * 100;
    const y = (1 - (lat - box.minLat) / Math.max(1e-6, box.maxLat - box.minLat)) * 100;
    return { x, y };
  }

  return (
    <>
      <div className="quest-map">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
          {lines.map((t) => {
            if (t.points.length < 2) return null;
            const d = t.points
              .map((p, i) => {
                const { x, y } = xy(p.lat, p.lng);
                return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
              })
              .join(" ");
            return <path key={t.id} d={d} fill="none" stroke="#C99A4A" strokeWidth="1.8" />;
          })}
          {pins.map((p) => {
            const { x, y } = xy(p.lat as number, p.lng as number);
            return <circle key={p.id} cx={x} cy={y} r="2" fill="#F2684C" />;
          })}
          {fix?.lat != null && fix.lng != null && (
            <circle cx={xy(fix.lat, fix.lng).x} cy={xy(fix.lat, fix.lng).y} r="2.1" fill="#F8F0ED" stroke="#161718" strokeWidth="0.6" />
          )}
        </svg>
      </div>
      <p className="quest-token">
        {preview ? "Preview line — walk the real one in Trail." : "Recorded trail. No turn-by-turn."}
      </p>
    </>
  );
}
