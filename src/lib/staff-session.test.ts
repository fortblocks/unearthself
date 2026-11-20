import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { SignJWT, jwtVerify } from "jose";
import { STAFF_EMAIL } from "./staff.ts";
import { attemptStaffLogin, readStaffSessionSecret, verifyStaffToken } from "./staff-auth.ts";

const SECRET = "a".repeat(32);
const OTHER_SECRET = "b".repeat(32);
const PASSWORD = "correct-desk-password";
const SHORT_SECRET = "short-staff-secret-value";

function rememberEnv() {
  return {
    secret: process.env.STAFF_SESSION_SECRET,
    password: process.env.STAFF_PASSWORD,
  };
}

function restoreEnv(saved: { secret: string | undefined; password: string | undefined }) {
  if (saved.secret == null) delete process.env.STAFF_SESSION_SECRET;
  else process.env.STAFF_SESSION_SECRET = saved.secret;
  if (saved.password == null) delete process.env.STAFF_PASSWORD;
  else process.env.STAFF_PASSWORD = saved.password;
}

async function warnings(run: () => Promise<void>) {
  const lines: string[] = [];
  const original = console.warn;
  console.warn = (...args: unknown[]) => {
    lines.push(args.map((item) => String(item)).join(" "));
  };
  try {
    await run();
    return lines;
  } finally {
    console.warn = original;
  }
}

test("a missing session secret refuses login and does not verify a token", async () => {
  const saved = rememberEnv();
  try {
    delete process.env.STAFF_SESSION_SECRET;
    process.env.STAFF_PASSWORD = PASSWORD;
    const lines = await warnings(async () => {
      assert.equal(readStaffSessionSecret(), null);
      const result = await attemptStaffLogin(STAFF_EMAIL, PASSWORD);
      assert.equal(result.ok, false);
      if (!result.ok) assert.equal(result.error, "Staff login is unavailable.");
      assert.equal(await verifyStaffToken("presented-token"), null);
    });
    assert.ok(lines.some((line) => line.includes("STAFF_SESSION_SECRET")));
    assert.ok(lines.every((line) => !line.includes(PASSWORD)));
  } finally {
    restoreEnv(saved);
  }
});

test("a session secret shorter than 32 characters refuses login", async () => {
  const saved = rememberEnv();
  try {
    process.env.STAFF_SESSION_SECRET = SHORT_SECRET;
    process.env.STAFF_PASSWORD = PASSWORD;
    const lines = await warnings(async () => {
      assert.equal(readStaffSessionSecret(), null);
      const result = await attemptStaffLogin(STAFF_EMAIL, PASSWORD);
      assert.equal(result.ok, false);
      if (!result.ok) assert.equal(result.error, "Staff login is unavailable.");
    });
    assert.ok(lines.some((line) => line.includes("STAFF_SESSION_SECRET")));
    assert.ok(lines.every((line) => !line.includes(SHORT_SECRET)));
    assert.ok(lines.every((line) => !line.includes(PASSWORD)));
  } finally {
    restoreEnv(saved);
  }
});

test("a valid login issues a 7 day HS256 token", async () => {
  const saved = rememberEnv();
  try {
    process.env.STAFF_SESSION_SECRET = SECRET;
    process.env.STAFF_PASSWORD = PASSWORD;
    const lines = await warnings(async () => {
      const result = await attemptStaffLogin(`  ${STAFF_EMAIL.toUpperCase()}  `, `  ${PASSWORD}  `);
      assert.equal(result.ok, true);
      if (!result.ok) return;
      assert.deepEqual(await verifyStaffToken(result.token), { email: STAFF_EMAIL });
      const { payload, protectedHeader } = await jwtVerify(result.token, new TextEncoder().encode(SECRET), {
        algorithms: ["HS256"],
      });
      assert.equal(protectedHeader.alg, "HS256");
      assert.equal(Number(payload.exp) - Number(payload.iat), 7 * 24 * 60 * 60);
    });
    assert.equal(lines.length, 0);
  } finally {
    restoreEnv(saved);
  }
});

test("a wrong password is refused", async () => {
  const saved = rememberEnv();
  try {
    process.env.STAFF_SESSION_SECRET = SECRET;
    process.env.STAFF_PASSWORD = PASSWORD;
    const lines = await warnings(async () => {
      const result = await attemptStaffLogin(STAFF_EMAIL, "wrong-desk-password");
      assert.equal(result.ok, false);
      if (!result.ok) assert.equal(result.error, "That is not the desk.");
    });
    assert.equal(lines.length, 0);
  } finally {
    restoreEnv(saved);
  }
});

test("an unset staff password refuses login", async () => {
  const saved = rememberEnv();
  try {
    process.env.STAFF_SESSION_SECRET = SECRET;
    delete process.env.STAFF_PASSWORD;
    const lines = await warnings(async () => {
      const result = await attemptStaffLogin(STAFF_EMAIL, PASSWORD);
      assert.equal(result.ok, false);
      if (!result.ok) assert.equal(result.error, "Staff login is unavailable.");
    });
    assert.ok(lines.some((line) => line.includes("STAFF_PASSWORD")));
    assert.ok(lines.every((line) => !line.includes(PASSWORD)));
    assert.ok(lines.every((line) => !line.includes(SECRET)));
  } finally {
    restoreEnv(saved);
  }
});

test("a token signed with a different secret is rejected", async () => {
  const saved = rememberEnv();
  try {
    process.env.STAFF_SESSION_SECRET = SECRET;
    process.env.STAFF_PASSWORD = PASSWORD;
    const foreign = await new SignJWT({ email: STAFF_EMAIL, role: "staff" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(new TextEncoder().encode(OTHER_SECRET));
    const otherAlg = await new SignJWT({ email: STAFF_EMAIL, role: "staff" })
      .setProtectedHeader({ alg: "HS512" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(new TextEncoder().encode(SECRET));
    const lines = await warnings(async () => {
      assert.equal(await verifyStaffToken(foreign), null);
      assert.equal(await verifyStaffToken(otherAlg), null);
    });
    assert.equal(lines.length, 0);
  } finally {
    restoreEnv(saved);
  }
});

test("the session module has one secret read and no literal fallback", () => {
  const session = readFileSync(new URL("./staff-session.ts", import.meta.url), "utf8");
  const auth = readFileSync(new URL("./staff-auth.ts", import.meta.url), "utf8");
  assert.match(session, /verifyStaffToken/);
  assert.match(session, /attemptStaffLogin/);
  assert.doesNotMatch(session, /STAFF_SESSION_SECRET/);
  assert.doesNotMatch(session, /STAFF_PASSWORD/);
  assert.equal((auth.match(/process\.env\.STAFF_SESSION_SECRET/g) ?? []).length, 1);
  assert.match(auth, /algorithms: \["HS256"\]/);
  assert.match(auth, /setExpirationTime\("7d"\)/);
});
