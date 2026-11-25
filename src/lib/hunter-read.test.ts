import assert from "node:assert/strict";
import test from "node:test";
import { edmontonToday } from "./lead-score.ts";
import { LEADS_KEY, emptyBook, useRedisClientForTests } from "./leads-book.ts";
import { HUNTER_KEY } from "./leads-hunter.ts";
import { HUNTER_CAMPAIGN_KEY, freshCampaign } from "./hunter-campaign.ts";
import { HUNTER_RUNS_KEY } from "./hunter-runs.ts";
import { handleHunterSegment } from "./hunter-segment.ts";
import {
  dateInRange,
  edmontonWeekRanges,
  handleHunterRead,
  hunterReadAuthorized,
  segmentIdFromQuery,
  tallyOutcomeCards,
  tallyRunWindow,
} from "./hunter-read.ts";
import type { Company } from "./lead-score.ts";

function memoryRedis() {
  const values = new Map<string, unknown>();
  const lists = new Map<string, unknown[]>();
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
    async lrange(key: string) {
      return lists.get(key) ?? [];
    },
    lists,
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
      today: { calls: number; cardsFiled: number; cardsFiledToday: number; contactReadyToday: number; spendActual: number; spendEstimated: number };
      runs: unknown[];
      cards: { org: string; status: string; score: number | null; email?: string; contactStatus?: string }[];
    };
    assert.equal(body.paused, true);
    assert.equal(body.today.calls, 2);
    assert.equal(body.today.cardsFiled, 1);
    assert.equal(body.today.cardsFiledToday, 1);
    assert.equal(body.today.contactReadyToday, 1);
    assert.equal(body.cards[0]?.contactStatus, "no-contact");
    assert.equal("email" in (body.cards[0] ?? {}), false);
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

test("Edmonton weeks run Monday to Sunday", () => {
  const tuesday = edmontonWeekRanges("2026-11-24");
  assert.equal(tuesday.weekStart, "2026-11-23");
  assert.deepEqual(tuesday.weekToDate, { start: "2026-11-23", end: "2026-11-24" });
  assert.deepEqual(tuesday.lastWeek, { start: "2026-11-16", end: "2026-11-22" });
  const monday = edmontonWeekRanges("2026-11-23");
  assert.deepEqual(monday.weekToDate, { start: "2026-11-23", end: "2026-11-23" });
  assert.equal(dateInRange("2026-11-22", monday.lastWeek.start, monday.lastWeek.end), true);
  assert.equal(dateInRange("2026-11-23", monday.lastWeek.start, monday.lastWeek.end), false);
  assert.equal(segmentIdFromQuery("campaign:energy|city:calgary"), "energy");
  assert.equal(segmentIdFromQuery("technology"), "");
});

test("weekly totals count cards, contact-ready names, and Edmonton run spend", () => {
  const ranges = edmontonWeekRanges("2026-11-24");
  const cards = [
    {
      org: "Range Co",
      domain: "range.example",
      filedOn: "2026-11-24",
      industry: "energy",
      buyerName: "Ada North",
      buyerTitle: "People lead",
      email: "ada@range.example",
      review: "approved",
      pipeline: "booked",
      lineage: { query: "campaign:energy" },
    },
    {
      org: "Peak Civic",
      domain: "peak.example",
      filedOn: "2026-11-18",
      industry: "healthcare",
      buyerName: "",
      buyerTitle: "Director",
      email: "skip@peak.example",
      review: "skipped",
      pipeline: "lost",
      lineage: { query: "campaign:healthcare" },
    },
    {
      org: "Old Mill",
      domain: "oldmill.example",
      filedOn: "2026-11-01",
      industry: "tech",
      review: "expired-unreviewed",
      lineage: { query: "campaign:tech" },
    },
  ] as Company[];
  const week = tallyOutcomeCards(cards, ranges.weekToDate.start, ranges.weekToDate.end);
  assert.equal(week.counts.cardsFiled, 1);
  assert.equal(week.counts.contactReady, 1);
  assert.equal(week.counts.reviewed.approved, 1);
  assert.equal(week.counts.sent, 1);
  assert.equal(week.counts.replied, 1);
  assert.equal(week.counts.booked, 1);
  assert.equal(week.cards[0]?.segment, "energy");
  assert.equal(week.cards[0]?.industry, "energy");
  assert.equal(week.cards[0]?.contactReady, true);
  assert.equal("email" in (week.cards[0] ?? {}), false);
  const last = tallyOutcomeCards(cards, ranges.lastWeek.start, ranges.lastWeek.end);
  assert.equal(last.counts.cardsFiled, 1);
  assert.equal(last.counts.contactReady, 0);
  assert.equal(last.counts.reviewed.skipped, 1);
  assert.equal(last.counts.lost, 1);
  assert.equal(last.bySegment[0]?.id, "healthcare");
  assert.equal(last.bySector[0]?.id, "healthcare");
  const at = "2026-11-24T18:00:00.000Z";
  const day = edmontonToday(new Date(at));
  const window = edmontonWeekRanges(day);
  const runs = tallyRunWindow([{ at, apolloReveals: 3, dollars: 0.125 }], window.weekToDate.start, window.weekToDate.end);
  assert.equal(runs.apolloEmailLookups, 3);
  assert.equal(runs.xaiSpend, 0.125);
  const earlier = tallyRunWindow([{ at, apolloReveals: 3, dollars: 0.125 }], window.lastWeek.start, window.lastWeek.end);
  assert.equal(earlier.apolloEmailLookups, 0);
  assert.equal(earlier.xaiSpend, 0);
});

test("GET /api/hunter/read?view=weekly returns the Monday plan without emails", async () => {
  const previous = process.env.HUNTER_READ_TOKEN;
  const redis = memoryRedis();
  const today = edmontonToday();
  const ranges = edmontonWeekRanges(today);
  await redis.set(HUNTER_KEY, { paused: false, callsOn: today, callsToday: 0, filedOn: today, filedToday: 0 });
  await redis.set(HUNTER_CAMPAIGN_KEY, JSON.stringify({ ...freshCampaign("2026-11-16"), seenIds: ["org-1", "org-2"] }));
  await redis.set(LEADS_KEY, {
    ...emptyBook(),
    companies: [
      {
        id: "C-week",
        org: "Range Co",
        domain: "range.example",
        source: "hunter",
        filedOn: today,
        industry: "energy",
        buyerName: "Ada North",
        buyerTitle: "People lead",
        email: "ada@range.example",
        review: "unreviewed",
        lineage: { method: "apollo-campaign", query: "campaign:energy" },
      },
    ],
  });
  redis.lists.set(HUNTER_RUNS_KEY, [
    {
      at: `${today}T18:00:00.000Z`,
      run: "always-on",
      outcome: "fired",
      modelCalls: 1,
      candidates: 1,
      cardsFiled: 1,
      contactReady: 1,
      apolloSearches: 1,
      apolloReveals: 1,
      error: "",
      dollars: 0.2,
    },
  ]);
  useRedisClientForTests(redis);
  process.env.HUNTER_READ_TOKEN = "read-token-test";
  try {
    const denied = await handleHunterRead(new Request("https://unearthself.example/api/hunter/read?view=weekly"));
    assert.equal(denied.status, 401);
    const ok = await handleHunterRead(
      new Request("https://unearthself.example/api/hunter/read?view=weekly", {
        headers: { authorization: "Bearer read-token-test" },
      }),
    );
    assert.equal(ok.status, 200);
    const body = (await ok.json()) as {
      today: { date: string; cardsFiledToday: number; contactReadyToday: number };
      weekStart: string;
      previousWeek: { start: string; end: string };
      campaign: {
        segmentId: string;
        source: string;
        seenCount: number;
        split: { canada: number; us: number };
        splitReason: string;
        nextPage: { cities: number; canada: number; us: number };
        exhausted: { cities: boolean; canada: boolean; us: boolean };
      };
      weekToDate: { cardsFiled: number; contactReady: number; apolloEmailLookups: number; xaiSpend: number; reviewed: { unreviewed: number } };
      lastWeek: { cardsFiled: number };
      bySegment: { weekToDate: { id: string }[] };
      bySector: { weekToDate: { id: string }[] };
      methods: { method: string; filed: number }[];
      cards: { segment: string; industry: string; contactReady: boolean; email?: string }[];
    };
    assert.equal(body.today.date, today);
    assert.equal(typeof body.today.cardsFiledToday, "number");
    assert.equal(typeof body.today.contactReadyToday, "number");
    assert.equal(body.weekStart, ranges.weekStart);
    assert.deepEqual(body.previousWeek, ranges.lastWeek);
    assert.equal(body.campaign.segmentId, "tech");
    assert.equal(body.campaign.source, "Build");
    assert.equal(body.campaign.seenCount, 2);
    assert.equal(body.campaign.split.canada, 85);
    assert.equal(body.campaign.splitReason, "Canada tilt approved by Christopher 24 Nov");
    assert.equal(body.campaign.nextPage.cities, 1);
    assert.deepEqual(body.campaign.exhausted, { cities: false, canada: false, us: false });
    assert.equal(body.weekToDate.cardsFiled, 1);
    assert.equal(body.weekToDate.contactReady, 1);
    assert.equal(body.weekToDate.reviewed.unreviewed, 1);
    assert.equal(body.weekToDate.apolloEmailLookups, 1);
    assert.equal(body.weekToDate.xaiSpend, 0.2);
    assert.equal(body.lastWeek.cardsFiled, 0);
    assert.equal(body.bySegment.weekToDate[0]?.id, "energy");
    assert.equal(body.bySector.weekToDate[0]?.id, "energy");
    assert.equal(body.cards[0]?.segment, "energy");
    assert.equal(body.cards[0]?.contactReady, true);
    assert.equal(body.cards[0]?.email, undefined);
    assert.equal(body.methods.find((method) => method.method === "apollo-campaign")?.filed, 1);
    const text = JSON.stringify(body);
    assert.equal(text.includes("ada@range.example"), false);
    assert.equal(text.includes("read-token-test"), false);
    assert.equal(text.includes("Ada North"), false);
  } finally {
    useRedisClientForTests(null);
    if (previous == null) delete process.env.HUNTER_READ_TOKEN;
    else process.env.HUNTER_READ_TOKEN = previous;
  }
});

test("POST /api/hunter/segment requires the write token, a real segment, and a reason", async () => {
  const previous = process.env.HUNTER_WRITE_TOKEN;
  const redis = memoryRedis();
  const today = edmontonToday();
  await redis.set(HUNTER_CAMPAIGN_KEY, JSON.stringify(freshCampaign(today)));
  useRedisClientForTests(redis);
  const write = "hunter-write-token-0123456789abcd";
  const logs: string[] = [];
  const original = console.info;
  console.info = (line?: unknown) => {
    logs.push(String(line ?? ""));
  };
  const post = (body: unknown, token = write) =>
    handleHunterSegment(
      new Request("https://unearthself.example/api/hunter/segment", {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify(body),
      }),
      new Date(`${today}T18:30:00.000Z`),
    );
  try {
    delete process.env.HUNTER_WRITE_TOKEN;
    assert.equal((await post({ segmentId: "energy", reason: "Energy replies converted more often than technology." })).status, 401);
    process.env.HUNTER_WRITE_TOKEN = write;
    assert.equal((await post({ segmentId: "energy", reason: "Energy replies converted more often than technology." }, "wrong-token-0123456789abcdef")).status, 401);
    const get = await handleHunterSegment(new Request("https://unearthself.example/api/hunter/segment", { headers: { authorization: `Bearer ${write}` } }));
    assert.equal(get.status, 405);
    const badSegment = await post({ segmentId: "sales", reason: "Energy replies converted more often than technology." });
    assert.equal(badSegment.status, 400);
    assert.equal(((await badSegment.json()) as { field: string }).field, "segmentId");
    const short = await post({ segmentId: "energy", reason: "short" });
    assert.equal(short.status, 400);
    assert.equal(((await short.json()) as { field: string }).field, "reason");
    const ok = await post({ segmentId: "energy", reason: "Energy replies converted more often than technology." });
    assert.equal(ok.status, 200);
    const body = (await ok.json()) as { switched: boolean; from: string; to: string; source: string; reason: string };
    assert.equal(body.switched, true);
    assert.equal(body.from, "tech");
    assert.equal(body.to, "energy");
    assert.equal(body.source, "Hunter's choice");
    assert.match(body.reason, /Energy replies converted/);
    const saved = JSON.parse(String(await redis.get(HUNTER_CAMPAIGN_KEY))) as {
      segmentId: string;
      segmentSource: string;
      switches: { from: string; to: string; reason: string; at: string }[];
      planNote: string;
      weights: { funding: number };
    };
    assert.equal(saved.segmentId, "energy");
    assert.equal(saved.segmentSource, "hunter");
    assert.equal(saved.switches.length, 1);
    assert.equal(saved.switches[0]?.from, "tech");
    assert.equal(saved.switches[0]?.to, "energy");
    assert.match(saved.planNote, /from tech to energy/);
    assert.equal(saved.weights.funding, freshCampaign(today).weights.funding);
    assert.match(logs.join("\n"), /segment-switch/);
    assert.match(logs.join("\n"), /"from":"tech"/);
    assert.match(logs.join("\n"), /"to":"energy"/);
    assert.equal(logs.join("\n").includes(write), false);
    const again = await post({ segmentId: "energy", reason: "Energy replies converted more often than technology." });
    const repeat = (await again.json()) as { switched: boolean };
    assert.equal(repeat.switched, false);
    const kept = JSON.parse(String(await redis.get(HUNTER_CAMPAIGN_KEY))) as { switches: unknown[] };
    assert.equal(kept.switches.length, 1);
  } finally {
    console.info = original;
    useRedisClientForTests(null);
    if (previous == null) delete process.env.HUNTER_WRITE_TOKEN;
    else process.env.HUNTER_WRITE_TOKEN = previous;
  }
});
