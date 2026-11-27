import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, test } from "node:test";
import { COCO_INTROS, cocoLetter, draftMentionsTessAndI, greetingNameCheck, usableFirstName } from "./coco-letter.ts";
import { humanizerCheck } from "./humanizer.ts";
import { predraftFiledLeads } from "./coco-predraft.ts";
import { HUNTER_DNC_KEY } from "./hunter-config.ts";
import { handleHunterRead } from "./hunter-read.ts";
import {
  HUNTER_OUTREACH_KEY,
  approveAndQueueForCoco,
  approveWording,
  cocoJoin,
  cocoStage,
  handleOutreach,
  draftRejectionCheck,
  readCocoCard,
  saveCocoDraftEdit,
  BADLANDS_PROGRAMME_LINE,
  OUTREACH_CONTACT_LINE,
  OUTREACH_SENDER_IDENTIFICATION_PLACEHOLDER,
  OUTREACH_SOLICITATION_LINE,
  setBadlandsFooterChoiceForTests,
  setUnearthFromAddressForTests,
  storeBackgroundDraft,
  unsubscribeBlock,
  unsubscribeUrl,
  wakeCocoDraft,
  withdrawWording,
} from "./hunter-outreach.ts";
import { mergeHunterCompanies, spendCounterKey } from "./hunter-phase.ts";
import { LEADS_KEY, emptyBook, saveBook, upsertCompany, useRedisClientForTests, type LeadsRedis } from "./leads-book.ts";
import { draftProblems, refreshUnsentDrafts } from "./lead-copy.ts";
import { edmontonToday, type Company } from "./lead-score.ts";

const WRITE = "w".repeat(32);
const CARDS = "c".repeat(32);

function memoryRedis() {
  const values = new Map<string, unknown>();
  const hashes = new Map<string, Record<string, string>>();
  let failOutreach = false;
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
      if (failOutreach && key === HUNTER_OUTREACH_KEY) throw new Error("outreach down");
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
    hashes,
    setFailOutreach(next: boolean) {
      failOutreach = next;
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
    sourceUrl: "https://northwind.example/about",
    why: "The about page names a leadership offsite.",
    whySources: [{ url: "https://northwind.example/about", label: "About" }],
    buyerName: partial.buyerName ?? "Ada North",
    buyerTitle: "People Lead",
    email: partial.email ?? "ada@northwind.example",
    emailSource: partial.emailSource ?? "https://northwind.example/contact",
    timingNote: "",
    timingScore: 0,
    status: "watch",
    filedLeadId: "",
    draftSubject: partial.draftSubject ?? "",
    draftBody: partial.draftBody ?? "",
    lastTouch: "",
    scoutBatch: "",
    source: "hunter",
    review: partial.review ?? "unreviewed",
    hunterScore: partial.hunterScore ?? 70,
    filedOn: partial.filedOn ?? "2026-11-01",
    enrichment: partial.enrichment ?? "enriched",
    contactSource: "Public page",
    place: "Calgary, Alberta, Canada",
    emailMx: partial.emailMx,
    cardFlags: partial.cardFlags,
    pipeline: partial.pipeline ?? "",
    signals: partial.signals,
    profileHits: partial.profileHits,
  };
}

/**
 * @upstash/redis 1.41 hset is (key, fields). The third argument is ignored.
 * A string in the fields slot is stored as one character per index, not as a card.
 */
function upstashRedis() {
  const redis = memoryRedis();
  const hashes = redis.hashes;
  redis.hset = async (key: string, fieldOrFields: string | Record<string, string>, value?: string) => {
    const hash = hashes.get(key) ?? {};
    if (fieldOrFields && typeof fieldOrFields === "object") {
      for (const [field, item] of Object.entries(fieldOrFields)) hash[field] = item;
    } else if (typeof fieldOrFields === "string") {
      for (const [index, char] of Object.entries(fieldOrFields)) hash[index] = char;
      void value;
    }
    hashes.set(key, hash);
    return 1;
  };
  return redis;
}

async function seed(redis: ReturnType<typeof memoryRedis>, companies: Company[]) {
  await redis.set(LEADS_KEY, { ...emptyBook(), companies });
}

async function post(body: unknown) {
  return handleOutreach(
    new Request("https://www.unearthself.xyz/api/hunter/outreach", {
      method: "POST",
      headers: { authorization: `Bearer ${WRITE}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

function letter(cardId: string, type: string, extra: Record<string, unknown> = {}) {
  const event: Record<string, unknown> = {
    eventId: randomUUID(),
    cardId,
    type,
    at: new Date().toISOString(),
    touch: 1,
    ...extra,
  };
  if (type === "drafted" || type === "send_approved") {
    event.subject = extra.subject ?? "A short note";
    event.body = extra.body ?? "Hello from Drumheller.";
  }
  if (type === "drafted") {
    event.variantId = extra.variantId ?? "var-a";
    event.experimentId = extra.experimentId ?? "exp-1";
  }
  return event;
}

function approvableCopy(card: Company, link: string) {
  const draft = cocoLetter(card);
  return { subject: draft.subject, body: `${draft.body}\n\n${unsubscribeBlock(link)}` };
}

describe("coco approve and draft", { concurrency: 1 }, () => {
  const previous: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of ["HUNTER_WRITE_TOKEN", "HUNTER_CARDS_TOKEN", "HUNTER_READ_TOKEN", "COCO_DRAFT_WEBHOOK_URL", "COCO_DRAFT_WEBHOOK_KEY", "COCO_DRAFT_WEBHOOK_HEADER"]) {
      previous[key] = process.env[key];
    }
    process.env.HUNTER_WRITE_TOKEN = WRITE;
    process.env.HUNTER_CARDS_TOKEN = CARDS;
    setBadlandsFooterChoiceForTests("A");
    setUnearthFromAddressForTests(null);
    delete process.env.COCO_DRAFT_WEBHOOK_URL;
    delete process.env.COCO_DRAFT_WEBHOOK_KEY;
    delete process.env.COCO_DRAFT_WEBHOOK_HEADER;
  });

  afterEach(() => {
    setBadlandsFooterChoiceForTests(null);
    setUnearthFromAddressForTests(null);
    useRedisClientForTests(null);
    for (const [key, value] of Object.entries(previous)) {
      if (value == null) delete process.env[key];
      else process.env[key] = value;
    }
  });

  test("a rejected coco event logs the card id and the reason code", async () => {
    const redis = memoryRedis();
    useRedisClientForTests(redis as unknown as LeadsRedis);
    const card = company({ id: "campfire" });
    await seed(redis, [card]);
    const lines: string[] = [];
    const original = console.info;
    console.info = (line?: unknown) => {
      lines.push(String(line ?? ""));
    };
    try {
      const drafting = await post(letter(card.id, "drafting"));
      assert.equal(drafting.status, 409);
    } finally {
      console.info = original;
    }
    const reason = lines
      .map((line) => {
        try {
          return JSON.parse(line) as { coco?: string; cardId?: string; error?: string };
        } catch {
          return null;
        }
      })
      .find((item) => item?.coco === "rejected");
    assert.equal(reason?.error, "queue");
    assert.equal(reason?.cardId, card.id);
    assert.equal(JSON.stringify(reason).includes("@"), false);
  });

  test("a 400 names the failed check and stores no draft text", async () => {
    const redis = memoryRedis();
    useRedisClientForTests(redis as unknown as LeadsRedis);
    const card = company({ id: "reject-card" });
    await seed(redis, [card]);
    assert.equal((await approveAndQueueForCoco({ cardId: card.id, queuedBy: "chris@unearthself.xyz" })).ok, true);
    const lines: string[] = [];
    const original = console.info;
    console.info = (line?: unknown) => {
      lines.push(String(line ?? ""));
    };
    const secret = "BODY-SECRET-REJECT";
    try {
      const cases: Array<{ body: Record<string, unknown>; check: string; field: string }> = [
        { body: letter(card.id, "drafted", { eventId: "not-a-uuid" }), check: "eventId-not-uuidv4", field: "eventId" },
        { body: letter(card.id, "drafted", { subject: "SUBJECT-SECRET\nline", body: "Hello." }), check: "subject-multiline", field: "subject" },
        { body: letter(card.id, "drafted", { body: `${secret}${"a".repeat(4096)}` }), check: "body-too-long", field: "body" },
        { body: letter(card.id, "drafted", { body: `${secret} \u2014 there` }), check: "em-dash", field: "body" },
        { body: letter(card.id, "drafted", { body: `${secret} is $12` }), check: "price", field: "body" },
        { body: letter(card.id, "drafted", { experimentId: "not a slug" }), check: "experimentId", field: "experimentId" },
        { body: letter(card.id, "drafted", { variantId: "not a slug" }), check: "variantId", field: "variantId" },
        { body: letter(card.id, "drafted", { touch: undefined }), check: "missing-touch", field: "touch" },
      ];
      for (const item of cases) {
        const response = await post(item.body);
        assert.equal(response.status, 400, item.check);
        assert.deepEqual(await response.json(), { error: "invalid", field: item.field });
      }
    } finally {
      console.info = original;
    }
    const logged = lines.map((line) => JSON.parse(line) as { cardId?: string; type?: string; status?: number; check?: string });
    for (const check of ["eventId-not-uuidv4", "subject-multiline", "body-too-long", "em-dash", "price", "experimentId", "variantId", "missing-touch"]) {
      const line = logged.find((item) => item.check === check);
      assert.equal(line?.cardId, card.id, check);
      assert.equal(line?.type, "drafted", check);
      assert.equal(line?.status, 400, check);
    }
    const text = lines.join("\n");
    assert.equal(text.includes(secret), false);
    assert.equal(text.includes("SUBJECT-SECRET"), false);
    assert.equal(text.includes(WRITE), false);
    assert.equal(text.includes("\u2014"), false);
    const stored = JSON.parse(redis.hashes.get(HUNTER_OUTREACH_KEY)?.[card.id] ?? "{}") as {
      draftRejected?: { at?: string; check?: string };
      drafts?: unknown;
    };
    assert.equal(stored.draftRejected?.check, "missing-touch");
    assert.match(stored.draftRejected?.at ?? "", /^\d{4}-\d{2}-\d{2}T/);
    assert.equal(JSON.stringify(stored).includes("a".repeat(80)), false);
    assert.equal(JSON.stringify(stored).includes("SUBJECT-SECRET"), false);
    const view = await readCocoCard(card.id);
    assert.equal(view?.draftRejected?.check, "missing-touch");
    assert.equal(view?.subject, "A short note");
    assert.equal(view?.body.includes("$12"), true);
    const accepted = await post(letter(card.id, "drafted", { subject: "A short note", body: "Hello from Drumheller." }));
    assert.equal(accepted.status, 200);
    const after = JSON.parse(redis.hashes.get(HUNTER_OUTREACH_KEY)?.[card.id] ?? "{}") as { draftRejected?: unknown };
    assert.equal(after.draftRejected, undefined);
    const ready = await readCocoCard(card.id);
    assert.equal(ready?.draftRejected, null);
    assert.equal(ready?.subject, "A short note");
    assert.equal(ready?.body.includes("Hello from Drumheller."), true);
  });

  test("draft sources are stored beside the letter and stay out of the email", async () => {
    const redis = memoryRedis();
    useRedisClientForTests(redis as unknown as LeadsRedis);
    const card = company({ id: "sourced" });
    await seed(redis, [card]);
    assert.equal((await approveAndQueueForCoco({ cardId: card.id, queuedBy: "chris@unearthself.xyz" })).ok, true);
    const link = unsubscribeUrl(card.id) ?? "";
    const page = "https://northwind.example/offsite";
    const later = "https://northwind.example/news";

    const plain = await post(letter(card.id, "drafted", { subject: "A short note", body: "Hello from Drumheller." }));
    assert.equal(plain.status, 200);
    const bare = JSON.parse(redis.hashes.get(HUNTER_OUTREACH_KEY)?.[card.id] ?? "{}") as {
      drafts: { "1": { body: string; sources?: unknown } };
    };
    assert.equal(bare.drafts["1"].sources, undefined);
    assert.equal(bare.drafts["1"].body.includes(page), false);
    assert.equal(bare.drafts["1"].body.includes(link), true);

    const cited = await post(letter(card.id, "drafted", {
      subject: "A short note",
      body: "Hello from Drumheller.",
      sources: [{ url: page, note: "Leadership offsite" }, { url: `${page}/team` }],
    }));
    assert.equal(cited.status, 200);
    const stored = JSON.parse(redis.hashes.get(HUNTER_OUTREACH_KEY)?.[card.id] ?? "{}") as {
      drafts: { "1": { subject: string; body: string; sources?: Array<{ url: string; note?: string }> } };
      events: Array<Record<string, unknown>>;
    };
    assert.deepEqual(stored.drafts["1"].sources, [
      { url: page, note: "Leadership offsite" },
      { url: `${page}/team` },
    ]);
    assert.equal(stored.drafts["1"].body.includes(page), false);
    assert.equal(stored.drafts["1"].body.includes(link), true);
    assert.equal(stored.events.some((event) => "sources" in event), false);
    const joined = await readCocoCard(card.id);
    assert.deepEqual(joined?.sources, stored.drafts["1"].sources);
    assert.equal(joined?.body.includes(page), false);

    const lines: string[] = [];
    const original = console.info;
    console.info = (line?: unknown) => {
      lines.push(String(line ?? ""));
    };
    const junk: Array<{ sources: unknown; label: string }> = [
      { label: "http", sources: [{ url: "http://northwind.example/offsite" }] },
      { label: "script", sources: [{ url: "javascript:alert(1)" }] },
      { label: "extra", sources: [{ url: page, label: "nope" }] },
      { label: "note", sources: [{ url: page, note: 4 }] },
      { label: "shape", sources: "https://northwind.example/offsite" },
      { label: "missing-url", sources: [{ note: "Leadership offsite" }] },
      { label: "cap", sources: Array.from({ length: 11 }, (_, index) => ({ url: `https://northwind.example/p${index}` })) },
    ];
    try {
      for (const item of junk) {
        const response = await post(letter(card.id, "drafted", { sources: item.sources }));
        assert.equal(response.status, 400, item.label);
        assert.deepEqual(await response.json(), { error: "invalid", field: "sources" });
      }
      const onSend = await post(letter(card.id, "send_approved", { body: `Hello from Drumheller.\n${link}`, sources: [{ url: page }] }));
      assert.equal(onSend.status, 400);
      assert.deepEqual(await onSend.json(), { error: "invalid", field: "sources" });
    } finally {
      console.info = original;
    }
    const logged = lines.map((line) => JSON.parse(line) as { cardId?: string; type?: string; status?: number; check?: string; field?: string });
    const rejected = logged.filter((item) => item.check === "sources");
    assert.equal(rejected.length, junk.length + 1);
    for (const line of rejected) {
      assert.equal(line.cardId, card.id);
      assert.equal(line.status, 400);
    }
    assert.equal(lines.join("\n").includes(page), false);
    const kept = JSON.parse(redis.hashes.get(HUNTER_OUTREACH_KEY)?.[card.id] ?? "{}") as {
      drafts: { "1": { sources?: Array<{ url: string }> } };
      sendApproved?: unknown;
    };
    assert.deepEqual(kept.drafts["1"].sources, stored.drafts["1"].sources);
    assert.equal(kept.sendApproved, undefined);

    const ten = Array.from({ length: 10 }, (_, index) => ({ url: `https://northwind.example/p${index}` }));
    assert.equal((await post(letter(card.id, "drafted", { sources: ten }))).status, 200);
    const capped = JSON.parse(redis.hashes.get(HUNTER_OUTREACH_KEY)?.[card.id] ?? "{}") as {
      drafts: { "1": { sources?: unknown[] } };
    };
    assert.equal(capped.drafts["1"].sources?.length, 10);

    const edited = await saveCocoDraftEdit({
      cardId: card.id,
      touch: 1,
      subject: "Edited subject",
      body: "Edited letter.",
    });
    assert.equal(edited.ok, true);
    const afterEdit = JSON.parse(redis.hashes.get(HUNTER_OUTREACH_KEY)?.[card.id] ?? "{}") as {
      drafts: { "1": { editedSubject?: string; editedBody?: string; sources?: Array<{ url: string }> } };
    };
    assert.equal(afterEdit.drafts["1"].editedSubject, "Edited subject");
    assert.equal(afterEdit.drafts["1"].editedBody?.includes(page), false);
    assert.equal(afterEdit.drafts["1"].editedBody?.includes("https://northwind.example/p0"), false);
    assert.equal(afterEdit.drafts["1"].editedBody?.includes(link), true);
    assert.deepEqual(afterEdit.drafts["1"].sources, ten);

    const replaced = await post(letter(card.id, "drafted", {
      body: "The latest letter.",
      sources: [{ url: later, note: "A later page" }],
    }));
    assert.equal(replaced.status, 200);
    const next = JSON.parse(redis.hashes.get(HUNTER_OUTREACH_KEY)?.[card.id] ?? "{}") as {
      drafts: { "1": { body: string; sources?: Array<{ url: string; note?: string }> } };
    };
    assert.deepEqual(next.drafts["1"].sources, [{ url: later, note: "A later page" }]);
    assert.equal(next.drafts["1"].body.includes(later), false);
    assert.equal(next.drafts["1"].body.includes("https://northwind.example/p0"), false);

    const cleared = await post(letter(card.id, "drafted", { body: "No citations." }));
    assert.equal(cleared.status, 200);
    const gone = JSON.parse(redis.hashes.get(HUNTER_OUTREACH_KEY)?.[card.id] ?? "{}") as {
      drafts: { "1": { sources?: unknown } };
    };
    assert.equal(gone.drafts["1"].sources, undefined);

    const restored = await post(letter(card.id, "drafted", {
      body: "Hello from Drumheller.",
      sources: [{ url: page, note: "Leadership offsite" }],
    }));
    assert.equal(restored.status, 200);
    const approved = await approveWording({ cardId: card.id, ...approvableCopy(card, link) });
    assert.equal(approved.ok, true);
    const sent = JSON.parse(redis.hashes.get(HUNTER_OUTREACH_KEY)?.[card.id] ?? "{}") as {
      sendApproved?: Record<string, unknown>;
      drafts: { "1": { sources?: Array<{ url: string }> } };
    };
    assert.deepEqual(Object.keys(sent.sendApproved ?? {}).sort(), ["at", "body", "eventId", "subject", "touch"]);
    assert.equal(String(sent.sendApproved?.body).includes(page), false);
    assert.equal(JSON.stringify(sent.sendApproved).includes("sources"), false);
    assert.deepEqual(sent.drafts["1"].sources, [{ url: page, note: "Leadership offsite" }]);

    const cardView = await handleHunterRead(
      new Request(`https://www.unearthself.xyz/api/hunter/read?view=card&id=${card.id}`, {
        headers: { authorization: `Bearer ${CARDS}` },
      }),
    );
    const cardBody = (await cardView.json()) as { card: { sendApproved: Record<string, unknown> | null } };
    assert.equal(JSON.stringify(cardBody.card.sendApproved).includes(page), false);
    assert.equal(JSON.stringify(cardBody.card.sendApproved).includes("sources"), false);
  });

  test("the coco wake log names the card and not the key", async () => {
    process.env.COCO_DRAFT_WEBHOOK_URL = "https://coco.example/hook";
    process.env.COCO_DRAFT_WEBHOOK_KEY = "secret-key";
    process.env.COCO_DRAFT_WEBHOOK_HEADER = "X-Coco-Key";
    const lines: string[] = [];
    const original = console.info;
    console.info = (line?: unknown) => {
      lines.push(String(line ?? ""));
    };
    try {
      const woke = await wakeCocoDraft("ready-card", async () => ({ status: 202 }));
      assert.equal(woke.status, 202);
      const failed = await wakeCocoDraft("ready-card", async () => {
        throw new Error("webhook down");
      });
      assert.equal(failed.status, 0);
    } finally {
      console.info = original;
    }
    assert.deepEqual(JSON.parse(lines[0] ?? "{}"), { webhook: "coco-draft", cardId: "ready-card", status: 202 });
    assert.deepEqual(JSON.parse(lines[1] ?? "{}"), { webhook: "coco-draft", cardId: "ready-card", status: 0 });
    const text = lines.join("\n");
    assert.equal(text.includes("secret-key"), false);
    assert.equal(text.includes("X-Coco-Key"), false);
    assert.equal(text.includes("webhook down"), false);
  });

  test("a draft gains the plain unsubscribe link once, and a missing token is refused", async () => {
    const redis = memoryRedis();
    useRedisClientForTests(redis as unknown as LeadsRedis);
    const card = company({ id: "lupio" });
    await seed(redis, [card]);
    assert.equal((await approveAndQueueForCoco({ cardId: card.id, queuedBy: "chris@unearthself.xyz" })).ok, true);
    const link = unsubscribeUrl(card.id);
    assert.ok(link);
    const lines: string[] = [];
    const original = console.info;
    console.info = (line?: unknown) => {
      lines.push(String(line ?? ""));
    };
    const secret = "BODY-SECRET-DRAFT";
    try {
      const missing = await post(letter(card.id, "drafted", { body: secret }));
      assert.equal(missing.status, 200);
      const present = await post(letter(card.id, "drafted", { body: `Already linked.\n\n${link}` }));
      assert.equal(present.status, 200);
    } finally {
      console.info = original;
    }
    const stored = JSON.parse(redis.hashes.get(HUNTER_OUTREACH_KEY)?.[card.id] ?? "{}") as {
      drafts: { "1": { body: string; unsubscribeAppended?: boolean } };
    };
    assert.equal(stored.drafts["1"].body, `Already linked.\n\n${link}`);
    assert.equal(stored.drafts["1"].body.split(link).length - 1, 1);
    assert.equal(stored.drafts["1"].unsubscribeAppended, undefined);
    const added = lines
      .map((line) => {
        try {
          return JSON.parse(line) as { coco?: string; cardId?: string; appended?: boolean };
        } catch {
          return null;
        }
      })
      .filter((item) => item?.coco === "draft-missing-unsubscribe");
    assert.equal(added.length, 1);
    assert.deepEqual(added[0], { coco: "draft-missing-unsubscribe", cardId: card.id, appended: true });
    assert.equal(lines.join("\n").includes(secret), false);

    const edited = await saveCocoDraftEdit({ cardId: card.id, touch: 1, subject: "Newer", body: "Edited letter" });
    assert.equal(edited.ok, true);
    const afterEdit = JSON.parse(redis.hashes.get(HUNTER_OUTREACH_KEY)?.[card.id] ?? "{}") as {
      drafts: { "1": { editedBody?: string; unsubscribeAppended?: boolean } };
    };
    assert.equal(afterEdit.drafts["1"].editedBody, `Edited letter\n\n${unsubscribeBlock(link)}`);
    assert.equal(afterEdit.drafts["1"].unsubscribeAppended, true);
    const again = await saveCocoDraftEdit({
      cardId: card.id,
      touch: 1,
      subject: "Newer",
      body: afterEdit.drafts["1"].editedBody ?? "",
    });
    assert.equal(again.ok, true);
    const kept = JSON.parse(redis.hashes.get(HUNTER_OUTREACH_KEY)?.[card.id] ?? "{}") as {
      drafts: { "1": { editedBody?: string } };
    };
    assert.equal(kept.drafts["1"].editedBody, `Edited letter\n\n${unsubscribeBlock(link)}`);

    const view = await readCocoCard(card.id);
    assert.equal(view?.body, `Edited letter\n\n${unsubscribeBlock(link)}`);
    assert.equal(view?.canApproveWording, false);
    assert.equal((view?.humanizerNotes ?? []).some((note) => note.includes("120 to 180")), true);
    assert.equal(view?.unsubscribeAppended, true);
    assert.equal(view?.wordingNote, "");

    await redis.hset(
      HUNTER_OUTREACH_KEY,
      card.id,
      JSON.stringify({
        cardId: card.id,
        touches: 0,
        events: [],
        drafts: { "1": { subject: "Old", body: "Stored without a link." } },
      }),
    );
    const backfillLines: string[] = [];
    console.info = (line?: unknown) => {
      backfillLines.push(String(line ?? ""));
    };
    let filled: Awaited<ReturnType<typeof readCocoCard>> = null;
    try {
      filled = await readCocoCard(card.id);
      const second = await readCocoCard(card.id);
      assert.equal(second?.body, `Stored without a link.\n\n${unsubscribeBlock(link)}`);
    } finally {
      console.info = original;
    }
    assert.equal(filled?.body, `Stored without a link.\n\n${unsubscribeBlock(link)}`);
    assert.equal(filled?.canApproveWording, false);
    assert.equal(filled?.unsubscribeAppended, true);
    const fills = backfillLines.filter((line) => line.includes("draft-missing-unsubscribe"));
    assert.equal(fills.length, 1);
    const backed = JSON.parse(redis.hashes.get(HUNTER_OUTREACH_KEY)?.[card.id] ?? "{}") as {
      drafts: { "1": { body: string } };
    };
    assert.equal(backed.drafts["1"].body.split(link).length - 1, 2);

    assert.equal(unsubscribeUrl(card.id, ""), null);
    delete process.env.HUNTER_WRITE_TOKEN;
    const refusedLines: string[] = [];
    console.info = (line?: unknown) => {
      refusedLines.push(String(line ?? ""));
    };
    let refused: Awaited<ReturnType<typeof saveCocoDraftEdit>>;
    try {
      refused = await saveCocoDraftEdit({ cardId: card.id, touch: 1, subject: "Newer", body: "TOKEN-SECRET-BODY" });
    } finally {
      console.info = original;
    }
    assert.equal(refused.ok, false);
    if (!refused.ok) assert.equal(refused.error, "no-unsubscribe");
    const reason = refusedLines
      .map((line) => {
        try {
          return JSON.parse(line) as { coco?: string; cardId?: string; error?: string; status?: number };
        } catch {
          return null;
        }
      })
      .find((item) => item?.coco === "rejected");
    assert.deepEqual(reason, { coco: "rejected", cardId: card.id, error: "no-unsubscribe", status: 409 });
    assert.equal(refusedLines.join("\n").includes("TOKEN-SECRET-BODY"), false);
    const quiet = JSON.parse(redis.hashes.get(HUNTER_OUTREACH_KEY)?.[card.id] ?? "{}") as {
      drafts: { "1": { body: string; editedBody?: string } };
    };
    assert.equal(quiet.drafts["1"].body.includes("TOKEN-SECRET-BODY"), false);
    assert.equal(quiet.drafts["1"].editedBody ?? "", "");
    process.env.HUNTER_WRITE_TOKEN = WRITE;
  });

  test("approve leaves the card queued when Redis hset stores a field map", async () => {
    const redis = upstashRedis();
    useRedisClientForTests(redis as unknown as LeadsRedis);
    const card = company({ id: "campfire", org: "Campfire Company" });
    await seed(redis, [card]);
    const result = await approveAndQueueForCoco({ cardId: card.id, queuedBy: "chris@unearthself.xyz" });
    assert.equal(result.ok, true);
    const stored = JSON.parse(redis.hashes.get(HUNTER_OUTREACH_KEY)?.campfire ?? "{}") as {
      queue?: { queuedAt?: string; queuedBy?: string };
    };
    assert.equal(stored.queue?.queuedBy, "chris@unearthself.xyz");
    assert.equal((await readCocoCard(card.id))?.stage, "queued");
    const drafting = await post(letter(card.id, "drafting"));
    assert.equal(drafting.status, 200);
  });

  test("a card under 70 with a person and a verified email can be queued", async () => {
    const redis = memoryRedis();
    useRedisClientForTests(redis as unknown as LeadsRedis);
    const watch = company({ id: "watch-band", city: "Calgary", sizeBand: "80-800", industry: "other" });
    const hold = company({ id: "hold-band", city: "Elsewhere", sizeBand: "unknown", industry: "other" });
    const flagged = company({ id: "stale-band", cardFlags: ["Stale"] });
    const blank = company({ id: "blank-band", email: "   " });
    await seed(redis, [watch, hold, flagged, blank]);
    for (const card of [watch, hold]) {
      assert.equal(cocoJoin(card, null, [], "2026-11-20").canApproveDraft, true, card.id);
      const result = await approveAndQueueForCoco({ cardId: card.id, queuedBy: "chris@unearthself.xyz" });
      assert.equal(result.ok, true, card.id);
    }
    for (const card of [flagged, blank]) {
      assert.equal(cocoJoin(card, null, [], "2026-11-20").canApproveDraft, false, card.id);
      const result = await approveAndQueueForCoco({ cardId: card.id, queuedBy: "chris@unearthself.xyz" });
      assert.equal(result.ok, false, card.id);
    }
  });

  test("blocked cards are refused with no write, and a second press queues once", async () => {
    const redis = memoryRedis();
    useRedisClientForTests(redis as unknown as LeadsRedis);
    const cases = [
      company({ id: "not-ready", enrichment: "not-enriched" }),
      company({ id: "quiet", cardFlags: ["No unsolicited email"] }),
      company({ id: "stale", cardFlags: ["Stale"] }),
      company({ id: "unverified", cardFlags: ["Apollo email not verified"] }),
      company({ id: "mx", emailMx: false }),
      company({ id: "blank", email: "" }),
      company({ id: "blocked", domain: "blocked.example", email: "ada@blocked.example" }),
      company({ id: "bounced-mail" }),
      company({ id: "sent-card" }),
    ];
    await seed(redis, cases);
    await redis.hset(
      HUNTER_DNC_KEY,
      "blocked.example|ada@blocked.example",
      JSON.stringify({ domain: "blocked.example", email: "ada@blocked.example", reason: "unsubscribe", addedOn: "2026-11-01", until: "never" }),
    );
    await redis.hset(
      HUNTER_OUTREACH_KEY,
      "bounced-mail",
      JSON.stringify({ cardId: "bounced-mail", touches: 0, bouncedEmail: "ada@northwind.example", events: [] }),
    );
    await redis.hset(
      HUNTER_OUTREACH_KEY,
      "sent-card",
      JSON.stringify({ cardId: "sent-card", touches: 1, firstSentAt: new Date().toISOString(), events: [] }),
    );
    for (const card of cases) {
      const result = await approveAndQueueForCoco({ cardId: card.id, queuedBy: "chris@unearthself.xyz" });
      assert.equal(result.ok, false, card.id);
      if (!result.ok) assert.ok((result.reasons?.length ?? 0) > 0, card.id);
    }
    const book = await redis.get<{ companies: Company[] }>(LEADS_KEY);
    assert.equal(book?.companies.every((item) => item.review !== "approved"), true);
    assert.equal(redis.hashes.get(HUNTER_OUTREACH_KEY)?.["not-ready"], undefined);

    delete process.env.HUNTER_WRITE_TOKEN;
    const noLink = await approveAndQueueForCoco({ cardId: "not-ready", queuedBy: "chris@unearthself.xyz" });
    assert.equal(noLink.ok, false);
    process.env.HUNTER_WRITE_TOKEN = WRITE;

    const ready = company({ id: "ready" });
    await seed(redis, [ready]);
    const calls: { url: string; body: string; header: string }[] = [];
    process.env.COCO_DRAFT_WEBHOOK_URL = "https://coco.example/hook";
    process.env.COCO_DRAFT_WEBHOOK_KEY = "secret-key";
    process.env.COCO_DRAFT_WEBHOOK_HEADER = "X-Coco-Key";
    const fetchImpl = async (url: string, init: { headers: Record<string, string>; body: string }) => {
      calls.push({ url, body: init.body, header: init.headers["X-Coco-Key"] ?? "" });
      return { status: 202 };
    };
    const first = await approveAndQueueForCoco({ cardId: ready.id, queuedBy: "chris@unearthself.xyz", fetchImpl });
    const second = await approveAndQueueForCoco({ cardId: ready.id, queuedBy: "chris@unearthself.xyz", fetchImpl });
    assert.equal(first.ok, true);
    assert.equal(second.ok, true);
    assert.equal(calls.length, 1);
    assert.deepEqual(JSON.parse(calls[0]?.body ?? "{}"), { cardId: "ready" });
    assert.equal(calls[0]?.header, "secret-key");
    const stored = JSON.parse(redis.hashes.get(HUNTER_OUTREACH_KEY)?.ready ?? "{}") as { queue?: { queuedAt: string } };
    assert.ok(stored.queue?.queuedAt);

    const quiet = company({ id: "quiet-hook" });
    await seed(redis, [ready, quiet]);
    delete process.env.COCO_DRAFT_WEBHOOK_URL;
    delete process.env.COCO_DRAFT_WEBHOOK_KEY;
    delete process.env.COCO_DRAFT_WEBHOOK_HEADER;
    const unset = await approveAndQueueForCoco({
      cardId: quiet.id,
      queuedBy: "chris@unearthself.xyz",
      fetchImpl: async () => {
        throw new Error("should not be called");
      },
    });
    assert.equal(unset.ok, true);
    assert.ok(JSON.parse(redis.hashes.get(HUNTER_OUTREACH_KEY)?.["quiet-hook"] ?? "{}").queue?.queuedAt);
  });

  test("a webhook timeout or failure still queues the card", async () => {
    const redis = memoryRedis();
    useRedisClientForTests(redis as unknown as LeadsRedis);
    await seed(redis, [company({ id: "wake" }), company({ id: "slow" })]);
    process.env.COCO_DRAFT_WEBHOOK_URL = "https://coco.example/hook";
    process.env.COCO_DRAFT_WEBHOOK_KEY = "secret-key";
    process.env.COCO_DRAFT_WEBHOOK_HEADER = "X-Coco-Key";
    const failed = await approveAndQueueForCoco({
      cardId: "wake",
      queuedBy: "chris@unearthself.xyz",
      fetchImpl: async () => {
        throw new Error("down");
      },
    });
    assert.equal(failed.ok, true);
    const hung = await approveAndQueueForCoco({
      cardId: "slow",
      queuedBy: "chris@unearthself.xyz",
      fetchImpl: (_url, init) =>
        new Promise((_resolve, reject) => {
          const timer = setTimeout(() => reject(new Error("stall")), 3000);
          init.signal.addEventListener("abort", () => {
            clearTimeout(timer);
            reject(new Error("aborted"));
          });
        }),
    });
    assert.equal(hung.ok, true);
    assert.ok(JSON.parse(redis.hashes.get(HUNTER_OUTREACH_KEY)?.slow ?? "{}").queue?.queuedAt);
  });

  test("if the queue write fails the card stays approved and is not listed", async () => {
    const redis = memoryRedis();
    useRedisClientForTests(redis as unknown as LeadsRedis);
    await seed(redis, [company({ id: "queue-fail" })]);
    redis.setFailOutreach(true);
    const result = await approveAndQueueForCoco({ cardId: "queue-fail", queuedBy: "chris@unearthself.xyz" });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error, "queue");
    const book = await redis.get<{ companies: Company[] }>(LEADS_KEY);
    assert.equal(book?.companies[0]?.review, "approved");
    assert.equal(redis.hashes.get(HUNTER_OUTREACH_KEY)?.["queue-fail"], undefined);
    process.env.HUNTER_CARDS_TOKEN = CARDS;
    const queued = await handleHunterRead(
      new Request("https://www.unearthself.xyz/api/hunter/read?view=queued", {
        headers: { authorization: `Bearer ${CARDS}` },
      }),
    );
    assert.equal(queued.status, 200);
    assert.equal(((await queued.json()) as { total: number }).total, 0);
  });

  test("claims, drafts, send approval, skips, and follow-up touches", async () => {
    const redis = memoryRedis();
    useRedisClientForTests(redis as unknown as LeadsRedis);
    const card = company({ id: "coco" });
    await seed(redis, [card]);
    assert.equal((await approveAndQueueForCoco({ cardId: card.id, queuedBy: "chris@unearthself.xyz" })).ok, true);
    const firstClaim = await post({ eventId: randomUUID(), cardId: card.id, type: "drafting", at: new Date().toISOString(), touch: 1 });
    assert.equal(firstClaim.status, 200);
    const secondClaim = await post({ eventId: randomUUID(), cardId: card.id, type: "drafting", at: new Date().toISOString(), touch: 1 });
    assert.equal(secondClaim.status, 409);
    assert.equal(((await secondClaim.json()) as { error: string }).error, "claimed");

    const raw = JSON.parse(redis.hashes.get(HUNTER_OUTREACH_KEY)?.coco ?? "{}") as {
      drafts: { "1": { claim: { at: string } } };
    };
    raw.drafts["1"].claim.at = new Date(Date.now() - 16 * 60 * 1000).toISOString();
    await redis.hset(HUNTER_OUTREACH_KEY, "coco", JSON.stringify(raw));
    const takeover = await post({ eventId: randomUUID(), cardId: card.id, type: "drafting", at: new Date().toISOString(), touch: 1 });
    assert.equal(takeover.status, 200);

    const bare = JSON.parse(redis.hashes.get(HUNTER_OUTREACH_KEY)?.coco ?? "{}") as {
      drafts: { "1": { claim?: { eventId: string; at: string } } };
      events: unknown[];
    };
    bare.drafts["1"].claim = { eventId: randomUUID(), at: new Date().toISOString() };
    await redis.hset(HUNTER_OUTREACH_KEY, "coco", JSON.stringify(bare));
    const stolen = await post(letter(card.id, "drafted"));
    assert.equal(stolen.status, 409);

    const expired = JSON.parse(redis.hashes.get(HUNTER_OUTREACH_KEY)?.coco ?? "{}") as {
      drafts: { "1": { claim?: { at: string } } };
    };
    if (expired.drafts["1"].claim) expired.drafts["1"].claim.at = new Date(Date.now() - 16 * 60 * 1000).toISOString();
    await redis.hset(HUNTER_OUTREACH_KEY, "coco", JSON.stringify(expired));
    const logs: string[] = [];
    const original = console.info;
    console.info = (...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    };
    const link = unsubscribeUrl(card.id) ?? "";
    const drafted = await post(letter(card.id, "drafted", { subject: "SUBJECT-SECRET", body: `BODY-SECRET\n${link}` }));
    console.info = original;
    assert.equal(drafted.status, 200);
    assert.equal(logs.join("\n").includes("SUBJECT-SECRET"), false);
    assert.equal(logs.join("\n").includes("BODY-SECRET"), false);
    const afterDraft = JSON.parse(redis.hashes.get(HUNTER_OUTREACH_KEY)?.coco ?? "{}") as {
      events: Array<Record<string, unknown>>;
      drafts: { "1": { subject: string; body: string } };
    };
    assert.equal(JSON.stringify(afterDraft.events).includes("SUBJECT-SECRET"), false);
    assert.equal(afterDraft.drafts["1"].subject, "SUBJECT-SECRET");

    const again = await post(letter(card.id, "drafted", { subject: "Newer", body: "The latest letter." }));
    assert.equal(again.status, 200);
    const latest = JSON.parse(redis.hashes.get(HUNTER_OUTREACH_KEY)?.coco ?? "{}") as { drafts: { "1": { subject: string } } };
    assert.equal(latest.drafts["1"].subject, "Newer");

    const huge = await post(letter(card.id, "drafted", { body: "a".repeat(4097) }));
    assert.equal(huge.status, 400);
    const dash = await post(letter(card.id, "drafted", { body: "Hello \u2014 there" }));
    assert.equal(dash.status, 400);
    const price = await post(letter(card.id, "drafted", { body: "The fee is $12" }));
    assert.equal(price.status, 400);

    const edited = await saveCocoDraftEdit({ cardId: card.id, touch: 1, subject: "Newer", body: "Edited \u2014 copy is $12" });
    assert.equal(edited.ok, true);
    if (edited.ok) assert.equal((edited.warnings ?? []).length, 2);
    const book = await redis.get<{ companies: Company[] }>(LEADS_KEY);
    assert.equal(book?.companies[0]?.draftBody ?? "", "");

    const missingLink = await approveWording({ cardId: card.id, subject: "Newer", body: "No link here." });
    assert.equal(missingLink.ok, false);
    const copy = approvableCopy(card, link);
    const approved = await approveWording({ cardId: card.id, ...copy });
    assert.equal(approved.ok, true);
    if (approved.ok) assert.equal(approved.stage, "wording-approved");
    const duplicateApproval = await post(letter(card.id, "send_approved", { body: `Again\n${link}` }));
    assert.equal(duplicateApproval.status, 409);

    const cardView = await handleHunterRead(
      new Request(`https://www.unearthself.xyz/api/hunter/read?view=card&id=${card.id}`, {
        headers: { authorization: `Bearer ${CARDS}` },
      }),
    );
    const cardBody = (await cardView.json()) as {
      card: { stage: string; sendApproved: { eventId: string; subject: string; body: string; touch: number } | null };
    };
    assert.equal(cardBody.card.stage, "wording-approved");
    assert.equal(cardBody.card.sendApproved?.subject, copy.subject);
    assert.equal(cardBody.card.sendApproved?.touch, 1);
    assert.ok(cardBody.card.sendApproved?.eventId);

    const queued = await handleHunterRead(
      new Request("https://www.unearthself.xyz/api/hunter/read?view=queued", {
        headers: { authorization: `Bearer ${CARDS}` },
      }),
    );
    const queuedBody = (await queued.json()) as { cards: { id: string }[] };
    assert.equal(queuedBody.cards.some((item) => item.id === card.id), true);

    const withdrawn = await withdrawWording({ cardId: card.id });
    assert.equal(withdrawn.ok, true);
    const reapproved = await approveWording({ cardId: card.id, ...approvableCopy(card, link) });
    assert.equal(reapproved.ok, true);

    const sent = await post({
      eventId: randomUUID(),
      cardId: card.id,
      type: "sent",
      at: new Date().toISOString(),
      touch: 1,
      experimentId: "exp-1",
      variantId: "var-a",
      threadId: "thread-1",
      fromAddress: "chris@badlandsbootcamp.com",
      consentBasis: "public-page",
      emailSource: card.emailSource,
      subject: "Changed in chat",
      body: `Changed in chat.\n${link}`,
    });
    assert.equal(sent.status, 200);
    const sentRecord = JSON.parse(redis.hashes.get(HUNTER_OUTREACH_KEY)?.coco ?? "{}") as {
      edited?: boolean;
      sendApproved?: { body: string };
      drafts: { "1": { sent?: { body: string } } };
    };
    assert.equal(sentRecord.edited, true);
    assert.equal(sentRecord.sendApproved?.body.includes("I'm Christopher"), true);
    assert.equal(sentRecord.sendApproved?.body.includes("Unearth Self"), true);
    assert.match(sentRecord.sendApproved?.body ?? "", /<a href="https:\/\/www\.unearthself\.xyz\/u\/[^"]+">Unsubscribe here<\/a>/);
    assert.match(sentRecord.sendApproved?.body ?? "", /Don't want these emails\? Unsubscribe here and we won't contact you again\.\nhttps:\/\/www\.unearthself\.xyz\/u\//);
    assert.equal(sentRecord.sendApproved?.body.includes(OUTREACH_CONTACT_LINE), true);
    assert.equal(sentRecord.sendApproved?.body.includes(OUTREACH_SOLICITATION_LINE), true);
    assert.equal(sentRecord.sendApproved?.body.includes(BADLANDS_PROGRAMME_LINE), true);
    assert.equal((sentRecord.sendApproved?.body.match(/<a /g) ?? []).length, 1);
    assert.equal(sentRecord.sendApproved?.body.includes(OUTREACH_SENDER_IDENTIFICATION_PLACEHOLDER), false);
    assert.equal(sentRecord.drafts["1"].sent?.body.includes("Changed in chat"), true);

    const follow = await post(letter(card.id, "drafted", { touch: 2, subject: "Follow up", body: "A second note." }));
    assert.equal(follow.status, 200);
    const followApproved = await post(letter(card.id, "send_approved", { touch: 2, body: `A second note.\n${link}` }));
    assert.equal(followApproved.status, 200);
    const third = await post(letter(card.id, "drafted", { touch: 3, subject: "Third", body: "Too soon." }));
    assert.equal(third.status, 409);

    const skipped = company({ id: "skip-me" });
    await seed(redis, [card, skipped]);
    assert.equal((await approveAndQueueForCoco({ cardId: skipped.id, queuedBy: "chris@unearthself.xyz" })).ok, true);
    const skip = await post({
      eventId: randomUUID(),
      cardId: skipped.id,
      type: "draft_skipped",
      at: new Date().toISOString(),
      touch: 1,
      reason: "Title does not fit a team retreat",
    });
    assert.equal(skip.status, 200);
    const skipView = await handleHunterRead(
      new Request("https://www.unearthself.xyz/api/hunter/read?view=card&id=skip-me", {
        headers: { authorization: `Bearer ${CARDS}` },
      }),
    );
    const skipCard = (await skipView.json()) as { card: { stage: string; draftSkipped: { reason: string } | null } };
    assert.equal(skipCard.card.stage, "draft-skipped");
    assert.equal(skipCard.card.draftSkipped?.reason, "Title does not fit a team retreat");
  });

  test("stage precedence and a desk save leave the outreach draft alone", async () => {
    const redis = memoryRedis();
    useRedisClientForTests(redis as unknown as LeadsRedis);
    const base = company({ id: "stage", review: "approved" });
    const now = Date.now();
    assert.equal(cocoStage(company({ id: "lost", pipeline: "lost" }), { cardId: "lost", touches: 1, repliedAt: new Date().toISOString(), events: [] }, now), "closed");
    assert.equal(cocoStage(company({ id: "won", pipeline: "won" }), { cardId: "won", touches: 0, bookedAt: new Date().toISOString(), events: [] }, now), "won");
    assert.equal(cocoStage(company({ id: "booked", pipeline: "booked" }), null, now), "booked");
    assert.equal(cocoStage(base, { cardId: "stage", touches: 1, repliedAt: new Date().toISOString(), events: [] }, now), "replied");
    assert.equal(cocoStage(base, { cardId: "stage", touches: 1, optedOutAt: new Date().toISOString(), events: [] }, now), "opted-out");
    assert.equal(cocoStage(base, { cardId: "stage", touches: 1, bouncedAt: new Date().toISOString(), events: [] }, now), "bounced");
    assert.equal(
      cocoStage(base, { cardId: "stage", touches: 0, sendApproved: { eventId: "e", touch: 1, subject: "S", body: "B", at: new Date().toISOString() }, drafts: { "1": { subject: "S", body: "B" } }, events: [] }, now),
      "wording-approved",
    );
    assert.equal(cocoStage(base, { cardId: "stage", touches: 0, drafts: { "1": { subject: "S", body: "B" } }, events: [] }, now), "draft-ready");
    assert.equal(
      cocoStage(base, { cardId: "stage", touches: 0, drafts: { "1": { claim: { eventId: "e", at: new Date().toISOString() } } }, events: [] }, now),
      "drafting",
    );
    assert.equal(
      cocoStage(base, { cardId: "stage", touches: 0, draftSkipped: { reason: "No retreat fit", touch: 1, at: new Date().toISOString() }, queue: { queuedAt: new Date().toISOString(), queuedBy: "a@b.c" }, events: [] }, now),
      "draft-skipped",
    );
    assert.equal(cocoStage(base, { cardId: "stage", touches: 1, firstSentAt: new Date().toISOString(), events: [] }, now), "sent");
    assert.equal(cocoStage(base, { cardId: "stage", touches: 0, queue: { queuedAt: new Date().toISOString(), queuedBy: "a@b.c" }, events: [] }, now), "queued");
    assert.equal(cocoStage(base, null, now), "approved");
    assert.equal(cocoStage(company({ id: "fresh", review: "unreviewed" }), null, now), "new");

    await seed(redis, [company({ id: "desk", draftSubject: "stale subject", draftBody: "stale body" })]);
    assert.equal((await approveAndQueueForCoco({ cardId: "desk", queuedBy: "chris@unearthself.xyz" })).ok, true);
    assert.equal((await post(letter("desk", "drafted", { subject: "Coco subject", body: "Coco body" }))).status, 200);
    const loaded = await redis.get<{ companies: Company[] }>(LEADS_KEY);
    const stale = loaded?.companies[0];
    assert.ok(stale);
    await saveBook(upsertCompany({ ...emptyBook(), companies: loaded?.companies ?? [] }, { ...stale, draftSubject: "", draftBody: "", why: "Edited on the desk." }));
    const kept = JSON.parse(redis.hashes.get(HUNTER_OUTREACH_KEY)?.desk ?? "{}") as { drafts?: { "1"?: { subject?: string } }; queue?: { queuedAt?: string } };
    assert.equal(kept.drafts?.["1"]?.subject, "Coco subject");
    assert.ok(kept.queue?.queuedAt);
    const refreshed = refreshUnsentDrafts([{ ...stale, draftSubject: "leave me" }], [], new Set(["desk"]));
    assert.equal(refreshed.companies[0]?.draftSubject, "leave me");
  });

  test("a blank buyer is filled from Hunter when the desk has not typed one", () => {
    const start = [{ id: "c", buyerName: "", buyerTitle: "", email: "", emailSource: "", review: "unreviewed" }];
    const hunter = [{ id: "c", buyerName: "Ada North", buyerTitle: "People Lead", email: "ada@northwind.example", emailSource: "https://northwind.example/contact", review: "unreviewed" }];
    const fresh = [{ id: "c", buyerName: "", buyerTitle: "", email: "", emailSource: "", review: "unreviewed" }];
    const filled = mergeHunterCompanies(start, hunter, fresh);
    assert.equal(filled[0]?.buyerName, "Ada North");
    assert.equal(filled[0]?.email, "ada@northwind.example");
    const edited = mergeHunterCompanies(start, hunter, [{ id: "c", buyerName: "Kept Name", buyerTitle: "", email: "", emailSource: "", review: "approved" }]);
    assert.equal(edited[0]?.buyerName, "Kept Name");
    assert.equal(edited[0]?.review, "approved");
  });

  test("the live desk no longer calls the file 27 template or a mail link", () => {
    const desk = readFileSync(new URL("./desk-store.ts", import.meta.url), "utf8");
    const page = readFileSync(new URL("../routes/admin.leads.tsx", import.meta.url), "utf8");
    assert.equal(desk.includes("refreshUnsentDrafts"), false);
    assert.equal(desk.includes("draftForCompany"), false);
    assert.equal(desk.includes("mailto:"), false);
    assert.equal(page.includes("refreshUnsentDrafts"), false);
    assert.equal(page.includes("Write the draft"), false);
    assert.equal(page.includes("mailto:"), false);
    assert.equal(page.includes(">Send<"), false);
  });

  test("a background letter uses one approved intro and never says Tess and I", () => {
    const card = company({ id: "campfire", org: "Northwind Example" });
    const letter = cocoLetter(card);
    const chosen = COCO_INTROS.filter((intro) => letter.body.includes(intro));
    assert.equal(chosen.length, 1);
    assert.equal(letter.body.includes("Northwind Example"), true);
    assert.equal(letter.body.includes("Play, Adaptability, Connection, Experience"), true);
    assert.equal(letter.body.includes("We are taking bookings for 2027."), true);
    assert.equal(letter.body.includes("A short reply is enough."), true);
    assert.equal(draftMentionsTessAndI(letter.subject) || draftMentionsTessAndI(letter.body), false);
    assert.equal(letter.body.includes("\u2014"), false);
    assert.equal(draftRejectionCheck(letter.subject, letter.body), null);
    const link = unsubscribeUrl(card.id);
    assert.ok(link);
    const stored = `${letter.body}\n\n${unsubscribeBlock(link)}`;
    assert.deepEqual(draftProblems(stored), []);
    const fallback = readFileSync(new URL("./bot-copy.ts", import.meta.url), "utf8");
    assert.equal(/tess\s+and\s+i\b/i.test(fallback), false);
    assert.equal(fallback.includes("COCO_INTRO_TEAM"), true);
    assert.equal(fallback.includes("Hello,"), true);
    assert.equal(fallback.includes("A short reply is enough."), true);
  });

  test("a drafted event that says Tess and I is rejected and flagged", async () => {
    const redis = memoryRedis();
    useRedisClientForTests(redis as unknown as LeadsRedis);
    const card = company({ id: "campfire" });
    await seed(redis, [card]);
    assert.equal((await approveAndQueueForCoco({ cardId: card.id, queuedBy: "chris@unearthself.xyz" })).ok, true);
    const lines: string[] = [];
    const original = console.info;
    console.info = (line?: unknown) => {
      lines.push(String(line ?? ""));
    };
    let refused: Response;
    try {
      refused = await post(letter(card.id, "drafted", { body: "Tess and I will write." }));
    } finally {
      console.info = original;
    }
    assert.equal(refused.status, 400);
    const logged = lines
      .map((line) => {
        try {
          return JSON.parse(line) as { check?: string };
        } catch {
          return null;
        }
      })
      .find((item) => item?.check);
    assert.equal(logged?.check, "tess-and-i");
    const view = await readCocoCard(card.id);
    assert.equal(view?.stage, "draft-flagged");
    assert.equal(view?.body.includes("Tess and I"), true);
    assert.equal(view?.draftFlag, 'The draft says "Tess and I".');
  });

  test("filed leads are drafted before approve, and a flagged letter is not shown as done", async () => {
    const redis = memoryRedis();
    useRedisClientForTests(redis as unknown as LeadsRedis);
    const today = edmontonToday();
    const cards = ["a", "b", "c", "d", "e", "f"].map((id) => company({ id, filedOn: today, org: `Org ${id}` }));
    await seed(redis, cards);
    const calls: string[] = [];
    process.env.COCO_DRAFT_WEBHOOK_URL = "https://hooks.example/coco";
    process.env.COCO_DRAFT_WEBHOOK_KEY = "secret-key";
    process.env.COCO_DRAFT_WEBHOOK_HEADER = "X-Coco-Key";
    const first = await predraftFiledLeads({
      today,
      fetchImpl: async (url) => {
        calls.push(url);
        return { status: 200 };
      },
    });
    assert.deepEqual(first.drafted, ["a", "b", "c", "d"]);
    assert.deepEqual(first.flagged, []);
    assert.equal(first.stopped, "");
    assert.equal(calls.length, 4);
    const ready = await readCocoCard("a");
    assert.equal(ready?.stage, "draft-ready");
    assert.equal(ready?.body.includes("<a href="), true);
    assert.equal(ready?.body.includes(">Unsubscribe here</a>"), true);
    assert.match(ready?.body ?? "", /Unsubscribe here and we won't contact you again\.\nhttps:\/\/www\.unearthself\.xyz\/u\//);
    const stored = JSON.parse(redis.hashes.get(HUNTER_OUTREACH_KEY)?.a ?? "{}") as {
      sendApproved?: unknown;
      touches?: number;
    };
    assert.equal(stored.sendApproved, undefined);
    assert.equal(stored.touches ?? 0, 0);
    const book = await redis.get<{ companies: Company[] }>(LEADS_KEY);
    assert.equal(book?.companies.find((item) => item.id === "a")?.review, "unreviewed");

    calls.length = 0;
    const approved = await approveAndQueueForCoco({
      cardId: "a",
      queuedBy: "chris",
      fetchImpl: async () => {
        calls.push("approve");
        return { status: 200 };
      },
    });
    assert.equal(approved.ok, true);
    assert.equal(calls.length, 0);
    if (approved.ok) assert.equal(approved.stage, "draft-ready");

    const flagged = await storeBackgroundDraft({
      company: company({ id: "bad-letter", filedOn: today }),
      subject: "A week in Drumheller for your team",
      body: "Tess and I will write tomorrow.",
    });
    assert.equal(flagged, "flagged");
    await seed(redis, [...cards, company({ id: "bad-letter", filedOn: today })]);
    const failed = await readCocoCard("bad-letter");
    assert.equal(failed?.stage, "draft-flagged");
    assert.equal(failed?.body.includes("Tess and I"), true);
    assert.equal(failed?.draftFlag.includes("Tess and I"), true);
  });

  test("background drafting stops when the monthly cap is spent", async () => {
    const redis = memoryRedis();
    useRedisClientForTests(redis as unknown as LeadsRedis);
    const today = edmontonToday();
    await seed(redis, [company({ id: "spent", filedOn: today })]);
    await redis.set(spendCounterKey(today.slice(0, 7)), "99999999");
    const result = await predraftFiledLeads({ today, fetchImpl: async () => ({ status: 200 }) });
    assert.deepEqual(result.drafted, []);
    assert.equal(result.stopped, "spend");
    assert.equal(redis.hashes.get(HUNTER_OUTREACH_KEY)?.spent, undefined);
  });

  test("a newer rejection hides an older draft, and an older rejection does not", () => {
    const card = company({ id: "campfire", review: "approved" });
    const older = cocoStage(card, {
      cardId: card.id,
      touches: 0,
      events: [],
      drafts: { "1": { subject: "A note", body: "Hello from Drumheller.", draftedAt: "2026-11-20T20:00:00.000Z" } },
      draftRejected: { at: "2026-11-20T19:00:00.000Z", check: "em-dash" },
    });
    assert.equal(older, "draft-ready");
    const newer = cocoStage(card, {
      cardId: card.id,
      touches: 0,
      events: [],
      drafts: { "1": { subject: "A note", body: "Hello from Drumheller.", draftedAt: "2026-11-20T19:00:00.000Z" } },
      draftRejected: { at: "2026-11-20T20:00:00.000Z", check: "tess-and-i" },
    });
    assert.equal(newer, "draft-flagged");
  });

  test("an initials greeting is rejected, and a short letter cannot be approved to send", async () => {
    assert.equal(usableFirstName("NN Srinivas"), "");
    assert.equal(usableFirstName("nn.srinivas@centricsoftware.com"), "");
    assert.equal(usableFirstName("Ada North"), "Ada");
    const neutral = cocoLetter(company({ id: "centric", buyerName: "NN Srinivas", org: "Centric Software" }));
    assert.equal(neutral.body.startsWith("Hello,"), true);
    assert.equal(greetingNameCheck(neutral.body), false);
    assert.equal(greetingNameCheck("Hello NN, thanks for reading."), true);
    const redis = memoryRedis();
    useRedisClientForTests(redis as unknown as LeadsRedis);
    const card = company({ id: "campfire", review: "approved" });
    await seed(redis, [card]);
    assert.equal((await approveAndQueueForCoco({ cardId: card.id, queuedBy: "chris@unearthself.xyz" })).ok, true);
    const link = unsubscribeUrl(card.id);
    assert.ok(link);
    const drafted = await post(letter(card.id, "drafted", { body: `Hello from Drumheller.\n${link}` }));
    assert.equal(drafted.status, 200);
    const initials = await approveWording({ cardId: card.id, subject: "A note", body: `Hello NN, thanks for reading.\n${link}` });
    assert.equal(initials.ok, false);
    if (!initials.ok) assert.equal(initials.error, "greeting-name");
    const short = await approveWording({ cardId: card.id, subject: "A note", body: `Hello from Drumheller.\n${link}` });
    assert.equal(short.ok, false);
    if (!short.ok) assert.equal(short.error, "humanizer");
    const ready = approvableCopy(card, link);
    assert.equal(humanizerCheck(ready.subject, ready.body).pass, true);
  });

  test("approve to send fails closed while the Badlands footer choice is unset", async () => {
    setBadlandsFooterChoiceForTests(null);
    const redis = memoryRedis();
    useRedisClientForTests(redis as unknown as LeadsRedis);
    const card = company({ id: "campfire", review: "approved" });
    await seed(redis, [card]);
    assert.equal((await approveAndQueueForCoco({ cardId: card.id, queuedBy: "chris@unearthself.xyz" })).ok, true);
    const link = unsubscribeUrl(card.id);
    assert.ok(link);
    const drafted = await post(letter(card.id, "drafted", { body: `Hello from Drumheller.\n${link}` }));
    assert.equal(drafted.status, 200);
    let woke = false;
    const refused = await approveWording({
      cardId: card.id,
      subject: "A note",
      body: `Hello from Drumheller.\n${link}`,
      fetchImpl: async () => {
        woke = true;
        return { status: 202 };
      },
    });
    assert.equal(refused.ok, false);
    if (!refused.ok) assert.equal(refused.error, "badlands-footer");
    assert.equal(woke, false);
    const after = JSON.parse(redis.hashes.get(HUNTER_OUTREACH_KEY)?.[card.id] ?? "{}") as { sendApproved?: unknown };
    assert.equal(after.sendApproved, undefined);
    const posted = await post(letter(card.id, "send_approved", { body: `Hello from Drumheller.\n${link}` }));
    assert.equal(posted.status, 409);
    assert.deepEqual(await posted.json(), { error: "badlands-footer" });
    setBadlandsFooterChoiceForTests("B");
    const missingMailbox = await approveWording({
      cardId: card.id,
      subject: "A note",
      body: `Hello from Drumheller.\n${link}`,
      fetchImpl: async () => {
        woke = true;
        return { status: 202 };
      },
    });
    assert.equal(missingMailbox.ok, false);
    if (!missingMailbox.ok) assert.equal(missingMailbox.error, "badlands-footer");
    assert.equal(woke, false);
    setBadlandsFooterChoiceForTests("A");
    const planted = await approveWording({
      cardId: card.id,
      subject: "A note",
      body: `Hello from Drumheller.\n${OUTREACH_SENDER_IDENTIFICATION_PLACEHOLDER}\n${link}`,
      fetchImpl: async () => {
        woke = true;
        return { status: 202 };
      },
    });
    assert.equal(planted.ok, false);
    if (!planted.ok) assert.equal(planted.error, "sender-identification");
    assert.equal(woke, false);
    const still = JSON.parse(redis.hashes.get(HUNTER_OUTREACH_KEY)?.[card.id] ?? "{}") as { sendApproved?: unknown };
    assert.equal(still.sendApproved, undefined);
    assert.equal(JSON.stringify(redis.hashes).includes(OUTREACH_SENDER_IDENTIFICATION_PLACEHOLDER), false);
    assert.equal(JSON.stringify(redis.hashes).includes(BADLANDS_PROGRAMME_LINE), false);
  });
});
