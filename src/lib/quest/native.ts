"use client";

export const FIELD_GPS = true;

export type FieldFix = {
  ok: boolean;
  accuracyM: number | null;
  stable: boolean;
  lat: number | null;
  lng: number | null;
};

const emptyFix = (): FieldFix => ({ ok: false, accuracyM: null, stable: false, lat: null, lng: null });

function fromCoords(lat: number, lng: number, accuracyM: number | null): FieldFix {
  return { ok: true, accuracyM, stable: accuracyM !== null && accuracyM <= 25, lat, lng };
}

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
    /* ignore */
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
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(30);
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
  if (!FIELD_GPS) return emptyFix();
  try {
    if (isNativeShell()) {
      const { Geolocation } = await import("@capacitor/geolocation");
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 8000 });
      return fromCoords(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy ?? null);
    }
    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 8000 });
    });
    return fromCoords(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy ?? null);
  } catch {
    return emptyFix();
  }
}

export function watchField(onFix: (fix: FieldFix) => void): () => void {
  let dead = false;
  if (isNativeShell()) {
    let id: string | undefined;
    void (async () => {
      try {
        const { Geolocation } = await import("@capacitor/geolocation");
        id = await Geolocation.watchPosition({ enableHighAccuracy: true }, (pos, err) => {
          if (dead) return;
          if (err || !pos) return onFix(emptyFix());
          onFix(fromCoords(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy ?? null));
        });
      } catch {
        if (!dead) onFix(emptyFix());
      }
    })();
    return () => {
      dead = true;
      if (id) void import("@capacitor/geolocation").then(({ Geolocation }) => Geolocation.clearWatch({ id: id! }));
    };
  }
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
    return () => {
      dead = true;
    };
  }
  const wid = navigator.geolocation.watchPosition(
    (pos) => {
      if (!dead) onFix(fromCoords(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy ?? null));
    },
    () => {
      if (!dead) onFix(emptyFix());
    },
    { enableHighAccuracy: true, maximumAge: 3000 },
  );
  return () => {
    dead = true;
    navigator.geolocation.clearWatch(wid);
  };
}
