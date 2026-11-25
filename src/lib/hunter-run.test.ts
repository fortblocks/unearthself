import assert from "node:assert/strict";
import test from "node:test";
import { LEADS_KEY, emptyBook, useRedisClientForTests } from "./leads-book.ts";
import { HUNTER_ALARM_KEY, HUNTER_DNC_KEY, HUNTER_RUN_OPEN_KEY } from "./hunter-config.ts";
import { useBuyerJudgeForTests } from "./buyer-judgment.ts";
import { HUNTER_SEARCH_MODEL } from "./xai-search.ts";
import { HUNTER_KEY, appendDoNotContact, enrichUnderApolloCap, readHunterDesk, runHunterBatch, useMxLookupForTests } from "./leads-hunter.ts";
import { runNightlyCron } from "./hunter-nightly.ts";
import { edmontonToday, type Company } from "./lead-score.ts";

const ABOUT = "https://northwind.example/about";
const TEAM = "https://northwind.example/team";
const HUNT_AT = new Date("2026-11-19T18:00:00.000Z");
const NIGHT_AT = new Date("2026-11-19T10:00:00.000Z");

function memoryRedis() {
  const values = new Map<string, unknown>();
  const hashes = new Map<string, Record<string, string>>();
  const lists = new Map<string, unknown[]>();
  return {
    values,
    async get<T>(key: string): Promise<T | null> {
      return values.has(key) ? (values.get(key) as T) : null;
    },
    async set(key: string, value: unknown, opts?: { nx?: true; ex?: number }) {
      if (opts?.nx && values.has(key)) return null;
      values.set(key, value);
      return "OK";
    },
    async del(key: string) {
      values.delete(key);
      hashes.delete(key);
      return 1;
    },
    async incr(key: string) {
      const next = Number(values.get(key) ?? 0) + 1;
      values.set(key, String(next));
      return next;
    },
    async decr(key: string) {
      const next = Number(values.get(key) ?? 0) - 1;
      values.set(key, String(next));
      return next;
    },
    async incrby(key: string, amount: number) {
      const next = Number(values.get(key) ?? 0) + amount;
      values.set(key, String(next));
      return next;
    },
    async expire() {
      return 1;
    },
    async eval(_script: string, keys: string[], args: string[]) {
      if (values.get(keys[0] ?? "") === args[0]) {
        values.delete(keys[0] ?? "");
        return 1;
      }
      return 0;
    },
    async hset(key: string, field: string | Record<string, string>, value?: string) {
      const hash = hashes.get(key) ?? {};
      if (field && typeof field === "object") {
        for (const [name, item] of Object.entries(field)) hash[name] = item;
      } else if (typeof field === "string" && typeof value === "string") {
        hash[field] = value;
      }
      hashes.set(key, hash);
      return 1;
    },
    async hgetall(key: string) {
      return hashes.get(key) ?? {};
    },
    async lpush(key: string, value: unknown) {
      const list = lists.get(key) ?? [];
      list.unshift(value);
      lists.set(key, list);
      return list.length;
    },
    async ltrim() {
      return "OK";
    },
    async lrange(key: string, start: number, stop: number) {
      const list = lists.get(key) ?? [];
      return list.slice(start, stop + 1);
    },
  };
}

function oldCompany(): Company {
  return {
    id: "C-old",
    org: "Old Co",
    domain: "oldco.example",
    city: "Calgary",
    industry: "energy",
    sizeBand: "80-800",
    sourceUrl: "https://oldco.example",
    why: "Already on the desk.",
    buyerName: "",
    buyerTitle: "",
    email: "",
    emailSource: "",
    timingNote: "",
    timingScore: 0,
    status: "watch",
    filedLeadId: "",
    review: "unreviewed",
  } as Company;
}

function xaiBody(companies: unknown[]) {
  return {
    output: [
      { type: "web_search_call", status: "completed" },
      { type: "message", content: [{ type: "output_text", text: JSON.stringify({ companies }) }] },
    ],
    usage: { cost_in_usd_ticks: 10_000_000_000 },
  };
}

const northwind = {
  org: "Northwind Example",
  domain: "northwind.example",
  place: "Calgary, Canada",
  sourceUrl: ABOUT,
  profileSignals: [{ id: "distributed", sourceUrl: ABOUT }],
  buyer: {
    name: "Ada North",
    title: "Head of People",
    email: "ada@northwind.test",
    emailSource: TEAM,
  },
};

function install(redis: ReturnType<typeof memoryRedis>) {
  process.env.HUNTER_COMPANY_SOURCE = "xai";
  useRedisClientForTests(redis);
  useMxLookupForTests(async (host) => {
    if (host === "northwind.test") return [{ exchange: "mail.northwind.test" }];
    return [];
  });
  useBuyerJudgeForTests(async () => ({
    ok: true,
    usage: { inputTokens: 0, outputTokens: 0, dollars: null },
    judgment: {
      buyer: true,
      confidence: "high",
      reason: "The company context and the role fit a team retreat.",
      model: HUNTER_SEARCH_MODEL,
    },
  }));
}

async function restore(previousFetch: typeof fetch, env: Record<string, string | undefined>) {
  globalThis.fetch = previousFetch;
  useRedisClientForTests(null);
  useMxLookupForTests(null);
  useBuyerJudgeForTests(null);
  delete process.env.HUNTER_COMPANY_SOURCE;
  for (const [key, value] of Object.entries(env)) {
    if (value == null) delete process.env[key];
    else process.env[key] = value;
  }
}

test("a contact on a contact page is filed, a pause and a desk edit survive, and a second search waits", async () => {
  const redis = memoryRedis();
  const previousFetch = globalThis.fetch;
  const env = { XAI_API_KEY: process.env.XAI_API_KEY, HUNTER_KILL_SWITCH: process.env.HUNTER_KILL_SWITCH };
  delete process.env.HUNTER_KILL_SWITCH;
  process.env.XAI_API_KEY = "xai-test-key";
  install(redis);
  await redis.set(LEADS_KEY, { ...emptyBook(), companies: [oldCompany()] });
  let xaiCalls = 0;
  let edited = false;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes("api.x.ai")) {
      xaiCalls += 1;
      return Response.json(xaiBody([northwind]));
    }
    if (url === ABOUT) {
      if (!edited) {
        edited = true;
        const book = await redis.get<{ companies: Company[] }>(LEADS_KEY);
        const companies = (book?.companies ?? []).map((company) =>
          company.id === "C-old" ? { ...company, review: "approved" as const } : company,
        );
        await redis.set(LEADS_KEY, { ...(book ?? emptyBook()), companies });
        await redis.set(HUNTER_KEY, { paused: true, reviewEpoch: "2026-11-19" });
      }
      return new Response("Northwind Example in Calgary, Canada runs a distributed team.");
    }
    if (url === TEAM) return new Response("Ada North, Head of People, ada@northwind.test");
    return new Response("missing", { status: 404 });
  };
  let ticks = 0;
  const start = HUNT_AT.getTime();
  try {
    const result = await runHunterBatch(HUNT_AT, {
      clock: () => {
        ticks += 1;
        return ticks === 1 ? start : start + 210_000;
      },
    });
    assert.equal(result.ok, true);
    assert.equal(xaiCalls, 1);
    const book = await redis.get<{ companies: Company[] }>(LEADS_KEY);
    const filed = book?.companies.find((company) => company.domain === "northwind.example");
    const old = book?.companies.find((company) => company.id === "C-old");
    assert.equal(filed?.email, "ada@northwind.test");
    assert.equal(filed?.emailSource, TEAM);
    assert.ok((filed?.profileHits?.length ?? 0) > 0);
    assert.match(filed?.lineage?.query ?? "", /\|canada\|/);
    assert.equal(old?.review, "approved");
    const state = await redis.get<{ paused?: boolean }>(HUNTER_KEY);
    assert.equal(state?.paused, true);
  } finally {
    await restore(previousFetch, env);
  }
});

test("a timeout after the first pass keeps the card that was already filed", async () => {
  const redis = memoryRedis();
  const previousFetch = globalThis.fetch;
  const env = { XAI_API_KEY: process.env.XAI_API_KEY, HUNTER_KILL_SWITCH: process.env.HUNTER_KILL_SWITCH };
  delete process.env.HUNTER_KILL_SWITCH;
  process.env.XAI_API_KEY = "xai-test-key";
  install(redis);
  let xaiCalls = 0;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes("api.x.ai")) {
      xaiCalls += 1;
      if (xaiCalls > 1) {
        const error = new Error("timed out");
        error.name = "TimeoutError";
        throw error;
      }
      return Response.json(xaiBody([northwind]));
    }
    if (url === ABOUT) return new Response("Northwind Example in Calgary, Canada runs a distributed team.");
    if (url === TEAM) return new Response("Ada North, Head of People, ada@northwind.test");
    return new Response("missing", { status: 404 });
  };
  try {
    const result = await runHunterBatch(HUNT_AT);
    assert.equal(result.ok, false);
    assert.equal(xaiCalls, 4);
    const book = await redis.get<{ companies: Company[] }>(LEADS_KEY);
    assert.equal(book?.companies.some((company) => company.domain === "northwind.example" && company.email === "ada@northwind.test"), true);
  } finally {
    await restore(previousFetch, env);
  }
});

test("the nightly route and Apollo both honour do-not-contact", async () => {
  const redis = memoryRedis();
  const previousFetch = globalThis.fetch;
  const env = {
    XAI_API_KEY: process.env.XAI_API_KEY,
    APOLLO_API_KEY: process.env.APOLLO_API_KEY,
    CRON_SECRET: process.env.CRON_SECRET,
    HUNTER_KILL_SWITCH: process.env.HUNTER_KILL_SWITCH,
  };
  delete process.env.HUNTER_KILL_SWITCH;
  process.env.XAI_API_KEY = "xai-test-key";
  process.env.APOLLO_API_KEY = "apollo-test-key";
  process.env.CRON_SECRET = "cron-test-secret";
  install(redis);
  useMxLookupForTests(async (host) => (host === "northwind.test" ? [{ exchange: "mail.northwind.test" }] : []));
  await appendDoNotContact({ domain: "blocked.example", reason: "dont-contact", today: "2026-11-19" });
  const urls: string[] = [];
  globalThis.fetch = async (input) => {
    const url = String(input);
    urls.push(url);
    if (url.includes("api.x.ai")) {
      return Response.json(
        xaiBody([
          {
            org: "Blocked Co",
            domain: "blocked.example",
            city: "Calgary",
            industry: "energy",
            sizeBand: "80-800",
            sourceUrl: "https://blocked.example",
            why: "A public page.",
          },
          {
            org: "Open Co",
            domain: "open.example",
            city: "Calgary",
            industry: "energy",
            sizeBand: "80-800",
            sourceUrl: "https://open.example",
            why: "A public page.",
          },
        ]),
      );
    }
    if (url.includes("apollo.io") && url.includes("people/match")) {
      return Response.json({
        person: {
          id: "person-1",
          name: "Ada North",
          title: "Head of People",
          email: "ada@northwind.test",
          email_status: "verified",
          organization: { name: "Open Co", primary_domain: "open.example" },
        },
      });
    }
    if (url.includes("apollo.io")) {
      return Response.json({ people: [{ id: "person-1", first_name: "Ada", title: "Head of People", has_email: true }] });
    }
    if (url.startsWith("https://blocked.example") || url.startsWith("https://open.example")) return new Response("Calgary energy company.");
    return new Response("missing", { status: 404 });
  };
  try {
    const response = await runNightlyCron(new Request("https://unearth.test/api/cron/leads-scout", { headers: { authorization: "Bearer cron-test-secret" } }), NIGHT_AT);
    assert.equal(response.status, 200);
    assert.equal(urls.some((url) => url.includes("api.x.ai")), false);
    const book = await redis.get<{ companies: Company[] }>(LEADS_KEY);
    const stored = book?.companies ?? [];
    assert.equal(stored.some((company) => company.domain === "blocked.example"), false);
    assert.equal(stored.some((company) => company.domain === "open.example"), false);
    const apolloUrlsBefore = urls.filter((url) => url.includes("apollo.io")).length;
    const openCard = {
      ...oldCompany(),
      id: "C-open",
      org: "Open Co",
      domain: "open.example",
      email: "",
      buyerName: "",
      buyerTitle: "",
      emailSource: "",
      apolloCheckedOn: "",
      apolloPersonId: "",
    };
    const blockedCard = {
      ...openCard,
      id: "C-blocked",
      org: "Blocked Co",
      domain: "blocked.example",
    };
    const enriched = await enrichUnderApolloCap({
      companies: [openCard, blockedCard],
      domains: ["blocked.example", "open.example"],
      today: "2026-11-19",
      limit: 8,
    });
    const apolloUrls = urls.filter((url) => url.includes("apollo.io")).slice(apolloUrlsBefore);
    assert.equal(apolloUrls.some((url) => url.includes("blocked.example")), false);
    const open = enriched.companies.find((company) => company.domain === "open.example");
    assert.equal(open?.email, "ada@northwind.test");
    assert.equal(open?.caslStatus, "recorded");
    assert.equal(open?.casl?.provider, "Apollo");
    assert.equal(open?.casl?.publishedOn, "Apollo");
    assert.equal(open?.casl?.pulledOn, "2026-11-19");
    assert.equal(open?.emailSource, "Apollo");
    assert.equal(/^https?:\/\//i.test(open?.emailSource ?? ""), false);
    assert.equal(/^https?:\/\//i.test(open?.casl?.publishedOn ?? ""), false);
  } finally {
    useMxLookupForTests(null);
    await restore(previousFetch, env);
  }
});

test("an empty search records an alarm for the last day and posts it when the webhook is set", async () => {
  const redis = memoryRedis();
  const previousFetch = globalThis.fetch;
  const env = {
    XAI_API_KEY: process.env.XAI_API_KEY,
    HUNTER_ALARM_WEBHOOK_URL: process.env.HUNTER_ALARM_WEBHOOK_URL,
    HUNTER_KILL_SWITCH: process.env.HUNTER_KILL_SWITCH,
  };
  delete process.env.HUNTER_KILL_SWITCH;
  process.env.XAI_API_KEY = "xai-test-key";
  process.env.HUNTER_ALARM_WEBHOOK_URL = "https://hooks.example/hunter";
  install(redis);
  const posted: string[] = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.includes("hooks.example")) {
      posted.push(String(init?.body ?? ""));
      return new Response("ok");
    }
    if (url.includes("api.x.ai")) return Response.json(xaiBody([]));
    return new Response("missing", { status: 404 });
  };
  let ticks = 0;
  const start = HUNT_AT.getTime();
  try {
    await runHunterBatch(HUNT_AT, {
      clock: () => {
        ticks += 1;
        return ticks === 1 ? start : start + 210_000;
      },
    });
    assert.equal(posted.length, 1);
    assert.match(posted[0] ?? "", /Zero candidates/);
    const desk = await readHunterDesk("2026-11-19", HUNT_AT);
    assert.equal(desk.alarms.some((alarm) => alarm.includes("Zero candidates")), true);
  } finally {
    await restore(previousFetch, env);
  }
});

test("a permanent reason replaces Skip or Lost, including a card with no email", async () => {
  const redis = memoryRedis();
  install(redis);
  try {
    await appendDoNotContact({ domain: "skip.example", reason: "skipped", today: "2026-11-01" });
    const skipped = await appendDoNotContact({ domain: "skip.example", reason: "dont-contact", today: "2026-11-19" });
    assert.equal(skipped.find((entry) => entry.domain === "skip.example")?.until, "never");
    assert.equal(skipped.find((entry) => entry.domain === "skip.example")?.reason, "dont-contact");
    await appendDoNotContact({ domain: "lost.example", email: "ada@lost.example", reason: "lost", today: "2026-11-01" });
    const unsubscribed = await appendDoNotContact({
      domain: "lost.example",
      email: "ada@lost.example",
      reason: "unsubscribe",
      today: "2026-11-19",
    });
    const lost = unsubscribed.find((entry) => entry.email === "ada@lost.example");
    assert.equal(lost?.reason, "unsubscribe");
    assert.equal(lost?.until, "never");
    await appendDoNotContact({ domain: "blank.example", email: "ada@blank.example", reason: "skipped", today: "2026-11-01" });
    const noEmail = await appendDoNotContact({ domain: "blank.example", reason: "dont-contact", today: "2026-11-19" });
    assert.equal(noEmail.some((entry) => entry.domain === "blank.example" && entry.email === "" && entry.until === "never"), true);
  } finally {
    await restore(globalThis.fetch, {});
  }
});

test("forty-eight company rows with no named person do not stop the day", async () => {
  const redis = memoryRedis();
  const previousFetch = globalThis.fetch;
  const env = {
    XAI_API_KEY: process.env.XAI_API_KEY,
    HUNTER_KILL_SWITCH: process.env.HUNTER_KILL_SWITCH,
    APOLLO_API_KEY: process.env.APOLLO_API_KEY,
  };
  delete process.env.HUNTER_KILL_SWITCH;
  delete process.env.APOLLO_API_KEY;
  process.env.XAI_API_KEY = "xai-test-key";
  install(redis);
  const today = edmontonToday(HUNT_AT);
  const shells = Array.from({ length: 48 }, (_, index) => ({
    ...oldCompany(),
    id: `C-shell-${index}`,
    org: `Shell ${index}`,
    domain: `shell-${index}.example`,
    filedOn: today,
    buyerName: "",
    buyerTitle: "",
    email: "",
    emailSource: "",
  }));
  await redis.set(LEADS_KEY, { ...emptyBook(), companies: shells });
  let xaiCalls = 0;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes("api.x.ai")) {
      xaiCalls += 1;
      return Response.json(xaiBody([]));
    }
    return new Response("missing", { status: 404 });
  };
  try {
    const result = await runHunterBatch(HUNT_AT, { clock: () => HUNT_AT.getTime() });
    assert.equal(result.ok, true);
    assert.equal("skipped" in result ? result.skipped : "", "");
    assert.equal(xaiCalls > 0, true);
  } finally {
    await restore(previousFetch, env);
  }
});

test("the next run alarms when a previous run started and never finished", async () => {
  const redis = memoryRedis();
  const previousFetch = globalThis.fetch;
  const env = { XAI_API_KEY: process.env.XAI_API_KEY, HUNTER_KILL_SWITCH: process.env.HUNTER_KILL_SWITCH };
  delete process.env.HUNTER_KILL_SWITCH;
  process.env.XAI_API_KEY = "xai-test-key";
  install(redis);
  await redis.set(HUNTER_RUN_OPEN_KEY, JSON.stringify({ run: "always-on", id: "old-run", at: "2026-11-19T12:00:00.000Z" }));
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.includes("api.x.ai")) return Response.json(xaiBody([]));
    return new Response("missing", { status: 404 });
  };
  try {
    await runHunterBatch(HUNT_AT, { clock: () => HUNT_AT.getTime() });
    const stored = await redis.lrange(HUNTER_ALARM_KEY, 0, 10);
    assert.match(JSON.stringify(stored), /never finished/);
    assert.equal(await redis.get(HUNTER_RUN_OPEN_KEY), null);
  } finally {
    await restore(previousFetch, env);
  }
});

test("a stage change can write do-not-contact when that key is already a hash", async () => {
  const values = new Map<string, unknown>();
  const hashes = new Map<string, Record<string, string>>();
  const redis = {
    async get<T>(key: string): Promise<T | null> {
      if (hashes.has(key)) throw new Error("WRONGTYPE Operation against a key holding the wrong kind of value");
      return values.has(key) ? (values.get(key) as T) : null;
    },
    async set(key: string, value: unknown) {
      values.set(key, value);
      return "OK";
    },
    async del(key: string) {
      values.delete(key);
      hashes.delete(key);
      return 1;
    },
    async hgetall(key: string) {
      return hashes.get(key) ?? {};
    },
    async hset(key: string, field: Record<string, string>) {
      const hash = hashes.get(key) ?? {};
      Object.assign(hash, field);
      hashes.set(key, hash);
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
  };
  hashes.set(HUNTER_DNC_KEY, {
    "kept.example|": JSON.stringify({
      domain: "kept.example",
      email: "",
      reason: "unsubscribe",
      addedOn: "2026-11-01",
      until: "never",
    }),
  });
  useRedisClientForTests(redis as never);
  try {
    const saved = await appendDoNotContact({
      domain: "centricsoftware.com",
      email: "nn.srinivas@centricsoftware.com",
      reason: "lost",
      today: "2026-11-25",
    });
    assert.equal(saved.some((entry) => entry.domain === "centricsoftware.com" && entry.reason === "lost"), true);
    assert.equal(saved.some((entry) => entry.domain === "kept.example"), true);
    assert.equal(hashes.has(HUNTER_DNC_KEY), true);
    assert.equal(values.has(HUNTER_DNC_KEY), false);
  } finally {
    useRedisClientForTests(null);
  }
});
