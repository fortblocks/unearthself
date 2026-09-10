"use client";

/**
 * APP-02 shell adapter. Screens do not change.
 * On the web PWA this is a no-op wrapper around the browser.
 * Inside Capacitor it uses native geolocation and haptics.
 * No camera. Notes stay in IndexedDB.
 */

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

export async function requestFieldLocation(): Promise<"ok" | "denied" | "missing"> {
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
