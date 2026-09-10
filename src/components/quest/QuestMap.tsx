"use client";

import { useEffect, useMemo, useState } from "react";
import type { Geofence } from "@/data/quest/types";
import { insideFence } from "@/lib/quest/geo";
import { watchField, type FieldFix } from "@/lib/quest/native";

const DRUMHELLER = { lat: 51.4635, lng: -112.7103 };

export function QuestMap({
  fences,
  follow,
}: {
  fences: Geofence[];
  follow: boolean;
}) {
  const [fix, setFix] = useState<FieldFix | null>(null);

  useEffect(() => {
    if (!follow) return;
    return watchField(setFix);
  }, [follow]);

  const pins = useMemo(
    () => fences.filter((f) => f.showOnMap !== false && f.lat !== null && f.lng !== null),
    [fences],
  );

  const src = useMemo(() => {
    const pts = pins
      .map((p) => ({ lat: p.lat as number, lng: p.lng as number }))
      .concat(fix?.lat != null && fix.lng != null ? [{ lat: fix.lat, lng: fix.lng }] : []);
    const center = pts[0] ?? DRUMHELLER;
    const lats = pts.length ? pts.map((p) => p.lat) : [center.lat];
    const lngs = pts.length ? pts.map((p) => p.lng) : [center.lng];
    const pad = 0.008;
    const minLat = Math.min(...lats) - pad;
    const maxLat = Math.max(...lats) + pad;
    const minLng = Math.min(...lngs) - pad;
    const maxLng = Math.max(...lngs) + pad;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${minLng}%2C${minLat}%2C${maxLng}%2C${maxLat}&layer=mapnik`;
  }, [pins, fix]);

  return (
    <>
      <div className="quest-map" style={{ aspectRatio: "1", padding: 0 }}>
        <iframe title="Field map" src={src} style={{ width: "100%", height: "100%", border: 0 }} />
      </div>
      <p className="quest-token">OpenStreetMap · orientation only. No turn-by-turn.</p>
      {follow && fix?.ok && (
        <p className="quest-muted">
          Fix {fix.stable ? "stable" : "weak"}
          {pins
            .filter((p) => insideFence(fix, p))
            .map((p) => ` · in ${p.label}`)
            .join("")}
        </p>
      )}
      <ul className="quest-privacy">
        {pins.length === 0 && <li>No pins on the guest map yet. Drop one in Zones and leave Show on map on.</li>}
        {pins.map((p) => (
          <li key={p.id}>
            {p.label}
            {p.radiusM ? ` · ${p.radiusM} m` : ""}
          </li>
        ))}
      </ul>
    </>
  );
}
