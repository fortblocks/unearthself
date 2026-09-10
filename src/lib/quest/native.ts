"use client";

export const FIELD_GPS = true;

export type FieldFix = {
  ok: boolean;
  accuracyM: number | null;
  stable: boolean;
};

export function isNativeShell(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

export async function readyNativeShell(): Promise<void> {
  if (!isNativeShell()) return;
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setBackgroundColor({ color: "#161718" });
    await StatusBar.setStyle({ style: Style.Dark });
  } catch {
    /* web or plugin missing */
  }
}

export async function hapticPulse(): Promise<void> {
  try {
    if (isNativeShell()) {
      const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
      await Haptics.impact({ style: ImpactStyle.Medium });
      return;
    }
  } catch {
    /* fall through */
  }
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(30);
  }
}

export async function requestFieldLocation(): Promise<"ok" | "denied" | "missing" | "off"> {
  if (!FIELD_GPS) return "off";
  try {
    if (isNativeShell()) {
      const { Geolocation } = await import("@capacitor/geolocation");
      const perm = await Geolocation.requestPermissions();
      const loc = perm.location;
      if (loc === "denied") return "denied";
      if (loc === "granted" || loc === "prompt-with-rationale") return "ok";
      return "missing";
    }
    if (!("geolocation" in navigator)) return "missing";
    return "ok";
  } catch {
    return "missing";
  }
}

export async function readFieldFix(): Promise<FieldFix> {
  const empty: FieldFix = { ok: false, accuracyM: null, stable: false };
  if (!FIELD_GPS) return empty;
  try {
    if (isNativeShell()) {
      const { Geolocation } = await import("@capacitor/geolocation");
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 8000,
      });
      const accuracyM = pos.coords.accuracy ?? null;
      return { ok: true, accuracyM, stable: accuracyM !== null && accuracyM <= 25 };
    }
    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 8000,
      });
    });
    const accuracyM = pos.coords.accuracy ?? null;
    return { ok: true, accuracyM, stable: accuracyM !== null && accuracyM <= 25 };
  } catch {
    return empty;
  }
}
