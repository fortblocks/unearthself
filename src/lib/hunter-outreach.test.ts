import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, test } from "node:test";
import { HUNTER_DNC_KEY, HUNTER_RESET_KEYS, HUNTER_SAMPLE_FLOOR } from "./hunter-config.ts";
import { handleHunterRead } from "./hunter-read.ts";
import {
  FROM_ADDRESS,
  HUNTER_OUTREACH_KEY,
  handleOutreach,
  handleUnsubscribe,
  outreachLockKey,
  unsubscribeToken,
  unsubscribeUrl,
} from "./hunter-outreach.ts";
import { resetMayTouch, slotWeights } from "./hunter-phase.ts";
import { LEADS_KEY, emptyBook, saveBook, upsertCompany, useRedisClientForTests, type LeadsRedis } from "./leads-book.ts";
import { persistCompanies } from "./leads-hunter.ts";
import type { Company } from "./lead-score.ts";

const WRITE = "w".repeat(32);
const PREVIOUS = "p".repeat(32);
const CARDS = "c".repeat(32);
const READ = "read-token-test";

function memoryRedis() {
  const values = new Map<string, unknown>();
  const hashes = new Map<string, Record<string, string>>();
  let failDnc = false;
  const redis = {
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
    async eval(_script: string, keys: string[], args: string[]) {
      if (values.get(keys[0] ?? "") === args[0]) {
        values.delete(keys[0] ?? "");
        return 1;
      }
      return 0;
    },
    async hset(key: string, field: string | Record<string, string>, value?: string) {
      if (failDnc && key === HUNTER_DNC_KEY) throw new Error("dnc down");
      const hash = hashes.get(key) ?? {};
      if (field && typeof field === "object") {
        for (const [name, item] of Object.entries(field)) hash[name] = item;
      } else if (typeof field === "string" && typeof value === "string") {
        hash[field] = value;
      }
      hashes.set(key, hash);
      return 1;
    },
    async hget(key: string, field: string) {
      return hashes.get(key)?.[field] ?? null;
    },
    async hgetall(key: string) {
      return hashes.get(key) ?? {};
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
    hashes,
    values,
    setFailDnc(next: boolean) {
      failDnc = next;
    },
  };
  return redis;
}

function company(partial: Partial<Company> & { id: string }): Company {
  return {
    id: partial.id,
    org: partial.org ?? "Northwind Example",
    domain: partial.domain ?? "northwind.example",
    city: partial.city ?? "Calgary",
    industry: partial.industry ?? "energy",
    sizeBand: partial.sizeBand ?? "80-800",
    sourceUrl: partial.sourceUrl ?? "https://northwind.example/about",
    why: partial.why ?? "The about page names a leadership offsite.",
    whySources: partial.whySources ?? [{ url: "https://northwind.example/about", label: "About" }],
    buyerName: partial.buyerName ?? "Ada North",
    buyerTitle: partial.buyerTitle ?? "People Lead",
    email: partial.email ?? "ada@northwind.example",
    emailSource: partial.emailSource ?? "https://northwind.example/contact",
    timingNote: "",
    timingScore: partial.timingScore ?? 0,
    status: partial.status ?? "watch",
    filedLeadId: "",
    draftSubject: "",
    draftBody: "",
    lastTouch: "",
    scoutBatch: "",
    source: "hunter",
    review: partial.review ?? "approved",
    hunterScore: partial.hunterScore ?? 70,
    fitRating: partial.fitRating,
    hook: partial.hook,
    fieldSources: partial.fieldSources,
    filedOn: partial.filedOn ?? "2026-11-01",
    enrichment: partial.enrichment ?? "enriched",
    contactSource: partial.contactSource ?? "Public page",
    place: partial.place ?? "Calgary, Alberta, Canada",
    emailMx: partial.emailMx,
    cardFlags: partial.cardFlags,
    pipeline: partial.pipeline ?? "",
    pipelineOn: partial.pipelineOn ?? "",
    casl: partial.casl,
    caslStatus: partial.caslStatus,
    lineage: partial.lineage,
    signals: partial.signals,
    profileHits: partial.profileHits,
    hunterRegion: partial.hunterRegion,
    reviewedOn: partial.reviewedOn,
  };
}

function sentBody(cardId: string, extra: Record<string, unknown> = {}) {
  return {
    eventId: randomUUID(),
    cardId,
    type: "sent",
    at: new Date().toISOString(),
    touch: 1,
    experimentId: "exp-1",
    variantId: "var-a",
    threadId: "thread-1",
    fromAddress: FROM_ADDRESS,
    consentBasis: "public-page",
    emailSource: "https://northwind.example/contact",
    subject: "A short note",
    body: "Hello from Drumheller.",
    ...extra,
  };
}

function followBody(cardId: string, touch: number, extra: Record<string, unknown> = {}) {
  return {
    eventId: randomUUID(),
    cardId,
    type: "followup_sent",
    at: new Date().toISOString(),
    touch,
    threadId: "thread-1",
    fromAddress: FROM_ADDRESS,
    subject: "A short note",
    body: "Hello again.",
    ...extra,
  };
}

async function post(body: unknown, token = WRITE, headers: Record<string, string> = {}) {
  return handleOutreach(
    new Request("https://www.unearthself.xyz/api/hunter/outreach", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

async function read(path: string, token = CARDS) {
  return handleHunterRead(
    new Request(`https://www.unearthself.xyz${path}`, {
      headers: token ? { authorization: `Bearer ${token}` } : {},
    }),
  );
}

async function seed(redis: ReturnType<typeof memoryRedis>, companies: Company[]) {
  await redis.set(LEADS_KEY, { ...emptyBook(), companies });
}

describe("coco lead book routes", { concurrency: 1 }, () => {
  const previous: Record<string, string | undefined> = {};

  beforeEach(() => {
    previous.HUNTER_WRITE_TOKEN = process.env.HUNTER_WRITE_TOKEN;
    previous.HUNTER_WRITE_TOKEN_PREVIOUS = process.env.HUNTER_WRITE_TOKEN_PREVIOUS;
    previous.HUNTER_CARDS_TOKEN = process.env.HUNTER_CARDS_TOKEN;
    previous.HUNTER_READ_TOKEN = process.env.HUNTER_READ_TOKEN;
    process.env.HUNTER_WRITE_TOKEN = WRITE;
    process.env.HUNTER_CARDS_TOKEN = CARDS;
    process.env.HUNTER_READ_TOKEN = READ;
    delete process.env.HUNTER_WRITE_TOKEN_PREVIOUS;
  });

  afterEach(() => {
    useRedisClientForTests(null);
    for (const [key, value] of Object.entries(previous)) {
      if (value == null) delete process.env[key];
      else process.env[key] = value;
    }
  });

  test("1. write auth fails closed and does not log the token or the letter", async () => {
    const redis = memoryRedis();
    useRedisClientForTests(redis as unknown as LeadsRedis);
    const card = company({ id: "card-auth", email: "ada.secret@northwind.example" });
    await seed(redis, [card]);
    delete process.env.HUNTER_WRITE_TOKEN;
    const unset = await post(sentBody(card.id, { emailSource: card.emailSource }));
    assert.equal(unset.status, 401);
    process.env.HUNTER_WRITE_TOKEN = "short-token";
    const short = await post(sentBody(card.id, { emailSource: card.emailSource }), "short-token");
    assert.equal(short.status, 401);
    process.env.HUNTER_WRITE_TOKEN = WRITE;
    const readToken = await post(sentBody(card.id, { emailSource: card.emailSource }), READ);
    assert.equal(readToken.status, 401);
    const cardsToken = await post(sentBody(card.id, { emailSource: card.emailSource }), CARDS);
    assert.equal(cardsToken.status, 401);
    const wrong = await post(sentBody(card.id, { emailSource: card.emailSource }), "x".repeat(32));
    assert.equal(wrong.status, 401);
    const logs: string[] = [];
    const original = console.info;
    console.info = (...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    };
    try {
      const ok = await post(
        sentBody(card.id, {
          emailSource: card.emailSource,
          subject: "SUBJECT-SECRET",
          body: "BODY-SECRET",
          note: "NOTE-SECRET",
        }),
      );
      assert.equal(ok.status, 200);
      const payload = (await ok.json()) as { ok: boolean; duplicate: boolean; pipeline: string };
      assert.equal(payload.ok, true);
      assert.equal(payload.duplicate, false);
      assert.equal(payload.pipeline, "sent");
    } finally {
      console.info = original;
    }
    const text = logs.join("\n");
    assert.equal(text.includes(WRITE), false);
    assert.equal(text.includes("SUBJECT-SECRET"), false);
    assert.equal(text.includes("BODY-SECRET"), false);
    assert.equal(text.includes("NOTE-SECRET"), false);
    assert.equal(text.includes("ada.secret@northwind.example"), false);
    assert.match(text, /"status":200/);
  });

  test("2. methods, size, and unknown fields are refused without an echo", async () => {
    const redis = memoryRedis();
    useRedisClientForTests(redis as unknown as LeadsRedis);
    const card = company({ id: "card-shape" });
    await seed(redis, [card]);
    const got = await handleOutreach(
      new Request("https://www.unearthself.xyz/api/hunter/outreach", {
        method: "GET",
        headers: { authorization: `Bearer ${WRITE}` },
      }),
    );
    assert.equal(got.status, 405);
    const text = await post("hello", WRITE, { "content-type": "text/plain" });
    assert.equal(text.status, 415);
    const bulky = await post(`${"{"}${"x".repeat(9000)}`);
    assert.equal(bulky.status, 413);
    const unknown = await post({ ...sentBody(card.id), leak: "ECHO-ME-NOT" });
    assert.equal(unknown.status, 400);
    const unknownBody = await unknown.json();
    assert.deepEqual(unknownBody, { error: "invalid", field: "leak" });
    assert.equal(JSON.stringify(unknownBody).includes("ECHO-ME-NOT"), false);
    const invented = await post({ ...sentBody(card.id), type: "pigeon" });
    assert.equal(invented.status, 400);
    assert.equal(((await invented.json()) as { field: string }).field, "type");
  });

  test("3. an unknown card is 404", async () => {
    const redis = memoryRedis();
    useRedisClientForTests(redis as unknown as LeadsRedis);
    await seed(redis, []);
    const response = await post(sentBody("missing-card"));
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: "unknown-card" });
  });

  test("4. the same event is a duplicate, and a reused id with another type is 409", async () => {
    const redis = memoryRedis();
    useRedisClientForTests(redis as unknown as LeadsRedis);
    const card = company({ id: "card-once" });
    await seed(redis, [card]);
    const body = sentBody(card.id);
    const first = await post(body);
    assert.equal(first.status, 200);
    const second = await post(body);
    assert.equal(second.status, 200);
    const payload = (await second.json()) as { duplicate: boolean; outreach: { events: unknown[] }; pipeline: string };
    assert.equal(payload.duplicate, true);
    assert.equal(payload.outreach.events.length, 1);
    assert.equal(payload.pipeline, "sent");
    const reused = await post({
      eventId: body.eventId,
      cardId: card.id,
      type: "replied",
      at: body.at,
      replyType: "positive",
    });
    assert.equal(reused.status, 409);
    assert.equal(((await reused.json()) as { error: string }).error, "event-id");
  });

  test("5. three touches are accepted, and a bad touch, thread, or from address is refused", async () => {
    const redis = memoryRedis();
    useRedisClientForTests(redis as unknown as LeadsRedis);
    const card = company({ id: "card-touch" });
    await seed(redis, [card]);
    const badFrom = await post(sentBody(card.id, { fromAddress: "other@example.com" }));
    assert.ok(badFrom.status === 400 || badFrom.status === 409);
    assert.equal(redis.hashes.get(HUNTER_OUTREACH_KEY)?.[card.id], undefined);
    const sent = await post(sentBody(card.id));
    assert.equal(sent.status, 200);
    const skipped = await post(followBody(card.id, 3));
    assert.equal(skipped.status, 409);
    const wrongThread = await post(followBody(card.id, 2, { threadId: "other-thread" }));
    assert.equal(wrongThread.status, 409);
    const second = await post(followBody(card.id, 2));
    assert.equal(second.status, 200);
    const touchFour = await post(followBody(card.id, 4));
    assert.equal(touchFour.status, 400);
    const third = await post(followBody(card.id, 3));
    assert.equal(third.status, 200);
    const stored = JSON.parse(redis.hashes.get(HUNTER_OUTREACH_KEY)?.[card.id] ?? "{}") as { touches: number; events: unknown[] };
    assert.equal(stored.touches, 3);
    assert.equal(stored.events.length, 3);
  });

  test("6. a blocked send stores nothing", async () => {
    const redis = memoryRedis();
    useRedisClientForTests(redis as unknown as LeadsRedis);
    const person = company({ id: "card-person", domain: "person.example", email: "ada@person.example" });
    const org = company({ id: "card-org", domain: "org.example", email: "ada@org.example", emailSource: "https://org.example/contact" });
    const flagged = company({ id: "card-flag", cardFlags: ["No unsolicited email"] });
    await seed(redis, [person, org, flagged]);
    await redis.hset(
      HUNTER_DNC_KEY,
      "person.example|ada@person.example",
      JSON.stringify({ domain: "person.example", email: "ada@person.example", reason: "dont-contact", addedOn: "2026-11-01", until: "never" }),
    );
    await redis.hset(
      HUNTER_DNC_KEY,
      "org.example|",
      JSON.stringify({ domain: "org.example", email: "", reason: "dont-contact", addedOn: "2026-11-01", until: "never" }),
    );
    for (const card of [person, org, flagged]) {
      const response = await post(sentBody(card.id, { emailSource: card.emailSource }));
      assert.equal(response.status, 409, card.id);
      assert.equal(redis.hashes.get(HUNTER_OUTREACH_KEY)?.[card.id], undefined);
    }
  });

  test("7. an automatic reply stays in sequence, and a positive reply leaves it", async () => {
    const redis = memoryRedis();
    useRedisClientForTests(redis as unknown as LeadsRedis);
    const card = company({ id: "card-reply" });
    await seed(redis, [card]);
    assert.equal((await post(sentBody(card.id))).status, 200);
    const auto = await post({ eventId: randomUUID(), cardId: card.id, type: "replied", at: new Date().toISOString(), replyType: "auto_reply" });
    assert.equal(auto.status, 200);
    assert.equal(((await auto.json()) as { pipeline: string }).pipeline, "sent");
    let view = (await (await read("/api/hunter/read?view=in-sequence")).json()) as { cards: { id: string }[] };
    assert.ok(view.cards.some((item) => item.id === card.id));
    const positive = await post({
      eventId: randomUUID(),
      cardId: card.id,
      type: "replied",
      at: new Date().toISOString(),
      replyType: "positive",
    });
    assert.equal(positive.status, 200);
    assert.equal(((await positive.json()) as { pipeline: string }).pipeline, "replied");
    view = (await (await read("/api/hunter/read?view=in-sequence")).json()) as { cards: { id: string }[] };
    assert.equal(view.cards.some((item) => item.id === card.id), false);
  });

  test("8. opt out writes do-not-contact, upgrades a cooldown, and a DNC failure stores nothing", async () => {
    const redis = memoryRedis();
    useRedisClientForTests(redis as unknown as LeadsRedis);
    const person = company({ id: "card-opt-person" });
    const org = company({
      id: "card-opt-org",
      domain: "whole.example",
      email: "ada@whole.example",
      emailSource: "https://whole.example/contact",
    });
    const cooling = company({ id: "card-cooling", domain: "cool.example", email: "ada@cool.example", emailSource: "https://cool.example/contact" });
    const broken = company({ id: "card-broken", domain: "broken.example", email: "ada@broken.example", emailSource: "https://broken.example/contact" });
    await seed(redis, [person, org, cooling, broken]);
    await redis.hset(
      HUNTER_DNC_KEY,
      "cool.example|ada@cool.example",
      JSON.stringify({ domain: "cool.example", email: "ada@cool.example", reason: "skipped", addedOn: "2026-11-01", until: "2026-12-01" }),
    );
    const personRes = await post({ eventId: randomUUID(), cardId: person.id, type: "opted_out", at: new Date().toISOString(), optOutScope: "person" });
    assert.equal(personRes.status, 200);
    const personEntry = JSON.parse(redis.hashes.get(HUNTER_DNC_KEY)?.["northwind.example|ada@northwind.example"] ?? "{}") as {
      email: string;
      reason: string;
      until: string;
    };
    assert.equal(personEntry.email, "ada@northwind.example");
    assert.equal(personEntry.reason, "unsubscribe");
    assert.equal(personEntry.until, "never");
    const orgRes = await post({ eventId: randomUUID(), cardId: org.id, type: "opted_out", at: new Date().toISOString(), optOutScope: "company" });
    assert.equal(orgRes.status, 200);
    const orgEntry = JSON.parse(redis.hashes.get(HUNTER_DNC_KEY)?.["whole.example|"] ?? "{}") as { email: string; until: string };
    assert.equal(orgEntry.email, "");
    assert.equal(orgEntry.until, "never");
    const coolRes = await post({ eventId: randomUUID(), cardId: cooling.id, type: "opted_out", at: new Date().toISOString(), optOutScope: "person" });
    assert.equal(coolRes.status, 200);
    const coolEntry = JSON.parse(redis.hashes.get(HUNTER_DNC_KEY)?.["cool.example|ada@cool.example"] ?? "{}") as { reason: string; until: string };
    assert.equal(coolEntry.reason, "unsubscribe");
    assert.equal(coolEntry.until, "never");
    redis.setFailDnc(true);
    const failed = await post({ eventId: randomUUID(), cardId: broken.id, type: "opted_out", at: new Date().toISOString(), optOutScope: "person" });
    assert.equal(failed.status, 503);
    assert.equal(((await failed.json()) as { retryable: boolean }).retryable, true);
    assert.equal(redis.hashes.get(HUNTER_OUTREACH_KEY)?.[broken.id], undefined);
  });

  test("9. a bounce leaves both views until the email changes", async () => {
    const redis = memoryRedis();
    useRedisClientForTests(redis as unknown as LeadsRedis);
    const card = company({ id: "card-bounce" });
    await seed(redis, [card]);
    let qualifying = (await (await read("/api/hunter/read?view=qualifying")).json()) as { cards: { id: string }[] };
    assert.ok(qualifying.cards.some((item) => item.id === card.id));
    assert.equal((await post(sentBody(card.id))).status, 200);
    qualifying = (await (await read("/api/hunter/read?view=qualifying")).json()) as { cards: { id: string }[] };
    assert.equal(qualifying.cards.some((item) => item.id === card.id), false);
    let sequence = (await (await read("/api/hunter/read?view=in-sequence")).json()) as { cards: { id: string }[] };
    assert.ok(sequence.cards.some((item) => item.id === card.id));
    assert.equal((await post({ eventId: randomUUID(), cardId: card.id, type: "bounced", at: new Date().toISOString() })).status, 200);
    qualifying = (await (await read("/api/hunter/read?view=qualifying")).json()) as { cards: { id: string }[] };
    sequence = (await (await read("/api/hunter/read?view=in-sequence")).json()) as { cards: { id: string }[] };
    assert.equal(qualifying.cards.some((item) => item.id === card.id), false);
    assert.equal(sequence.cards.some((item) => item.id === card.id), false);
    const loaded = await redis.get<{ companies: Company[] }>(LEADS_KEY);
    const next = (loaded?.companies ?? []).map((item) => (item.id === card.id ? { ...item, email: "ada.new@northwind.example" } : item));
    await redis.set(LEADS_KEY, { ...emptyBook(), companies: next });
    qualifying = (await (await read("/api/hunter/read?view=qualifying")).json()) as { cards: { id: string }[] };
    sequence = (await (await read("/api/hunter/read?view=in-sequence")).json()) as { cards: { id: string }[] };
    assert.ok(qualifying.cards.some((item) => item.id === card.id));
    assert.equal(sequence.cards.some((item) => item.id === card.id), false);
  });

  test("10. marks never move down, and lost or won stay put", async () => {
    const redis = memoryRedis();
    useRedisClientForTests(redis as unknown as LeadsRedis);
    const booked = company({ id: "card-booked" });
    const lost = company({ id: "card-lost", pipeline: "lost", pipelineOn: "2026-11-01" });
    const won = company({ id: "card-won", pipeline: "won", pipelineOn: "2026-11-01" });
    await seed(redis, [booked, lost, won]);
    assert.equal((await post(sentBody(booked.id))).status, 200);
    const booking = await post({ eventId: randomUUID(), cardId: booked.id, type: "booked", at: new Date().toISOString() });
    assert.equal(((await booking.json()) as { pipeline: string }).pipeline, "booked");
    const late = await post(sentBody(booked.id));
    assert.equal(late.status, 409);
    const lateBody = (await late.json()) as { error: string };
    assert.equal(lateBody.error, "touch");
    const after = JSON.parse(redis.hashes.get(HUNTER_OUTREACH_KEY)?.[booked.id] ?? "{}") as { touches: number };
    assert.equal(after.touches, 1);
    const book = await redis.get<{ companies: Company[] }>(LEADS_KEY);
    assert.equal(book?.companies.find((item) => item.id === booked.id)?.pipeline, "booked");
    const lostRes = await post({ eventId: randomUUID(), cardId: lost.id, type: "replied", at: new Date().toISOString(), replyType: "positive" });
    assert.equal(((await lostRes.json()) as { pipeline: string }).pipeline, "lost");
    const wonRes = await post({ eventId: randomUUID(), cardId: won.id, type: "booked", at: new Date().toISOString() });
    assert.equal(((await wonRes.json()) as { pipeline: string }).pipeline, "won");
    const saved = await redis.get<{ companies: Company[] }>(LEADS_KEY);
    assert.equal(saved?.companies.find((item) => item.id === lost.id)?.pipeline, "lost");
    assert.equal(saved?.companies.find((item) => item.id === won.id)?.pipeline, "won");
  });

  test("11. a stale desk save and a Hunter merge keep the lifted mark", async () => {
    const redis = memoryRedis();
    useRedisClientForTests(redis as unknown as LeadsRedis);
    const card = company({ id: "card-heal", pipeline: "" });
    await seed(redis, [card]);
    const start = structuredClone(card);
    const hunter = structuredClone(card);
    assert.equal(
      (
        await post({
          eventId: randomUUID(),
          cardId: card.id,
          type: "replied",
          at: new Date().toISOString(),
          replyType: "positive",
        })
      ).status,
      200,
    );
    const lifted = await redis.get<{ companies: Company[] }>(LEADS_KEY);
    const current = lifted?.companies.find((item) => item.id === card.id);
    assert.equal(current?.pipeline, "replied");
    await saveBook(upsertCompany(lifted?.companies ? { ...emptyBook(), companies: lifted.companies } : emptyBook(), { ...current!, pipeline: "" }));
    const healed = await redis.get<{ companies: Company[] }>(LEADS_KEY);
    assert.equal(healed?.companies.find((item) => item.id === card.id)?.pipeline, "replied");
    await persistCompanies([start], [hunter]);
    const merged = await redis.get<{ companies: Company[] }>(LEADS_KEY);
    assert.equal(merged?.companies.find((item) => item.id === card.id)?.pipeline, "replied");
    const original = redis.hgetall.bind(redis);
    redis.hgetall = async () => {
      throw new Error("hash down");
    };
    await saveBook({ ...emptyBook(), companies: [{ ...current!, pipeline: "" }] });
    const unsaved = await redis.get<{ companies: Company[] }>(LEADS_KEY);
    assert.equal(unsaved?.companies.find((item) => item.id === card.id)?.pipeline, "");
    redis.hgetall = original;
    await saveBook({ ...emptyBook(), companies: unsaved?.companies ?? [] });
    const restored = await redis.get<{ companies: Company[] }>(LEADS_KEY);
    assert.equal(restored?.companies.find((item) => item.id === card.id)?.pipeline, "replied");
  });

  test("12. slot weights use the lifted marks once the sample floor is cleared", async () => {
    const redis = memoryRedis();
    useRedisClientForTests(redis as unknown as LeadsRedis);
    assert.equal(HUNTER_SAMPLE_FLOOR, 30);
    const lineage = {
      method: "hunter",
      query: "hiring|calgary|teams",
      promptVersion: "v",
      model: "m",
      scoreVersion: "s",
      signals: [],
      sourceUrl: "https://northwind.example/about",
      experimentId: "",
      axis: "" as const,
      sampleFloor: 30,
    };
    const thin = { ...lineage, query: "office|edmonton|teams" };
    const cards = Array.from({ length: 30 }, (_, index) =>
      company({ id: `weight-${index}`, domain: `weight-${index}.example`, review: "approved", lineage, pipeline: "" }),
    );
    const extra = Array.from({ length: 29 }, (_, index) =>
      company({ id: `thin-${index}`, domain: `thin-${index}.example`, review: "approved", lineage: thin, pipeline: "" }),
    );
    await seed(redis, [...cards, ...extra]);
    await redis.hset(HUNTER_OUTREACH_KEY, "weight-0", JSON.stringify({ cardId: "weight-0", touches: 1, firstSentAt: new Date().toISOString(), repliedAt: new Date().toISOString(), events: [] }));
    await redis.hset(HUNTER_OUTREACH_KEY, "weight-1", JSON.stringify({ cardId: "weight-1", touches: 1, firstSentAt: new Date().toISOString(), bookedAt: new Date().toISOString(), events: [] }));
    const loaded = await redis.get<{ companies: Company[]; morningCount: number; morning: null; draftRevision: number }>(LEADS_KEY);
    await saveBook({ ...emptyBook(), companies: loaded?.companies ?? [] });
    const saved = await redis.get<{ companies: Company[] }>(LEADS_KEY);
    const weights = slotWeights(saved?.companies ?? []);
    assert.equal(weights["hiring|calgary"], 33);
    assert.equal(weights["office|edmonton"], undefined);
    assert.equal(saved?.companies.find((item) => item.id === "weight-0")?.pipeline, "replied");
    assert.equal(saved?.companies.find((item) => item.id === "weight-1")?.pipeline, "booked");
  });

  test("13. a book reset does not include the outreach hash or the do-not-contact list", async () => {
    const redis = memoryRedis();
    useRedisClientForTests(redis as unknown as LeadsRedis);
    await redis.set(LEADS_KEY, emptyBook());
    await redis.set("unearth:hunter:v1", { paused: false });
    await redis.hset(HUNTER_OUTREACH_KEY, "card-1", JSON.stringify({ cardId: "card-1", touches: 0, events: [] }));
    await redis.hset(HUNTER_DNC_KEY, "keep.example|", JSON.stringify({ domain: "keep.example", email: "", reason: "unsubscribe", addedOn: "2026-11-01", until: "never" }));
    for (const key of HUNTER_RESET_KEYS) await redis.del(key);
    assert.equal(resetMayTouch(HUNTER_OUTREACH_KEY), false);
    assert.equal(resetMayTouch(HUNTER_DNC_KEY), false);
    assert.ok(redis.hashes.get(HUNTER_OUTREACH_KEY)?.["card-1"]);
    assert.ok(redis.hashes.get(HUNTER_DNC_KEY)?.["keep.example|"]);
    assert.equal(redis.values.has(LEADS_KEY), false);
  });

  test("14. a card lock keeps both events, and a held lock returns 503", async () => {
    const redis = memoryRedis();
    useRedisClientForTests(redis as unknown as LeadsRedis);
    const card = company({ id: "card-lock" });
    await seed(redis, [card]);
    const firstId = randomUUID();
    const secondId = randomUUID();
    const [left, right] = await Promise.all([
      post({ eventId: firstId, cardId: card.id, type: "replied", at: new Date().toISOString(), replyType: "auto_reply" }),
      post({ eventId: secondId, cardId: card.id, type: "replied", at: new Date().toISOString(), replyType: "auto_reply" }),
    ]);
    assert.equal(left.status, 200);
    assert.equal(right.status, 200);
    const stored = JSON.parse(redis.hashes.get(HUNTER_OUTREACH_KEY)?.[card.id] ?? "{}") as { events: { eventId: string }[] };
    assert.deepEqual(stored.events.map((event) => event.eventId).sort(), [firstId, secondId].sort());
    await redis.set(outreachLockKey(card.id), "someone-else");
    const busy = await post({ eventId: randomUUID(), cardId: card.id, type: "replied", at: new Date().toISOString(), replyType: "auto_reply" });
    assert.equal(busy.status, 503);
    assert.equal(((await busy.json()) as { retryable: boolean }).retryable, true);
  });

  test("a stored fit band is on the card and does not change qualifying order", async () => {
    const redis = memoryRedis();
    useRedisClientForTests(redis as unknown as LeadsRedis);
    const weak = company({
      id: "fit-weak",
      hunterScore: 90,
      filedOn: "2026-11-02",
      domain: "weak.example",
      email: "ada@weak.example",
      fitRating: { band: "weak", reason: "The company is a thin match for a retreat.", ratedOn: "2026-11-20", model: "grok-4.20-0309-non-reasoning" },
    });
    const strong = company({
      id: "fit-strong",
      hunterScore: 40,
      filedOn: "2026-11-01",
      domain: "strong.example",
      email: "ada@strong.example",
      fitRating: { band: "strong", reason: "The company matches the retreat profile.", ratedOn: "2026-11-20", model: "grok-4.20-0309-non-reasoning" },
    });
    const plain = company({ id: "fit-plain", hunterScore: 70, domain: "plain.example", email: "ada@plain.example" });
    await seed(redis, [strong, weak, plain]);
    const page = (await (await read("/api/hunter/read?view=qualifying&limit=10")).json()) as {
      cards: { id: string; fitRating: { band: string } | null }[];
    };
    assert.deepEqual(
      page.cards.map((card) => card.id),
      ["fit-weak", "fit-plain", "fit-strong"],
    );
    assert.equal(page.cards[0]?.fitRating?.band, "weak");
    assert.equal(page.cards[1]?.fitRating, null);
    const one = (await (await read("/api/hunter/read?view=card&id=fit-weak")).json()) as {
      card: { fitRating: { band: string; reason: string } | null; hook: unknown; fieldSources: unknown };
    };
    assert.equal(one.card.fitRating?.band, "weak");
    assert.equal(one.card.fitRating?.reason, "The company is a thin match for a retreat.");
    assert.equal(one.card.hook, null);
    assert.equal(one.card.fieldSources, null);
    const withHook = company({
      id: "fit-hook",
      domain: "hook.example",
      email: "ada@hook.example",
      hook: { text: "The team booked a retreat.", sourceUrl: "https://hook.example/about", sourceDate: "2026-11-01", kind: "retreat" },
      fieldSources: { email: { url: "https://hook.example/about", via: "Public page", seenOn: "2026-11-20" } },
    });
    await seed(redis, [withHook]);
    const hooked = (await (await read("/api/hunter/read?view=card&id=fit-hook")).json()) as {
      card: { hook: { sourceDate: string } | null; fieldSources: { email?: { via: string; url: string } } | null };
    };
    assert.equal(hooked.card.hook?.sourceDate, "2026-11-01");
    assert.equal(hooked.card.fieldSources?.email?.via, "Public page");
    assert.equal(hooked.card.fieldSources?.email?.url, "https://hook.example/about");
  });

  test("15. card views enforce each qualifying rule, sequence stops, and the snapshot stays put", async () => {
    const redis = memoryRedis();
    useRedisClientForTests(redis as unknown as LeadsRedis);
    const ready = company({ id: "ready-high", hunterScore: 90, filedOn: "2026-11-02", place: "Calgary" });
    const readyOlder = company({ id: "ready-low", hunterScore: 40, filedOn: "2026-11-01", place: "Calgary, Alberta, Canada", domain: "older.example", email: "ada@older.example" });
    const notReady = company({ id: "not-ready", enrichment: "not-enriched" });
    const unreviewed = company({ id: "unreviewed", review: "unreviewed", domain: "review.example", email: "ada@review.example" });
    const piped = company({ id: "piped", pipeline: "sent", domain: "piped.example", email: "ada@piped.example" });
    const blocked = company({ id: "blocked", domain: "blocked.example", email: "ada@blocked.example" });
    const quiet = company({ id: "quiet", cardFlags: ["No unsolicited email"], domain: "quiet.example", email: "ada@quiet.example" });
    const stale = company({ id: "stale", cardFlags: ["Stale"], domain: "stale.example", email: "ada@stale.example" });
    const unverified = company({ id: "unverified", cardFlags: ["Apollo email not verified"], domain: "unverified.example", email: "ada@unverified.example" });
    const mx = company({ id: "mx", emailMx: false, domain: "mx.example", email: "ada@mx.example" });
    const blank = company({ id: "blank", email: "", buyerName: "Ada North", domain: "blank.example" });
    const bounced = company({ id: "bounced-mail", domain: "bounce.example", email: "ada@bounce.example" });
    const sentCard = company({
      id: "sent-card",
      domain: "sent.example",
      email: "ada@sent.example",
      emailSource: "https://sent.example/contact",
      review: "unreviewed",
    });
    await seed(redis, [ready, readyOlder, notReady, unreviewed, piped, blocked, quiet, stale, unverified, mx, blank, bounced, sentCard]);
    await redis.hset(
      HUNTER_DNC_KEY,
      "blocked.example|ada@blocked.example",
      JSON.stringify({ domain: "blocked.example", email: "ada@blocked.example", reason: "unsubscribe", addedOn: "2026-11-01", until: "never" }),
    );
    await redis.hset(
      HUNTER_DNC_KEY,
      "hidden-domain.example|secret.person@hidden-domain.example",
      JSON.stringify({ domain: "hidden-domain.example", email: "secret.person@hidden-domain.example", reason: "dont-contact", addedOn: "2026-11-01", until: "2099-01-01" }),
    );
    await redis.hset(
      HUNTER_OUTREACH_KEY,
      bounced.id,
      JSON.stringify({ cardId: bounced.id, touches: 0, bouncedEmail: "ada@bounce.example", events: [] }),
    );
    const queued = await read("/api/hunter/read?view=queued");
    assert.equal(queued.status, 200);
    assert.equal(((await queued.json()) as { total: number }).total, 0);
    const denied = await read("/api/hunter/read?view=qualifying", READ);
    assert.equal(denied.status, 401);
    process.env.HUNTER_CARDS_TOKEN = "c".repeat(31);
    const short = await read("/api/hunter/read?view=qualifying", "c".repeat(31));
    assert.equal(short.status, 401);
    process.env.HUNTER_CARDS_TOKEN = CARDS;
    const page = await read("/api/hunter/read?view=qualifying&limit=1");
    assert.equal(page.status, 200);
    const first = (await page.json()) as {
      total: number;
      nextCursor: string | null;
      cards: { id: string; country: string; region: string; unsubscribeUrl: string | null; email?: string }[];
      skipped: Record<string, number>;
    };
    assert.equal(first.total, 2);
    assert.equal(first.cards[0]?.id, "ready-high");
    assert.equal(first.cards[0]?.country, "");
    assert.equal(first.cards[0]?.region, "");
    assert.ok(first.nextCursor);
    assert.ok(first.cards[0]?.unsubscribeUrl?.startsWith("https://www.unearthself.xyz/u/"));
    const second = (await (await read(`/api/hunter/read?view=qualifying&limit=1&cursor=${first.nextCursor}`)).json()) as {
      cards: { id: string; country: string; region: string }[];
    };
    assert.equal(second.cards[0]?.id, "ready-low");
    assert.equal(second.cards[0]?.country, "Canada");
    assert.equal(second.cards[0]?.region, "Alberta");
    const all = (await (await read("/api/hunter/read?view=qualifying&limit=50")).json()) as {
      cards: { id: string }[];
      skipped: Record<string, number>;
    };
    const ids = all.cards.map((item) => item.id);
    for (const id of ["not-ready", "unreviewed", "piped", "blocked", "quiet", "stale", "unverified", "mx", "blank", "bounced-mail"]) {
      assert.equal(ids.includes(id), false, id);
    }
    assert.ok(all.skipped["contact-ready"] >= 1);
    assert.ok(all.skipped.review >= 1);
    assert.ok(all.skipped.pipeline >= 1);
    assert.ok(all.skipped["do-not-contact"] >= 1);
    assert.ok(all.skipped["no-unsolicited"] >= 1);
    assert.ok(all.skipped.stale >= 1);
    assert.ok(all.skipped["apollo-unverified"] >= 1);
    assert.ok(all.skipped["email-mx"] >= 1);
    assert.ok(all.skipped["email-blank"] >= 1);
    assert.ok(all.skipped["bounced-email"] >= 1);
    delete process.env.HUNTER_WRITE_TOKEN;
    const blockedLink = (await (await read("/api/hunter/read?view=qualifying&limit=50")).json()) as { cards: { id: string }[]; skipped: Record<string, number> };
    assert.equal(blockedLink.cards.some((item) => item.id === "ready-high"), false);
    assert.ok(blockedLink.skipped["no-unsubscribe-link"] >= 1);
    process.env.HUNTER_WRITE_TOKEN = WRITE;
    assert.equal((await post(sentBody(sentCard.id, { emailSource: sentCard.emailSource }))).status, 200);
    let sequence = (await (await read("/api/hunter/read?view=in-sequence")).json()) as { cards: { id: string; dnc: { blocked: boolean }; unsubscribeUrl: string | null }[] };
    assert.ok(sequence.cards.some((item) => item.id === sentCard.id && item.unsubscribeUrl));
    assert.equal((await post({ eventId: randomUUID(), cardId: sentCard.id, type: "replied", at: new Date().toISOString(), replyType: "neutral" })).status, 200);
    const afterReply = (await (await read("/api/hunter/read?view=in-sequence")).json()) as { cards: { id: string }[] };
    assert.equal(afterReply.cards.some((item) => item.id === sentCard.id), false);
    const missing = await read("/api/hunter/read?view=card&id=no-such-card");
    assert.equal(missing.status, 404);
    const one = (await (await read("/api/hunter/read?view=card&id=ready-high")).json()) as { card: { id: string; stage?: string; draft?: string; email: string } };
    assert.equal(one.card.id, "ready-high");
    assert.equal(one.card.email, "ada@northwind.example");
    assert.equal(typeof one.card.stage, "string");
    assert.equal("draft" in one.card, false);
    const badLimit = await read("/api/hunter/read?view=qualifying&limit=nope");
    assert.equal(badLimit.status, 400);
    assert.equal(JSON.stringify(await badLimit.json()).includes("nope"), false);
    const snapshot = await read("/api/hunter/read", READ);
    assert.equal(snapshot.status, 200);
    const snap = (await snapshot.json()) as { cards: Record<string, unknown>[] };
    assert.deepEqual(Object.keys(snap.cards[0] ?? {}).sort(), ["domain", "filedOn", "org", "pipeline", "score", "status"]);
    assert.equal(JSON.stringify(snap).includes("ada@northwind.example"), false);
  });

  test("16. read responses carry per-card do-not-contact flags and never the list", async () => {
    const redis = memoryRedis();
    useRedisClientForTests(redis as unknown as LeadsRedis);
    const card = company({ id: "card-visible", domain: "visible.example", email: "ada@visible.example" });
    await seed(redis, [card]);
    await redis.hset(
      HUNTER_DNC_KEY,
      "hidden-domain.example|secret.person@hidden-domain.example",
      JSON.stringify({ domain: "hidden-domain.example", email: "secret.person@hidden-domain.example", reason: "dont-contact", addedOn: "2026-11-01", until: "2099-01-01" }),
    );
    await redis.hset(
      HUNTER_OUTREACH_KEY,
      card.id,
      JSON.stringify({ cardId: card.id, touches: 1, firstSentAt: new Date().toISOString(), lastSentAt: new Date().toISOString(), domain: card.domain, email: card.email, events: [{ eventId: randomUUID(), type: "sent", at: new Date().toISOString() }] }),
    );
    for (const path of ["/api/hunter/read?view=qualifying", "/api/hunter/read?view=in-sequence", "/api/hunter/read?view=outreach", "/api/hunter/read?view=card&id=card-visible"]) {
      const response = await read(path);
      assert.equal(response.status, 200, path);
      const text = JSON.stringify(await response.json());
      assert.equal(text.includes("hidden-domain.example"), false, path);
      assert.equal(text.includes("secret.person@hidden-domain.example"), false, path);
      assert.equal(text.includes("2099-01-01"), false, path);
    }
    const sequence = (await (await read("/api/hunter/read?view=in-sequence")).json()) as { cards: { dnc: { blocked: boolean; reason: string } }[] };
    assert.equal(sequence.cards[0]?.dnc.blocked, false);
  });

  test("unsubscribe: a valid link, a tampered link, and GET writes nothing", async () => {
    const redis = memoryRedis();
    useRedisClientForTests(redis as unknown as LeadsRedis);
    const card = company({ id: "card-unsub", email: "ada.secret@northwind.example" });
    await seed(redis, [card]);
    const token = unsubscribeToken(card.id, WRITE);
    assert.ok(token);
    const payload = JSON.parse(Buffer.from(token.split(".")[0] ?? "", "base64url").toString("utf8")) as Record<string, unknown>;
    assert.deepEqual(payload, { id: card.id });
    assert.equal(token.includes("ada.secret@northwind.example"), false);
    const setsBefore = redis.values.size;
    const hashesBefore = JSON.stringify(redis.hashes);
    const page = await handleUnsubscribe(new Request(`https://www.unearthself.xyz/u/${token}`));
    assert.equal(page.status, 200);
    assert.equal(page.headers.get("referrer-policy"), "no-referrer");
    assert.match(page.headers.get("x-robots-tag") ?? "", /noindex/);
    const html = await page.text();
    assert.match(html, /Unsubscribe/);
    assert.match(html, /a•••@northwind\.example/);
    assert.equal(html.includes("ada.secret@northwind.example"), false);
    assert.equal(html.includes("<script"), false);
    assert.equal(html.includes("vercel"), false);
    assert.match(html, /method="post"/);
    assert.equal(redis.values.size, setsBefore);
    assert.equal(JSON.stringify(redis.hashes), hashesBefore);
    const tampered = `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`;
    const bad = await handleUnsubscribe(new Request(`https://www.unearthself.xyz/u/${tampered}`));
    const badHtml = await bad.text();
    assert.match(badHtml, /This link isn(?:'|&#39;)t valid/);
    assert.equal(badHtml.includes(card.id), false);
    assert.equal(badHtml.includes("ada.secret"), false);
    assert.equal(JSON.stringify(redis.hashes), hashesBefore);
  });

  test("unsubscribe: POST records the opt-out once, and a repeat is idempotent", async () => {
    const redis = memoryRedis();
    useRedisClientForTests(redis as unknown as LeadsRedis);
    const card = company({ id: "card-opt-link", email: "ada.secret@northwind.example" });
    await seed(redis, [card]);
    const token = unsubscribeToken(card.id, WRITE);
    assert.ok(token);
    const first = await handleUnsubscribe(new Request(`https://www.unearthself.xyz/u/${token}`, { method: "POST" }));
    assert.match(await first.text(), /unsubscribed/i);
    const entry = JSON.parse(redis.hashes.get(HUNTER_DNC_KEY)?.["northwind.example|ada.secret@northwind.example"] ?? "{}") as {
      reason: string;
      until: string;
      email: string;
    };
    assert.equal(entry.reason, "unsubscribe");
    assert.equal(entry.until, "never");
    assert.equal(entry.email, "ada.secret@northwind.example");
    const record = JSON.parse(redis.hashes.get(HUNTER_OUTREACH_KEY)?.[card.id] ?? "{}") as {
      optedOutAt?: string;
      optOutSource?: string;
      events: unknown[];
    };
    assert.ok(record.optedOutAt);
    assert.equal(record.optOutSource, "link");
    assert.equal(record.events.length, 1);
    const fields = Object.keys(redis.hashes.get(HUNTER_DNC_KEY) ?? {});
    const second = await handleUnsubscribe(new Request(`https://www.unearthself.xyz/u/${token}`, { method: "POST" }));
    assert.match(await second.text(), /unsubscribed/i);
    const again = JSON.parse(redis.hashes.get(HUNTER_OUTREACH_KEY)?.[card.id] ?? "{}") as { events: unknown[] };
    assert.equal(again.events.length, 1);
    assert.deepEqual(Object.keys(redis.hashes.get(HUNTER_DNC_KEY) ?? {}), fields);
  });

  test("unsubscribe: an unset write token records nothing, and the previous token is not a write credential", async () => {
    const redis = memoryRedis();
    useRedisClientForTests(redis as unknown as LeadsRedis);
    const card = company({ id: "card-rotate" });
    await seed(redis, [card]);
    process.env.HUNTER_WRITE_TOKEN_PREVIOUS = PREVIOUS;
    delete process.env.HUNTER_WRITE_TOKEN;
    const oldLink = unsubscribeToken(card.id, PREVIOUS);
    assert.ok(oldLink);
    const unavailable = await handleUnsubscribe(new Request(`https://www.unearthself.xyz/u/${oldLink}`, { method: "POST" }));
    assert.match(await unavailable.text(), /unavailable/i);
    assert.equal(redis.hashes.get(HUNTER_OUTREACH_KEY), undefined);
    assert.equal(redis.hashes.get(HUNTER_DNC_KEY), undefined);
    process.env.HUNTER_WRITE_TOKEN = WRITE;
    const still = await handleUnsubscribe(new Request(`https://www.unearthself.xyz/u/${oldLink}`, { method: "POST" }));
    assert.match(await still.text(), /unsubscribed/i);
    const record = JSON.parse(redis.hashes.get(HUNTER_OUTREACH_KEY)?.[card.id] ?? "{}") as { optOutSource?: string };
    assert.equal(record.optOutSource, "link");
    const refused = await post(sentBody("card-rotate"), PREVIOUS);
    assert.equal(refused.status, 401);
    const fresh = company({ id: "card-current", domain: "current.example", email: "ada@current.example", emailSource: "https://current.example/contact" });
    await seed(redis, [card, fresh]);
    const allowed = await post(sentBody(fresh.id, { emailSource: fresh.emailSource }));
    assert.equal(allowed.status, 200);
    const minted = unsubscribeUrl(fresh.id);
    assert.equal(minted, `https://www.unearthself.xyz/u/${unsubscribeToken(fresh.id, WRITE)}`);
    assert.notEqual(minted, `https://www.unearthself.xyz/u/${unsubscribeToken(fresh.id, PREVIOUS)}`);
  });
});
