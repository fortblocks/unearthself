import { createHash, timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { STAFF_EMAIL } from "./staff.ts";

const MIN_SECRET_CHARS = 32;

/** The only read of STAFF_SESSION_SECRET. Missing or short secrets fail closed. */
export function readStaffSessionSecret(): string | null {
  const secret = process.env.STAFF_SESSION_SECRET?.trim() ?? "";
  if (secret.length >= MIN_SECRET_CHARS) return secret;
  console.warn("STAFF_SESSION_SECRET is missing or shorter than 32 characters.");
  return null;
}

function configuredPassword(): string | null {
  const password = process.env.STAFF_PASSWORD;
  if (typeof password !== "string" || password.length === 0) {
    console.warn("STAFF_PASSWORD is unset.");
    return null;
  }
  return password;
}

function sameSha256(left: string, right: string) {
  const a = createHash("sha256").update(left).digest();
  const b = createHash("sha256").update(right).digest();
  return timingSafeEqual(a, b);
}

export async function attemptStaffLogin(
  email: string,
  password: string,
): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  const secret = readStaffSessionSecret();
  if (!secret) return { ok: false, error: "Staff login is unavailable." };
  const expected = configuredPassword();
  if (!expected) return { ok: false, error: "Staff login is unavailable." };
  const emailOk = email.trim().toLowerCase() === STAFF_EMAIL;
  const passwordOk = sameSha256(password.trim(), expected);
  if (!emailOk || !passwordOk) return { ok: false, error: "That is not the desk." };
  const token = await new SignJWT({ email: STAFF_EMAIL, role: "staff" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(new TextEncoder().encode(secret));
  return { ok: true, token };
}

export async function verifyStaffToken(token: string | undefined | null): Promise<{ email: string } | null> {
  if (!token) return null;
  const secret = readStaffSessionSecret();
  if (!secret) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ["HS256"],
    });
    const email = String(payload.email ?? "")
      .trim()
      .toLowerCase();
    if (email !== STAFF_EMAIL) return null;
    return { email };
  } catch {
    return null;
  }
}
