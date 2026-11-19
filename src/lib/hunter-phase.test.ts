import assert from "node:assert/strict";
import test from "node:test";
import { classifyApolloReveal, classifyApolloSearch } from "./apollo.ts";
import { dryRunFixtures } from "./hunter-dry-run.ts";
import {
  HUNTER_CALLS_PER_RUN_DEFAULT,
  HUNTER_LOCK_TTL_SECONDS,
  HUNTER_MODEL_ID,
  HUNTER_QUALITY_FLOOR_DEFAULT,
  HUNTER_RESET_KEYS,
  callsAvailablePerDay,
  hunterDailyFiledCap,
  hunterKilled,
  hunterMonthlyDollarCap,
  runsPerWorkingDay,
} from "./hunter-config.ts";
import { acquireHunterLock, lockCanOverlap, releaseHunterLock } from "./hunter-lock.ts";
import {
  HUNTER_KNOWN_BAD,
  HUNTER_KNOWN_GOOD,
  HUNTER_LIVE_LIST,
  addDrop,
  alarmWebhookTargets,
  applyReviewExpiry,
  belowMedianAlarm,
  bookedThisMonth,
  cardDedupeKey,
  caslBasis,
  classifyPageResponse,
  dailyFileRoom,
  deliverAlarmWebhooks,
  dncBlocks,
  checkEmailMx,
  doNotContactKey,
  emailDomainHasMx,
  emptyFunnel,
  heartbeatLate,
  isDuplicateCard,
  makeDncEntry,
  pageShowsMovedOn,
  methodStats,
  monthlyCapLabel,
  monthlyCapState,
  quoteSnippet,
  readModelUsage,
  reserveCounter,
  resetMayTouch,
  retryDelayMs,
  shouldAbandon,
  zeroCandidateAlarm,
} from "./hunter-phase.ts";
import { isContactReady } from "./hunter-cap.ts";
import { draftDropReason, fileHunterCards, verifyHunterDrafts } from "./leads-hunter.ts";
import { edmontonClock, nightlyDue, nightlySkip, withinWorkingHours } from "./hunter-time.ts";
import { HUNTER_SEARCH_MODEL, parseXaiSearchResponse, searchWithRetries, xaiDeprecationSignal } from "./xai-search.ts";

test("the old lock can overlap a slow run and the new lock cannot", () => {
  assert.equal(lockCanOverlap(120), true);
  assert.equal(lockCanOverlap(HUNTER_LOCK_TTL_SECONDS), false);
  assert.ok(HUNTER_LOCK_TTL_SECONDS > 300);
});

test("the lock is taken only when absent and released only by the holder", async () => {
  let stored: string | null = null;
  const client = {
    set: async (_key: string, value: string, opts: { nx: true; ex: number }) => {
      assert.equal(opts.nx, true);
      assert.ok(opts.ex > 300);
      if (stored) return null;
      stored = value;
      return "OK";
    },
    eval: async (_script: string, _keys: string[], args: string[]) => {
      if (stored !== args[0]) return 0;
      stored = null;
      return 1;
    },
  };
  assert.equal(await acquireHunterLock(client, "holder"), true);
  assert.equal(await acquireHunterLock(client, "other"), false);
  assert.equal(await releaseHunterLock(client, "other"), false);
  assert.equal(stored, "holder");
  assert.equal(await releaseHunterLock(client, "holder"), true);
  assert.equal(stored, null);
});

test("working hours stay on the Edmonton clock through daylight saving", () => {
  const winterOpen = new Date("2026-01-15T14:00:00.000Z");
  const winterBefore = new Date("2026-01-15T13:59:00.000Z");
  const summerOpen = new Date("2026-07-15T13:00:00.000Z");
  const summerBefore = new Date("2026-07-15T12:59:00.000Z");
  assert.equal(edmontonClock(winterOpen).hour, 7);
  assert.equal(edmontonClock(winterBefore).hour, 6);
  assert.equal(edmontonClock(summerOpen).hour, 7);
  assert.equal(edmontonClock(summerBefore).hour, 6);
  assert.equal(withinWorkingHours(winterOpen, 7, 19), true);
  assert.equal(withinWorkingHours(winterBefore, 7, 19), false);
  assert.equal(withinWorkingHours(summerOpen, 7, 19), true);
  assert.equal(withinWorkingHours(summerBefore, 7, 19), false);
  assert.equal(withinWorkingHours(new Date("2026-01-15T02:00:00.000Z"), 7, 19), false);
});

test("the nightly sweep runs at 4am Edmonton once, in both standard time and daylight time", () => {
  const winterDue = new Date("2026-01-15T11:00:00.000Z");
  const winterEarly = new Date("2026-01-15T10:00:00.000Z");
  const summerDue = new Date("2026-07-15T10:00:00.000Z");
  const summerLate = new Date("2026-07-15T11:00:00.000Z");
  assert.equal(edmontonClock(winterDue).hour, 4);
  assert.equal(edmontonClock(summerDue).hour, 4);
  assert.equal(nightlyDue(winterDue, ""), true);
  assert.equal(nightlyDue(summerDue, ""), true);
  assert.equal(nightlySkip(winterEarly, ""), "not-4am");
  assert.equal(nightlySkip(summerLate, ""), "not-4am");
  assert.equal(nightlySkip(winterDue, "2026-01-15"), "already-swept");
  assert.equal(nightlyDue(winterDue, "2026-01-15"), false);
});

test("a 30 minute working day can reach the 55 call budget", () => {
  assert.equal(runsPerWorkingDay(7, 19), 24);
  assert.equal(HUNTER_CALLS_PER_RUN_DEFAULT, 3);
  assert.equal(callsAvailablePerDay(HUNTER_CALLS_PER_RUN_DEFAULT, 7, 19), 72);
  assert.ok(callsAvailablePerDay(HUNTER_CALLS_PER_RUN_DEFAULT, 7, 19) >= 55);
});

test("an xAI error, a deprecation, or a missing search is not zero results", () => {
  assert.equal(xaiDeprecationSignal(410, new Headers(), ""), true);
  assert.equal(xaiDeprecationSignal(200, new Headers({ deprecation: "true" }), ""), true);
  assert.equal(xaiDeprecationSignal(200, new Headers(), "this company is not deprecated"), false);
  const emptySearch = parseXaiSearchResponse({
    output: [
      { type: "web_search_call", status: "completed" },
      { type: "message", content: [{ type: "output_text", text: '{ "companies": [] }' }] },
    ],
  });
  assert.equal("error" in emptySearch, false);
  if (!("error" in emptySearch)) assert.equal(emptySearch.companies && Array.isArray(emptySearch.companies) ? emptySearch.companies.length : -1, 0);
  const noSearch = parseXaiSearchResponse({
    output: [{ type: "message", content: [{ type: "output_text", text: '{ "companies": [] }' }] }],
  });
  assert.equal("error" in noSearch, true);
  const badShape = parseXaiSearchResponse({ output: [] });
  assert.equal("error" in badShape, true);
});

test("dollars are recorded only when the response names them", () => {
  const ticks = readModelUsage({ usage: { input_tokens: 10, output_tokens: 4, cost_in_usd: 0.02, cost_in_usd_ticks: 37756000 } });
  assert.equal(ticks.dollars, 37756000 / 10_000_000_000);
  assert.equal(ticks.inputTokens, 10);
  assert.equal(ticks.outputTokens, 4);
  const named = readModelUsage({ usage: { cost_in_usd: 0.02 } });
  assert.equal(named.dollars, 0.02);
  const unnamed = readModelUsage({ usage: { prompt_tokens: 3, completion_tokens: 1 } });
  assert.equal(unnamed.dollars, null);
  assert.equal(unnamed.inputTokens, 3);
  assert.equal(monthlyCapLabel(monthlyCapState(null, null)), "no cap set");
  assert.equal(hunterMonthlyDollarCap(""), 60);
  assert.equal(monthlyCapState(60), "stop");
  assert.equal(monthlyCapState(47), "ok");
  assert.equal(monthlyCapState(48), "warn");
  assert.equal(monthlyCapState(8, 10), "warn");
  assert.equal(monthlyCapState(10, 10), "stop");
  assert.equal(monthlyCapState(null, 10), "unknown");
  assert.equal(hunterKilled(""), false);
  assert.equal(hunterKilled("on"), true);
  assert.equal(HUNTER_MODEL_ID, HUNTER_SEARCH_MODEL);
  assert.equal(HUNTER_MODEL_ID, "grok-4.20-0309-non-reasoning");
});

test("retries back off and then abandon the run", async () => {
  assert.equal(retryDelayMs(1, () => 0), 400);
  assert.equal(retryDelayMs(2, () => 0), 800);
  assert.equal(shouldAbandon(2, 2), false);
  assert.equal(shouldAbandon(3, 2), true);
  const original = globalThis.fetch;
  const previousKey = process.env.XAI_API_KEY;
  process.env.XAI_API_KEY = "xai-test-key";
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response("down", { status: 503 });
  };
  try {
    const slept: number[] = [];
    const failed = await searchWithRetries({
      system: "s",
      prompt: "p",
      timeoutMs: 1000,
      maxRetries: 2,
      beforeAttempt: async () => ({ allowed: true }),
      sleep: async (ms) => {
        slept.push(ms);
      },
    });
    assert.equal("error" in failed, true);
    if ("error" in failed) assert.equal(failed.abandoned, true);
    assert.equal(calls, 3);
    assert.equal(slept.length, 2);
    calls = 0;
    const blocked = await searchWithRetries({
      system: "s",
      prompt: "p",
      timeoutMs: 1000,
      maxRetries: 2,
      beforeAttempt: async () => ({ allowed: false }),
      sleep: async () => {
        throw new Error("should not sleep");
      },
    });
    assert.equal(calls, 0);
    if ("error" in blocked) assert.match(blocked.error, /budget/);
    calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      return new Response("no", { status: 401 });
    };
    const denied = await searchWithRetries({
      system: "s",
      prompt: "p",
      timeoutMs: 1000,
      maxRetries: 2,
      beforeAttempt: async () => ({ allowed: true }),
      sleep: async () => {
        throw new Error("should not sleep");
      },
    });
    assert.equal(calls, 1);
    if ("error" in denied) assert.equal(denied.abandoned, true);
  } finally {
    globalThis.fetch = original;
    if (previousKey == null) delete process.env.XAI_API_KEY;
    else process.env.XAI_API_KEY = previousKey;
  }
});

test("Apollo treats an error shape as a failure and an empty people list as zero results", () => {
  assert.deepEqual(classifyApolloSearch(200, { people: [] }, new Headers()), { empty: true });
  const bad = classifyApolloSearch(200, { error: "no" }, new Headers());
  assert.equal("failure" in bad, true);
  const gone = classifyApolloSearch(410, { people: [] }, new Headers());
  assert.equal("failure" in gone, true);
  const warned = classifyApolloReveal(200, { person: null }, new Headers({ warning: "299 - deprecated endpoint" }));
  assert.equal("failure" in warned, true);
  assert.deepEqual(classifyApolloReveal(200, { person: { id: "p" } }, new Headers()), { empty: false });
});

test("counters stop at the cap and give the count back", async () => {
  let value = 48;
  const client = {
    incr: async () => {
      value += 1;
      return value;
    },
    decr: async () => {
      value -= 1;
      return value;
    },
  };
  const reserved = await reserveCounter(client, "unearth:hunter:calls:v1:2026-11-19", 48);
  assert.equal(reserved.allowed, false);
  assert.equal(value, 48);
});

test("alarms separate a broken run from a quiet one, and a late heartbeat", () => {
  assert.equal(zeroCandidateAlarm(0, false), true);
  assert.equal(zeroCandidateAlarm(0, true), false);
  assert.equal(zeroCandidateAlarm(2, false), false);
  assert.equal(belowMedianAlarm(1, [4, 4, 4, 4]), true);
  assert.equal(belowMedianAlarm(3, [4, 4, 4, 4]), false);
  assert.equal(belowMedianAlarm(0, []), false);
  assert.equal(belowMedianAlarm(0, [0, 0]), false);
  const late = heartbeatLate("2026-11-19T15:00:00.000Z", new Date("2026-11-19T16:00:00.000Z"), true);
  assert.equal(late.late, true);
  const fresh = heartbeatLate("2026-11-19T15:50:00.000Z", new Date("2026-11-19T16:00:00.000Z"), true);
  assert.equal(fresh.late, false);
});

test("dedupe, do-not-contact, and a book reset stay apart", () => {
  assert.equal(cardDedupeKey("WWW.Northwind.Example", "Ada@Northwind.Example"), "northwind.example|ada@northwind.example");
  assert.equal(
    isDuplicateCard([{ domain: "WWW.Northwind.Example", email: "Ada@Northwind.Example" }], "northwind.example", "ada@northwind.example"),
    true,
  );
  const entry = makeDncEntry({ domain: "lost.example", reason: "lost", today: "2026-11-19", cooldownDays: 90 });
  assert.equal(dncBlocks([entry], "lost.example", "a@lost.example", "2026-11-19"), true);
  assert.equal(dncBlocks([entry], "lost.example", "a@lost.example", "2027-03-01"), false);
  const unsub = makeDncEntry({ domain: "stop.example", email: "a@stop.example", reason: "unsubscribe", today: "2026-11-19" });
  assert.equal(unsub.until, "never");
  assert.equal(dncBlocks([unsub], "stop.example", "a@stop.example", "2099-01-01"), true);
  const asked = makeDncEntry({ domain: "stop.example", reason: "dont-contact", today: "2026-11-19" });
  assert.equal(dncBlocks([asked], "stop.example", "", "2099-01-01"), true);
  assert.equal(dncBlocks([entry], "other.example", "", "2026-11-19"), false);
  assert.equal(resetMayTouch(doNotContactKey()), false);
  assert.equal(HUNTER_RESET_KEYS.includes("unearth:hunter:dnc:v1" as "unearth:leads:v1"), false);
  assert.equal(resetMayTouch("unearth:leads:v1"), true);
});

test("drop reasons, the quality floor, and the fixture dry run", () => {
  const draft = {
    domain: "empty.example",
    org: "Empty Example",
    place: "Berlin",
    industry: "other",
    sizeBand: "",
    sourceUrl: "https://other.example/about",
    signals: [],
    profileSignals: [],
    buyer: { name: "", title: "", email: "", emailSource: "" },
  };
  assert.equal(draftDropReason(draft, "", "anywhere", "timed-out"), "timed-out");
  assert.equal(draftDropReason(draft, "", "anywhere", "ok"), "page-empty");
  assert.equal(draftDropReason(draft, "Someone else", "anywhere", "ok"), "name-missing");
  assert.equal(draftDropReason({ ...draft, sourceUrl: "https://other.example" }, "Empty Example", "anywhere", "ok"), "domain-mismatch");
  assert.equal(classifyPageResponse(403, "no", false).reason, "blocked");
  assert.equal(classifyPageResponse(200, "  ", false).reason, "page-empty");
  assert.equal(classifyPageResponse(200, "hello", true).reason, "timed-out");

  const source = "https://weak.example/about";
  const cards = verifyHunterDrafts(
    [
      {
        ...draft,
        domain: "weak.example",
        org: "Weak Example",
        place: "",
        sourceUrl: source,
      },
    ],
    { [source]: "Weak Example sells paper." },
    { regionId: "anywhere", today: "2026-11-19" },
  );
  assert.equal(cards.length, 1);
  assert.ok((cards[0]?.hunterScore ?? 100) < HUNTER_QUALITY_FLOOR_DEFAULT);
  const dropped = fileHunterCards([], cards, { today: "2026-11-19" });
  assert.equal(dropped.filed, 0);
  assert.equal(dropped.drops["below-quality-floor"], 1);
  const kept = fileHunterCards([], cards, { today: "2026-11-19", floor: 0 });
  assert.equal(kept.filed, 0);
  const withHit = cards.map((card) => ({
    ...card,
    profileHits: [{ id: "outdoor", label: "Outdoor", sourceUrl: card.sourceUrl }],
  }));
  const filedThin = fileHunterCards([], withHit, { today: "2026-11-19", floor: 0 });
  assert.equal(filedThin.filed, 1);

  const blocked = fileHunterCards(kept.companies, cards, {
    today: "2026-11-19",
    floor: 0,
    dnc: [makeDncEntry({ domain: "weak.example", reason: "skipped", today: "2026-11-19", cooldownDays: 90 })],
  });
  assert.equal(blocked.drops["do-not-contact"], 1);
  assert.equal(blocked.filed, 0);

  const funnel = dryRunFixtures(HUNTER_QUALITY_FLOOR_DEFAULT);
  assert.equal(HUNTER_LIVE_LIST.length, 0);
  assert.equal(HUNTER_KNOWN_GOOD[0]?.expect, "file");
  assert.equal(HUNTER_KNOWN_BAD.length, 2);
  assert.equal(funnel.filed, 1);
  assert.equal(funnel.drops["page-empty"], 1);
  assert.equal(funnel.drops["below-quality-floor"], 1);
  assert.deepEqual(funnel.held, ["empty.example"]);
  const counted = emptyFunnel();
  addDrop(counted, "no-mx");
  assert.equal(counted.drops["no-mx"], 1);
});

test("facts, CASL, and MX stay on the card without probing a mailbox", async () => {
  const page = "Northwind Example. Ada North, Head of People, ada@northwind.example.";
  const basis = caslBasis(page, "ada@northwind.example", "Head of People", "https://northwind.example/about");
  assert.equal(basis?.roleFit, true);
  assert.equal(basis?.noUnsolicitedNotice, true);
  assert.equal(basis?.publishedOn, "https://northwind.example/about");
  const refused = caslBasis(`${page} Please do not email us.`, "ada@northwind.example", "Head of People", "https://northwind.example/about");
  assert.equal(refused?.noUnsolicitedNotice, false);
  assert.match(quoteSnippet(page, "Ada North"), /Ada North/);
  let looked = 0;
  const fixture = await emailDomainHasMx("ada@northwind.example", async () => {
    looked += 1;
    return [{ exchange: "mail.northwind.example" }];
  });
  assert.equal(fixture, false);
  assert.equal(looked, 0);
  const live = await emailDomainHasMx("ada@northwind.test", async () => [{ exchange: "mail.northwind.test" }]);
  assert.equal(live, true);
  const unknown = await checkEmailMx("ada@northwind.test", async () => {
    const error = new Error("timed out");
    (error as { code?: string }).code = "ETIMEOUT";
    throw error;
  });
  assert.equal(unknown, "unknown");
});

test("unreviewed cards expire, and method rates wait for enough reviews", () => {
  const rows = applyReviewExpiry(
    [
      { review: "unreviewed" as const, filedOn: "2026-11-14" },
      { review: "unreviewed" as const, filedOn: "2026-11-16" },
      { review: "approved" as const, filedOn: "2026-11-01" },
    ],
    "2026-11-19",
    5,
  );
  assert.equal(rows.expired, 1);
  assert.equal(rows.companies[0]?.review, "expired-unreviewed");
  assert.equal(rows.companies[1]?.review, "unreviewed");
  assert.equal(rows.companies[2]?.review, "approved");
  const migrated = applyReviewExpiry(
    [{ review: "unreviewed" as const, filedOn: "2026-11-01", scoutBatch: "2026-11-01" }],
    "2026-11-19",
    5,
    "2026-11-19",
  );
  assert.equal(migrated.expired, 0);
  assert.equal(migrated.companies[0]?.review, "unreviewed");
  const stats = methodStats(
    [{ lineage: { method: "xai-web-search" }, review: "approved", pipeline: "booked", source: "hunter" }],
    10,
  );
  assert.equal(stats[0]?.enough, false);
  assert.equal(stats[0]?.approvalRate, null);
  assert.equal(bookedThisMonth([{ pipeline: "booked", pipelineOn: "2026-11-02" }], "2026-11"), 1);
  assert.equal(bookedThisMonth([{ pipeline: "sent", pipelineOn: "2026-11-02" }], "2026-11"), 0);
});

test("a 25-point card with no fit signal is rejected, and the daily file cap stays 48", () => {
  const source = "https://paper.example/about";
  const cards = verifyHunterDrafts(
    [
      {
        domain: "paper.example",
        org: "Paper Example",
        place: "",
        industry: "other",
        sizeBand: "",
        sourceUrl: source,
        signals: [],
        profileSignals: [],
        buyer: {
          name: "Ada North",
          title: "Head of People",
          email: "ada@paper.example",
          emailSource: source,
        },
      },
    ],
    { [source]: "Paper Example. Ada North, Head of People, ada@paper.example." },
    { regionId: "anywhere", today: "2026-11-19" },
  );
  assert.equal(cards.length, 1);
  assert.equal(cards[0]?.profileHits.length, 0);
  const accessOnly = cards.map((card) => ({ ...card, hunterScore: 25, profileHits: [] }));
  const dropped = fileHunterCards([], accessOnly, { today: "2026-11-19", floor: 20 });
  assert.equal(dropped.filed, 0);
  assert.equal(dropped.drops["below-quality-floor"], 1);
  assert.equal(hunterDailyFiledCap(""), 48);
  assert.equal(dailyFileRoom(48, 48), 0);
  assert.equal(dailyFileRoom(47, 48), 1);
});

test("a public page that shows a new employer is not filed as contact-ready", () => {
  assert.equal(pageShowsMovedOn("Ada North is now at Other Co."), true);
  const about = "https://northwind.example/about";
  const team = "https://northwind.example/team";
  const cards = verifyHunterDrafts(
    [
      {
        domain: "northwind.example",
        org: "Northwind Example",
        place: "Calgary, Canada",
        industry: "other",
        sizeBand: "",
        sourceUrl: about,
        signals: [],
        profileSignals: [{ id: "distributed", sourceUrl: about }],
        buyer: {
          name: "Ada North",
          title: "Head of People",
          email: "ada@northwind.test",
          emailSource: team,
        },
      },
    ],
    {
      [about]: "Northwind Example in Calgary, Canada runs a distributed team.",
      [team]: "Ada North, formerly Head of People, now at Other Co. ada@northwind.test",
    },
    { regionId: "canada", today: "2026-11-19" },
  );
  assert.equal(cards.length, 1);
  assert.equal(cards[0]?.email, "");
  assert.equal(cards[0]?.buyerName, "");
  const filed = fileHunterCards([], cards, { today: "2026-11-19", floor: 0 });
  assert.equal(filed.companies[0]?.email ?? "", "");
  assert.equal(isContactReady(filed.companies[0] ?? { buyerName: "", buyerTitle: "", email: "", emailSource: "" }), false);
});

test("alarms go to Rex first, then Bo and Derek, and a failed webhook does not stop the rest", async () => {
  const targets = alarmWebhookTargets({
    HUNTER_ALARM_WEBHOOK_URL: "https://rex.example/hook",
    HUNTER_ALARM_CC_WEBHOOK_URLS: "https://bo.example/hook, https://derek.example/hook",
  });
  assert.deepEqual(targets.map((target) => target.name), ["Rex", "Bo", "Derek"]);
  const calls: string[] = [];
  const sent = await deliverAlarmWebhooks({
    targets,
    body: JSON.stringify({ alarms: ["Zero candidates this run."] }),
    fetchImpl: async (url) => {
      calls.push(url);
      if (url.includes("bo.example")) throw new Error("webhook down");
      return new Response("ok");
    },
  });
  assert.deepEqual(sent, ["Rex", "Bo", "Derek"]);
  assert.deepEqual(calls, ["https://rex.example/hook", "https://bo.example/hook", "https://derek.example/hook"]);
});
