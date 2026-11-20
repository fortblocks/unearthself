import { createServerFn } from "@tanstack/react-start";

const COOKIE = "us_desk";

function cookieOpts(maxAge: number, host?: string) {
  const opts: {
    httpOnly: boolean;
    sameSite: "lax";
    path: string;
    maxAge: number;
    secure: boolean;
    domain?: string;
  } = {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge,
    secure: process.env.NODE_ENV === "production",
  };
  const hostname = (host ?? "").split(":")[0].toLowerCase();
  if (hostname === "unearthself.xyz" || hostname.endsWith(".unearthself.xyz")) {
    opts.domain = ".unearthself.xyz";
  }
  return opts;
}

/**
 * Verify staff session from cookie JWT
 * Internal helper for server functions - does not expose as server fn
 */
async function verifyStaffSession(): Promise<{ email: string } | null> {
  const { getCookie } = await import("@tanstack/react-start/server");
  const { verifyStaffToken } = await import("./staff-auth.ts");
  return verifyStaffToken(getCookie(COOKIE));
}

/**
 * Require staff session or throw 401
 * Use at server function boundary
 */
export async function requireStaffSession(): Promise<{ email: string }> {
  const session = await verifyStaffSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

export const getStaffSession = createServerFn({ method: "GET" }).handler(async () => {
  return verifyStaffSession();
});

export const staffLogin = createServerFn({ method: "POST" })
  .validator((d: { email: string; password: string }) => d)
  .handler(async ({ data }) => {
    const { attemptStaffLogin } = await import("./staff-auth.ts");
    const result = await attemptStaffLogin(data.email, data.password);
    if (!result.ok) return result;
    const { setCookie, getRequestHeader } = await import("@tanstack/react-start/server");
    const host = getRequestHeader("x-forwarded-host") || getRequestHeader("host") || "";
    setCookie(COOKIE, result.token, cookieOpts(60 * 60 * 24 * 7, host));
    return { ok: true as const };
  });

export const staffLogout = createServerFn({ method: "POST" }).handler(async () => {
  const { deleteCookie, getRequestHeader } = await import("@tanstack/react-start/server");
  const host = getRequestHeader("x-forwarded-host") || getRequestHeader("host") || "";
  deleteCookie(COOKIE, cookieOpts(0, host));
  return { ok: true as const };
});
