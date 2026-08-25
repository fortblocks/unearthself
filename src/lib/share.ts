import type { DayPlan, Intensity, Season } from "@/lib/types";

export interface SharePayload {
  v: 1;
  title: string;
  days: DayPlan[];
  season: Season | "auto";
  intensityPreset: Intensity | null;
  groupSize: number;
}

export function encodeSharePayload(payload: SharePayload): string {
  const json = JSON.stringify(payload);
  if (typeof window !== "undefined") {
    return btoa(unescape(encodeURIComponent(json)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }
  return Buffer.from(json, "utf8").toString("base64url");
}

export function decodeSharePayload(token: string): SharePayload | null {
  try {
    const padded = token.replace(/-/g, "+").replace(/_/g, "/");
    const json =
      typeof window !== "undefined"
        ? decodeURIComponent(escape(atob(padded)))
        : Buffer.from(token, "base64url").toString("utf8");
    const data = JSON.parse(json) as SharePayload;
    if (data.v !== 1 || !Array.isArray(data.days)) return null;
    return data;
  } catch {
    return null;
  }
}

export function buildShareUrl(payload: SharePayload): string {
  const token = encodeSharePayload(payload);
  if (typeof window === "undefined") return `/?r=${token}`;
  const url = new URL(window.location.href);
  url.searchParams.set("r", token);
  return url.toString();
}
