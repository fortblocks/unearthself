import type { Geofence } from "@/data/quest/types";
import type { FieldFix } from "./native";

export function metresBetween(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const lat1 = (aLat * Math.PI) / 180;
  const lat2 = (bLat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function insideFence(fix: FieldFix, fence: Geofence): boolean {
  if (!fix.ok || fix.lat === null || fix.lng === null) return false;
  if (fence.lat === null || fence.lng === null || fence.radiusM === null) return false;
  if (fence.active === false) return false;
  return metresBetween(fix.lat, fix.lng, fence.lat, fence.lng) <= fence.radiusM;
}
