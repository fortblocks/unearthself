import assert from "node:assert/strict";
import test from "node:test";
import { edmontonToday } from "./lead-score.ts";
import { LEADS_KEY, emptyBook, useRedisClientForTests } from "./leads-book.ts";
import { HUNTER_KEY } from "./leads-hunter.ts";
import { handleHunterRead, hunterReadAuthorized } from "./hunter-read.ts";

function memoryRedis() {
  const values = new Map<string, unknown>();
  return {
    async get<T>(key: string): Promise<T | null> {
      return values.has(key) ? (values.get(key) as T) : null;
    },
    async set(key: string, value: unknown) {
      values.set(key, value);
      return "OK";
    },
    async del() {
      return 1;
    },
    async incr() {
      return 1;
    },
    async decr() {
      return 0;
    },
    async incrby() {
      return 0;
    },
    async expire() {
      return 1;
    },
    async eval() {
      return 0;
    },
    async lpush() {
      return 1;
    },
    async ltrim() {
      return "OK";
    },
    async lrange() {
      return [];
    },
  };
}

test("the read token is compared without accepting a missing or wrong value", () => {
  assert.equal(hunterReadAuthorized("Bearer read-token-test", ""), false);
  assert.equal(hunterReadAuthorized(null, "read-token-test"), false);
  assert.equal(hunterReadAuthorized("Bearer wrong-token", "read-token-test"), false);
  assert.equal(hunterReadAuthorized("Bearer read-token-test", "read-token-test"), true);
});

test("GET /api/hunter/read is read-only, no-store, and 401 without the token", async () => {
  const previous = process.env.HUNTER_READ_TOKEN;
  const redis = memoryRedis();
  const today = edmontonToday();
  await redis.set(HUNTER_KEY, { paused: true, callsOn: today, callsToday: 2, filedOn: today, filedToday: 1 });
  await redis.set(LEADS_KEY, {
    ...emptyBook(),
    companies: [
      {
        id: "C-1",
        org: "Northwind Example",
        domain: "northwind.example",
        source: "hunter",
        review: "unreviewed",
        hunterScore: 42,
        filedOn: today,
        email: "ada@northwind.test",
      },
    ],
  });
  useRedisClientForTests(redis);
  delete process.env.HUNTER_READ_TOKEN;
  try {
    const missing = await handleHunterRead(new Request("https://unearthself.example/api/hunter/read"));
    assert.equal(missing.status, 401);
    assert.equal(missing.headers.get("cache-control"), "no-store");
    const wrong = await handleHunterRead(
      new Request("https://unearthself.example/api/hunter/read", { headers: { authorization: "Bearer wrong-token" } }),
    );
    assert.equal(wrong.status, 401);
    process.env.HUNTER_READ_TOKEN = "read-token-test";
    const posted = await handleHunterRead(
      new Request("https://unearthself.example/api/hunter/read", {
        method: "POST",
        headers: { authorization: "Bearer read-token-test" },
      }),
    );
    assert.equal(posted.status, 405);
    const ok = await handleHunterRead(
      new Request("https://unearthself.example/api/hunter/read", { headers: { authorization: "Bearer read-token-test" } }),
    );
    assert.equal(ok.status, 200);
    assert.equal(ok.headers.get("cache-control"), "no-store");
    const body = (await ok.json()) as {
      paused: boolean;
      today: { calls: number; cardsFiled: number; spendActual: number; spendEstimated: number };
      runs: unknown[];
      cards: { org: string; status: string; score: number | null; email?: string }[];
    };
    assert.equal(body.paused, true);
    assert.equal(body.today.calls, 2);
    assert.equal(body.today.cardsFiled, 1);
    assert.equal(typeof body.today.spendActual, "number");
    assert.equal(body.cards[0]?.org, "Northwind Example");
    assert.equal(body.cards[0]?.status, "unreviewed");
    assert.equal(body.cards[0]?.score, 42);
    assert.equal(body.cards[0]?.email, undefined);
    const text = JSON.stringify(body);
    assert.equal(text.includes("read-token-test"), false);
    assert.equal(text.includes("ada@northwind.test"), false);
  } finally {
    useRedisClientForTests(null);
    if (previous == null) delete process.env.HUNTER_READ_TOKEN;
    else process.env.HUNTER_READ_TOKEN = previous;
  }
});
