import { createServerFn } from "@tanstack/react-start";
import { STAFF_EMAIL } from "@/lib/staff";

const COOKIE = "us_desk";

function cookieOpts(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge,
    secure: process.env.NODE_ENV === "production",
  };
}

export const getStaffSession = createServerFn({ method: "GET" }).handler(async () => {
  const { getCookie } = await import("@tanstack/react-start/server");
  const { jwtVerify } = await import("jose");
  const token = getCookie(COOKIE);
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(
      process.env.STAFF_SESSION_SECRET?.trim() || "unearth-desk-staff-2026",
    );
    const { payload } = await jwtVerify(token, secret);
    const email = String(payload.email ?? "")
      .trim()
      .toLowerCase();
    if (email !== STAFF_EMAIL) return null;
    return { email };
  } catch {
    return null;
  }
});

export const staffLogin = createServerFn({ method: "POST" })
  .validator((d: { email: string; password: string }) => d)
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data.password));
    const digest = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
    if (
      email !== STAFF_EMAIL ||
      digest !== "c61888878c03cb982e7ef3986cca3351b733a43ec0b5c3a6af7a8fae9fc82df1"
    ) {
      return { ok: false as const };
    }
    const { setCookie } = await import("@tanstack/react-start/server");
    const { SignJWT } = await import("jose");
    const secret = new TextEncoder().encode(
      process.env.STAFF_SESSION_SECRET?.trim() || "unearth-desk-staff-2026",
    );
    const token = await new SignJWT({ email, role: "staff" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(secret);
    setCookie(COOKIE, token, cookieOpts(60 * 60 * 24 * 7));
    return { ok: true as const };
  });

export const staffLogout = createServerFn({ method: "POST" }).handler(async () => {
  const { deleteCookie } = await import("@tanstack/react-start/server");
  deleteCookie(COOKIE, cookieOpts(0));
  return { ok: true as const };
});
