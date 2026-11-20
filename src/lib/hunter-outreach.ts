/**
 * Coco's write route and the card views behind it.
 * Outreach lives in its own hash so a desk save cannot wipe it.
 * Unsubscribe links are signed with a key derived from HUNTER_WRITE_TOKEN.
 * HUNTER_WRITE_TOKEN_PREVIOUS only verifies links from before a rotation.
 */

import { createHash, createHmac, hkdfSync, randomBytes, timingSafeEqual } from "node:crypto";
import { getRedisClient, loadBook, saveBook, type LeadsRedis } from "./leads-book.ts";
import { bearerConfigured } from "./hunter-read.ts";
import { isContactReady } from "./hunter-cap.ts";
import {
  appendDoNotContact,
  loadDoNotContact,
} from "./leads-hunter.ts";
import { dncBlocks, type DncEntry, type DncReason, type PipelineMark } from "./hunter-phase.ts";
import {
  edmontonToday,
  normalizeDomain,
  scoreCompany,
  type Company,
} from "./lead-score.ts";

export const HUNTER_OUTREACH_KEY = "unearth:hunter:outreach:v1";
export const FROM_ADDRESS = "chris@badlandsbootcamp.com";
export const UNSUBSCRIBE_INFO = "unearth-unsubscribe-v1";
export const UNSUBSCRIBE_ORIGIN = "https://www.unearthself.xyz";

const NO_STORE = { "cache-control": "no-store" };
const MAX_BODY_BYTES = 8192;
const MAX_EVENTS = 50;
const LOCK_TTL_SECONDS = 10;
const LOCK_RETRIES = 3;
const LOCK_WAIT_MS = 200;
const DAY_MS = 24 * 60 * 60 * 1000;
const RELEASE_SCRIPT = `if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end`;

const EVENT_TYPES = ["sent", "followup_sent", "replied", "opted_out", "bounced", "booked"] as const;
type EventType = (typeof EVENT_TYPES)[number];

const REPLY_TYPES = ["positive", "neutral", "negative", "auto_reply", "referral"] as const;
type ReplyType = (typeof REPLY_TYPES)[number];

const REPLY_RANK: Record<Exclude<ReplyType, "auto_reply">, number> = {
  negative: 1,
  neutral: 2,
  positive: 3,
  referral: 4,
};

const KNOWN_FIELDS = new Set([
  "eventId",
  "cardId",
  "type",
  "at",
  "touch",
  "experimentId",
  "variantId",
  "threadId",
  "messageId",
  "fromAddress",
  "edited",
  "replyType",
  "optOutScope",
  "consentBasis",
  "emailSource",
  "subject",
  "body",
  "note",
]);

const FIELDS_FOR: Record<EventType, string[]> = {
  sent: ["touch", "experimentId", "variantId", "threadId", "messageId", "fromAddress", "edited", "consentBasis", "emailSource", "subject", "body", "note"],
  followup_sent: ["touch", "experimentId", "variantId", "threadId", "messageId", "fromAddress", "edited", "subject", "body", "note"],
  replied: ["replyType", "messageId", "note"],
  opted_out: ["optOutScope", "messageId", "note"],
  bounced: ["messageId", "note"],
  booked: ["messageId", "note"],
};

const SKIP_RULES = [
  "contact-ready",
  "review",
  "already-sent",
  "pipeline",
  "do-not-contact",
  "no-unsolicited",
  "stale",
  "apollo-unverified",
  "email-mx",
  "email-blank",
  "bounced-email",
  "no-unsubscribe-link",
] as const;

type SkipRule = (typeof SKIP_RULES)[number];

export type OutreachEvent = {
  eventId: string;
  type: EventType;
  at: string;
  touch?: number;
  experimentId?: string;
  variantId?: string;
  threadId?: string;
  messageId?: string;
  fromAddress?: string;
  edited?: boolean;
  replyType?: ReplyType;
  optOutScope?: "person" | "company";
  optOutSource?: "reply" | "link";
  consentBasis?: "public-page" | "apollo-decision-5";
  emailSource?: string;
  note?: string;
};

type SentCopy = { subject: string; body: string; at: string };

type OutreachDraft = {
  subject?: string;
  body?: string;
  sent?: SentCopy;
};

export type OutreachRecord = {
  cardId: string;
  domain?: string;
  email?: string;
  experimentId?: string;
  variantId?: string;
  threadId?: string;
  consentBasis?: "public-page" | "apollo-decision-5";
  emailSource?: string;
  edited?: boolean;
  firstSentAt?: string;
  lastSentAt?: string;
  touches: number;
  repliedAt?: string;
  replyType?: ReplyType;
  optedOutAt?: string;
  optOutScope?: "person" | "company";
  optOutSource?: "reply" | "link";
  bouncedAt?: string;
  bouncedEmail?: string;
  bookedAt?: string;
  drafts?: Partial<Record<"1" | "2" | "3", OutreachDraft>>;
  events: OutreachEvent[];
};

type ParsedEvent = {
  eventId: string;
  cardId: string;
  type: EventType;
  at: string;
  touch?: number;
  experimentId?: string;
  variantId?: string;
  threadId?: string;
  messageId?: string;
  fromAddress?: string;
  edited?: boolean;
  replyType?: ReplyType;
  optOutScope?: "person" | "company";
  consentBasis?: "public-page" | "apollo-decision-5";
  emailSource?: string;
  subject?: string;
  body?: string;
  note?: string;
};

class InvalidParam extends Error {
  field: string;
  constructor(field: string) {
    super(field);
    this.field = field;
  }
}

function json(body: unknown, status: number, extra?: Record<string, string>) {
  return Response.json(body, { status, headers: { ...NO_STORE, ...extra } });
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function outreachLockKey(cardId: string) {
  return `unearth:hunter:outreach:lock:v1:${cardId}`;
}

function currentWriteToken() {
  const token = (process.env.HUNTER_WRITE_TOKEN ?? "").trim();
  return token.length >= 32 ? token : "";
}

/** HKDF so the write token itself is never the HMAC key. Empty salt, info is fixed. */
export function deriveUnsubscribeKey(writeToken: string): Buffer | null {
  const ikm = writeToken.trim();
  if (ikm.length < 32) return null;
  return Buffer.from(hkdfSync("sha256", Buffer.from(ikm), Buffer.alloc(0), Buffer.from(UNSUBSCRIBE_INFO), 32));
}

/** New links always use the current write token. The previous token is not a signing key. */
export function unsubscribeToken(cardId: string, writeToken: string): string | null {
  const key = deriveUnsubscribeKey(writeToken);
  if (!key || !cardId || cardId.length > 200) return null;
  const payload = Buffer.from(JSON.stringify({ id: cardId }), "utf8").toString("base64url");
  const sig = createHmac("sha256", key).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function unsubscribeUrl(cardId: string, writeToken = currentWriteToken()): string | null {
  const token = unsubscribeToken(cardId, writeToken);
  if (!token) return null;
  return `${UNSUBSCRIBE_ORIGIN}/u/${token}`;
}

function verificationKeys(): Buffer[] {
  const current = deriveUnsubscribeKey(process.env.HUNTER_WRITE_TOKEN ?? "");
  if (!current) return [];
  const keys = [current];
  const previous = deriveUnsubscribeKey(process.env.HUNTER_WRITE_TOKEN_PREVIOUS ?? "");
  if (previous) keys.push(previous);
  return keys;
}

/** Accepts the current key and, when set, the previous rotation. Returns the card id or null. */
export function readUnsubscribeCardId(token: string, keys = verificationKeys()): string | null {
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1] || keys.length === 0) return null;
  const [payload, sig] = parts;
  let matches = false;
  for (const key of keys) {
    const expected = createHmac("sha256", key).update(payload).digest("base64url");
    const left = createHash("sha256").update(sig).digest();
    const right = createHash("sha256").update(expected).digest();
    matches = timingSafeEqual(left, right) || matches;
  }
  if (!matches) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const row = parsed as Record<string, unknown>;
    if (Object.keys(row).some((key) => key !== "id")) return null;
    if (typeof row.id !== "string" || !row.id || row.id.length > 200) return null;
    return row.id;
  } catch {
    return null;
  }
}

export function maskEmail(email: string) {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.indexOf("@");
  if (at < 1) return "";
  const local = trimmed.slice(0, at);
  const host = trimmed.slice(at + 1);
  if (!host || /[\s<>"]/.test(host) || /[\s<>"]/.test(local)) return "";
  return `${local.slice(0, 1)}•••@${host}`;
}

function rank(mark: string) {
  if (mark === "sent") return 1;
  if (mark === "replied") return 2;
  if (mark === "booked") return 3;
  if (mark === "won") return 4;
  return 0;
}

export function derivedMark(record: OutreachRecord | null): PipelineMark {
  if (!record) return "";
  if (record.bookedAt) return "booked";
  if (record.repliedAt) return "replied";
  if (record.firstSentAt) return "sent";
  return "";
}

export function applyOutreachMarks(companies: Company[], records: Map<string, OutreachRecord>): Company[] {
  return companies.map((company) => {
    const current = company.pipeline ?? "";
    if (current === "lost" || current === "won") return company;
    const record = records.get(company.id) ?? null;
    const next = derivedMark(record);
    if (rank(next) <= rank(current)) return company;
    const at = next === "booked" ? record?.bookedAt : next === "replied" ? record?.repliedAt : record?.firstSentAt;
    const pipelineOn = at ? edmontonToday(new Date(at)) : company.pipelineOn ?? "";
    return { ...company, pipeline: next, pipelineOn };
  });
}

function asRecord(raw: unknown, cardId: string): OutreachRecord | null {
  const value = typeof raw === "string" ? parseJson(raw) : raw;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Partial<OutreachRecord>;
  if (!Array.isArray(row.events)) return null;
  return {
    cardId: typeof row.cardId === "string" && row.cardId ? row.cardId : cardId,
    domain: stringOrUndefined(row.domain),
    email: stringOrUndefined(row.email),
    experimentId: stringOrUndefined(row.experimentId),
    variantId: stringOrUndefined(row.variantId),
    threadId: stringOrUndefined(row.threadId),
    consentBasis: row.consentBasis === "public-page" || row.consentBasis === "apollo-decision-5" ? row.consentBasis : undefined,
    emailSource: stringOrUndefined(row.emailSource),
    edited: typeof row.edited === "boolean" ? row.edited : undefined,
    firstSentAt: stringOrUndefined(row.firstSentAt),
    lastSentAt: stringOrUndefined(row.lastSentAt),
    touches: typeof row.touches === "number" && row.touches >= 0 ? row.touches : 0,
    repliedAt: stringOrUndefined(row.repliedAt),
    replyType: isReplyType(row.replyType) ? row.replyType : undefined,
    optedOutAt: stringOrUndefined(row.optedOutAt),
    optOutScope: row.optOutScope === "person" || row.optOutScope === "company" ? row.optOutScope : undefined,
    optOutSource: row.optOutSource === "reply" || row.optOutSource === "link" ? row.optOutSource : undefined,
    bouncedAt: stringOrUndefined(row.bouncedAt),
    bouncedEmail: stringOrUndefined(row.bouncedEmail),
    bookedAt: stringOrUndefined(row.bookedAt),
    drafts: row.drafts && typeof row.drafts === "object" ? row.drafts : undefined,
    events: row.events.filter((event) => event && typeof event === "object" && typeof event.eventId === "string"),
  };
}

function stringOrUndefined(value: unknown) {
  return typeof value === "string" && value ? value : undefined;
}

function isReplyType(value: unknown): value is ReplyType {
  return typeof value === "string" && (REPLY_TYPES as readonly string[]).includes(value);
}

function parseJson(raw: string) {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export async function readOutreachMap(redis: LeadsRedis): Promise<Map<string, OutreachRecord>> {
  const map = new Map<string, OutreachRecord>();
  if (!redis.hgetall) return map;
  const hash = await redis.hgetall(HUNTER_OUTREACH_KEY);
  if (!hash || typeof hash !== "object") return map;
  for (const [cardId, value] of Object.entries(hash)) {
    const record = asRecord(value, cardId);
    if (record) map.set(cardId, record);
  }
  return map;
}

async function readOutreachRecord(redis: LeadsRedis, cardId: string): Promise<OutreachRecord | null> {
  if (!redis.hget) {
    const map = await readOutreachMap(redis);
    return map.get(cardId) ?? null;
  }
  const raw = await redis.hget(HUNTER_OUTREACH_KEY, cardId);
  if (raw == null) return null;
  return asRecord(raw, cardId);
}

async function writeOutreachRecord(redis: LeadsRedis, record: OutreachRecord) {
  if (!redis.hset) throw new Error("Redis hash writes are unavailable");
  await redis.hset(HUNTER_OUTREACH_KEY, record.cardId, JSON.stringify(record));
}

export async function withOutreachLock<T>(redis: LeadsRedis, cardId: string, fn: () => Promise<T>): Promise<T | null> {
  const token = randomBytes(16).toString("hex");
  const key = outreachLockKey(cardId);
  for (let attempt = 0; attempt <= LOCK_RETRIES; attempt += 1) {
    const taken = await redis.set(key, token, { nx: true, ex: LOCK_TTL_SECONDS });
    if (taken === "OK") {
      try {
        return await fn();
      } finally {
        try {
          await redis.eval(RELEASE_SCRIPT, [key], [token]);
        } catch {
          // The lock expires on its own. A failed release must not hide the write.
        }
      }
    }
    if (attempt < LOCK_RETRIES) await delay(LOCK_WAIT_MS);
  }
  return null;
}

function markOn(record: OutreachRecord, mark: PipelineMark) {
  const at = mark === "booked" ? record.bookedAt : mark === "replied" ? record.repliedAt : record.firstSentAt;
  return at ? edmontonToday(new Date(at)) : "";
}

async function persistLift(cardId: string, record: OutreachRecord) {
  const fresh = await loadBook();
  if (fresh.storage !== "redis") return;
  const mark = derivedMark(record);
  const companies = fresh.book.companies.map((company) => {
    if (company.id !== cardId) return company;
    const current = company.pipeline ?? "";
    if (current === "lost" || current === "won") return company;
    if (rank(mark) <= rank(current)) return company;
    return { ...company, pipeline: mark, pipelineOn: markOn(record, mark) };
  });
  await saveBook({ ...fresh.book, companies });
}

function pipelineFor(company: Company, record: OutreachRecord) {
  const [healed] = applyOutreachMarks([company], new Map([[company.id, record]]));
  return healed?.pipeline ?? company.pipeline ?? "";
}

function logSafe(value: unknown) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 80 || /[\s@]/.test(trimmed)) return "";
  return trimmed;
}

function uuidV4(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function slug(value: string, max: number) {
  return new RegExp(`^[A-Za-z0-9_-]{1,${max}}$`).test(value);
}

function parseAt(value: string, now: number) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return null;
  const parsed = new Date(value);
  const time = parsed.getTime();
  if (Number.isNaN(time)) return null;
  if (time < now - 30 * DAY_MS || time > now + 10 * 60 * 1000) return null;
  return parsed.toISOString();
}

function oneLine(value: string, max: number) {
  if (value.length > max || /[\r\n]/.test(value)) return null;
  return value;
}

function parseEvent(value: unknown, now: number): { ok: true; event: ParsedEvent } | { ok: false; field: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, field: "body" };
  const row = value as Record<string, unknown>;
  for (const key of Object.keys(row)) {
    if (!KNOWN_FIELDS.has(key)) return { ok: false, field: key };
  }
  if (typeof row.eventId !== "string" || !uuidV4(row.eventId)) return { ok: false, field: "eventId" };
  if (typeof row.cardId !== "string" || !row.cardId.trim() || row.cardId.length > 200) return { ok: false, field: "cardId" };
  if (typeof row.type !== "string" || !(EVENT_TYPES as readonly string[]).includes(row.type)) return { ok: false, field: "type" };
  if (typeof row.at !== "string") return { ok: false, field: "at" };
  const at = parseAt(row.at, now);
  if (!at) return { ok: false, field: "at" };
  const type = row.type as EventType;
  for (const key of Object.keys(row)) {
    if (key === "eventId" || key === "cardId" || key === "type" || key === "at") continue;
    if (!FIELDS_FOR[type].includes(key)) return { ok: false, field: key };
  }
  const event: ParsedEvent = { eventId: row.eventId, cardId: row.cardId, type, at };
  if ("note" in row) {
    if (typeof row.note !== "string") return { ok: false, field: "note" };
    const note = row.note.replace(/[\r\n]+/g, " ").trim();
    if (note.length > 280) return { ok: false, field: "note" };
    if (note) event.note = note;
  }
  if ("messageId" in row) {
    if (typeof row.messageId !== "string" || !slug(row.messageId, 128)) return { ok: false, field: "messageId" };
    event.messageId = row.messageId;
  }
  if (type === "sent" || type === "followup_sent") {
    if (typeof row.touch !== "number" || !Number.isInteger(row.touch) || row.touch < 1 || row.touch > 3) {
      return { ok: false, field: "touch" };
    }
    event.touch = row.touch;
    if ("experimentId" in row) {
      if (typeof row.experimentId !== "string" || !slug(row.experimentId, 64)) return { ok: false, field: "experimentId" };
      event.experimentId = row.experimentId;
    }
    if ("variantId" in row) {
      if (typeof row.variantId !== "string" || !slug(row.variantId, 64)) return { ok: false, field: "variantId" };
      event.variantId = row.variantId;
    }
    if ("threadId" in row) {
      if (typeof row.threadId !== "string" || !slug(row.threadId, 128)) return { ok: false, field: "threadId" };
      event.threadId = row.threadId;
    }
    if ("fromAddress" in row) {
      if (typeof row.fromAddress !== "string") return { ok: false, field: "fromAddress" };
      event.fromAddress = row.fromAddress;
    }
    if ("edited" in row) {
      if (typeof row.edited !== "boolean") return { ok: false, field: "edited" };
      event.edited = row.edited;
    }
    const hasSubject = "subject" in row;
    const hasBody = "body" in row;
    if (hasSubject !== hasBody) return { ok: false, field: hasSubject ? "body" : "subject" };
    if (hasSubject) {
      if (typeof row.subject !== "string") return { ok: false, field: "subject" };
      const subject = oneLine(row.subject, 200);
      if (subject == null) return { ok: false, field: "subject" };
      event.subject = subject;
    }
    if (hasBody) {
      if (typeof row.body !== "string") return { ok: false, field: "body" };
      if (Buffer.byteLength(row.body, "utf8") > 4096) return { ok: false, field: "body" };
      event.body = row.body;
    }
  }
  if (type === "sent") {
    if (event.touch !== 1) return { ok: false, field: "touch" };
    if (!event.experimentId) return { ok: false, field: "experimentId" };
    if (!event.variantId) return { ok: false, field: "variantId" };
    if (!event.threadId) return { ok: false, field: "threadId" };
    if (!event.fromAddress) return { ok: false, field: "fromAddress" };
    if (event.fromAddress !== FROM_ADDRESS) return { ok: false, field: "fromAddress" };
    if (row.consentBasis !== "public-page" && row.consentBasis !== "apollo-decision-5") return { ok: false, field: "consentBasis" };
    event.consentBasis = row.consentBasis;
    if (typeof row.emailSource !== "string" || row.emailSource.length > 300 || row.emailSource.length === 0) {
      return { ok: false, field: "emailSource" };
    }
    if (row.emailSource !== "Apollo" && !/^https?:\/\//i.test(row.emailSource)) return { ok: false, field: "emailSource" };
    event.emailSource = row.emailSource;
  }
  if (type === "followup_sent") {
    if (event.touch !== 2 && event.touch !== 3) return { ok: false, field: "touch" };
    if (!event.threadId) return { ok: false, field: "threadId" };
    if (!event.fromAddress) return { ok: false, field: "fromAddress" };
    if (event.fromAddress !== FROM_ADDRESS) return { ok: false, field: "fromAddress" };
  }
  if (type === "replied") {
    if (!isReplyType(row.replyType)) return { ok: false, field: "replyType" };
    event.replyType = row.replyType;
  }
  if (type === "opted_out") {
    if (row.optOutScope !== "person" && row.optOutScope !== "company") return { ok: false, field: "optOutScope" };
    event.optOutScope = row.optOutScope;
  }
  return { ok: true, event };
}

function toStoredEvent(event: ParsedEvent, extra?: { edited?: boolean; optOutSource?: "reply" | "link" }): OutreachEvent {
  const stored: OutreachEvent = { eventId: event.eventId, type: event.type, at: event.at };
  if (event.touch != null) stored.touch = event.touch;
  if (event.experimentId) stored.experimentId = event.experimentId;
  if (event.variantId) stored.variantId = event.variantId;
  if (event.threadId) stored.threadId = event.threadId;
  if (event.messageId) stored.messageId = event.messageId;
  if (event.fromAddress) stored.fromAddress = event.fromAddress;
  if (extra?.edited != null) stored.edited = extra.edited;
  else if (event.edited != null) stored.edited = event.edited;
  if (event.replyType) stored.replyType = event.replyType;
  if (event.optOutScope) stored.optOutScope = event.optOutScope;
  if (extra?.optOutSource) stored.optOutSource = extra.optOutSource;
  if (event.consentBasis) stored.consentBasis = event.consentBasis;
  if (event.emailSource) stored.emailSource = event.emailSource;
  if (event.note) stored.note = event.note;
  return stored;
}

function sameInstant(left: string, right: string) {
  const a = new Date(left).getTime();
  const b = new Date(right).getTime();
  return Number.isFinite(a) && a === b;
}

type ApplyResult =
  | { ok: true; duplicate: boolean; record: OutreachRecord; lift: boolean }
  | { ok: false; status: number; error: string };

function refusal(record: OutreachRecord, company: Company, dnc: DncEntry[], today: string, followup: boolean): ApplyResult | null {
  if (!followup && record.touches > 0) return { ok: false, status: 409, error: "touch" };
  if (dncBlocks(dnc, company.domain, company.email, today)) return { ok: false, status: 409, error: "do-not-contact" };
  if (company.cardFlags?.includes("No unsolicited email")) return { ok: false, status: 409, error: "no-unsolicited" };
  if (record.optedOutAt || record.bouncedAt) return { ok: false, status: 409, error: "stopped" };
  if (!company.email.trim()) return { ok: false, status: 409, error: "blank-email" };
  if (!currentWriteToken()) return { ok: false, status: 409, error: "no-unsubscribe" };
  return null;
}

function storeSentCopy(record: OutreachRecord, touch: number, event: ParsedEvent) {
  if (event.subject == null || event.body == null) return;
  const key = String(touch) as "1" | "2" | "3";
  const drafts = { ...(record.drafts ?? {}) };
  const prior = drafts[key] ?? {};
  drafts[key] = { ...prior, sent: { subject: event.subject, body: event.body, at: event.at } };
  record.drafts = drafts;
}

function editedFlag(record: OutreachRecord, touch: number, event: ParsedEvent) {
  const key = String(touch) as "1" | "2" | "3";
  const draft = record.drafts?.[key];
  if (event.subject != null && event.body != null && draft && (draft.subject || draft.body)) {
    return event.subject !== (draft.subject ?? "") || event.body !== (draft.body ?? "");
  }
  return event.edited === true;
}

/**
 * Person scope writes the card's own email. Company scope writes the domain.
 * The payload never supplies the address. A failed DNC write stores no event.
 */
export async function recordOptOut(input: {
  redis: LeadsRedis;
  company: Company;
  record: OutreachRecord;
  scope: "person" | "company";
  at: string;
  source: "reply" | "link";
  event?: OutreachEvent;
}): Promise<ApplyResult> {
  if (input.scope === "person" && !input.company.email.trim()) {
    return { ok: false, status: 409, error: "blank-email" };
  }
  try {
    await appendDoNotContact({
      domain: input.company.domain,
      email: input.scope === "person" ? input.company.email : "",
      reason: "unsubscribe",
      today: edmontonToday(),
    });
  } catch {
    return { ok: false, status: 503, error: "Unavailable" };
  }
  const record = input.record;
  if (!record.optedOutAt) {
    record.optedOutAt = input.at;
    record.optOutScope = input.scope;
    record.optOutSource = input.source;
    if (input.event) record.events.push(input.event);
  }
  await writeOutreachRecord(input.redis, record);
  return { ok: true, duplicate: false, record, lift: false };
}

async function applyEvent(
  redis: LeadsRedis,
  company: Company,
  existing: OutreachRecord | null,
  event: ParsedEvent,
  dnc: DncEntry[],
): Promise<ApplyResult> {
  const record: OutreachRecord = existing ?? { cardId: company.id, touches: 0, events: [] };
  const prior = record.events.find((item) => item.eventId === event.eventId);
  if (prior) {
    if (prior.type === event.type && sameInstant(prior.at, event.at)) {
      return { ok: true, duplicate: true, record, lift: false };
    }
    return { ok: false, status: 409, error: "event-id" };
  }
  if (record.events.length >= MAX_EVENTS) return { ok: false, status: 409, error: "event-cap" };
  const today = edmontonToday();
  if (event.type === "sent" || event.type === "followup_sent") {
    const blocked = refusal(record, company, dnc, today, event.type === "followup_sent");
    if (blocked) return blocked;
  }
  if (event.type === "sent") {
    if (event.emailSource !== company.emailSource) return { ok: false, status: 409, error: "email-source" };
    const edited = editedFlag(record, 1, event);
    storeSentCopy(record, 1, event);
    record.domain = normalizeDomain(company.domain);
    record.email = company.email.trim().toLowerCase();
    record.experimentId = event.experimentId;
    record.variantId = event.variantId;
    record.threadId = event.threadId;
    record.consentBasis = event.consentBasis;
    record.emailSource = event.emailSource;
    record.edited = edited;
    record.firstSentAt = event.at;
    record.lastSentAt = event.at;
    record.touches = 1;
    record.events.push(toStoredEvent(event, { edited }));
    await writeOutreachRecord(redis, record);
    return { ok: true, duplicate: false, record, lift: true };
  }
  if (event.type === "followup_sent") {
    if (record.repliedAt || record.bookedAt) return { ok: false, status: 409, error: "stopped" };
    if (event.touch !== record.touches + 1) return { ok: false, status: 409, error: "touch" };
    if (event.threadId !== record.threadId) return { ok: false, status: 409, error: "thread" };
    const edited = editedFlag(record, event.touch ?? 0, event);
    storeSentCopy(record, event.touch ?? 0, event);
    record.lastSentAt = event.at;
    record.touches = event.touch ?? record.touches;
    record.events.push(toStoredEvent(event, { edited }));
    await writeOutreachRecord(redis, record);
    return { ok: true, duplicate: false, record, lift: true };
  }
  if (event.type === "replied") {
    const stored = toStoredEvent(event);
    if (event.replyType === "auto_reply") {
      record.events.push(stored);
      await writeOutreachRecord(redis, record);
      return { ok: true, duplicate: false, record, lift: false };
    }
    const rankNow = REPLY_RANK[event.replyType as Exclude<ReplyType, "auto_reply">];
    if (!record.repliedAt) {
      record.repliedAt = event.at;
      record.replyType = event.replyType;
    } else if (record.replyType && record.replyType !== "auto_reply" && rankNow > REPLY_RANK[record.replyType]) {
      record.replyType = event.replyType;
    }
    record.events.push(stored);
    await writeOutreachRecord(redis, record);
    return { ok: true, duplicate: false, record, lift: true };
  }
  if (event.type === "opted_out") {
    return recordOptOut({
      redis,
      company,
      record,
      scope: event.optOutScope ?? "person",
      at: event.at,
      source: "reply",
      event: toStoredEvent(event, { optOutSource: "reply" }),
    });
  }
  if (event.type === "bounced") {
    record.bouncedAt = event.at;
    record.bouncedEmail = company.email.trim().toLowerCase();
    record.events.push(toStoredEvent(event));
    await writeOutreachRecord(redis, record);
    return { ok: true, duplicate: false, record, lift: false };
  }
  record.bookedAt = event.at;
  record.events.push(toStoredEvent(event));
  await writeOutreachRecord(redis, record);
  return { ok: true, duplicate: false, record, lift: true };
}

export async function handleOutreach(request: Request) {
  const started = Date.now();
  let eventId = "";
  let cardId = "";
  let type = "";
  const finish = (status: number, body: unknown) => {
    console.info(JSON.stringify({ eventId, cardId, type, status, ms: Date.now() - started }));
    return json(body, status);
  };
  try {
    if (request.method !== "POST") return finish(405, { error: "Method not allowed" });
    // The previous write token is intentionally not read here.
    if (!bearerConfigured(request.headers.get("authorization"), process.env.HUNTER_WRITE_TOKEN)) {
      return finish(401, { error: "Unauthorized" });
    }
    const contentType = request.headers.get("content-type") ?? "";
    if (!/^application\/json(?:\s*;|$)/i.test(contentType)) return finish(415, { error: "Unsupported media type" });
    const bytes = new Uint8Array(await request.arrayBuffer());
    if (bytes.byteLength > MAX_BODY_BYTES) return finish(413, { error: "Payload too large" });
    let payload: unknown;
    try {
      payload = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      return finish(400, { error: "invalid", field: "body" });
    }
    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
      const row = payload as Record<string, unknown>;
      eventId = logSafe(row.eventId);
      cardId = logSafe(row.cardId);
      type = logSafe(row.type);
    }
    const parsed = parseEvent(payload, Date.now());
    if (!parsed.ok) return finish(400, { error: "invalid", field: parsed.field });
    eventId = parsed.event.eventId;
    cardId = parsed.event.cardId;
    type = parsed.event.type;
    const redis = await getRedisClient();
    if (!redis) return finish(503, { error: "Unavailable", retryable: true });
    const loaded = await loadBook();
    if (loaded.storage !== "redis") return finish(503, { error: "Unavailable", retryable: true });
    if (!loaded.book.companies.some((company) => company.id === parsed.event.cardId)) {
      return finish(404, { error: "unknown-card" });
    }
    const outcome = await withOutreachLock(redis, parsed.event.cardId, async () => {
      const fresh = await loadBook();
      const company = fresh.book.companies.find((item) => item.id === parsed.event.cardId);
      if (!company || fresh.storage !== "redis") return { missing: true as const };
      const dnc = await loadDoNotContact(redis);
      const existing = await readOutreachRecord(redis, company.id);
      const applied = await applyEvent(redis, company, existing, parsed.event, dnc);
      return { missing: false as const, company, applied };
    });
    if (outcome == null) return finish(503, { error: "Unavailable", retryable: true });
    if (outcome.missing) return finish(404, { error: "unknown-card" });
    if (!outcome.applied.ok) {
      if (outcome.applied.status === 503) return finish(503, { error: "Unavailable", retryable: true });
      return finish(outcome.applied.status, { error: outcome.applied.error });
    }
    if (outcome.applied.lift || outcome.applied.duplicate) {
      try {
        await persistLift(outcome.company.id, outcome.applied.record);
      } catch {
        console.error("[outreach] pipeline lift was not saved");
      }
    }
    const liftedBook = await loadBook();
    const lifted = liftedBook.book.companies.find((item) => item.id === outcome.company.id) ?? outcome.company;
    return finish(200, {
      ok: true,
      duplicate: outcome.applied.duplicate,
      outreach: outcome.applied.record,
      pipeline: pipelineFor(lifted, outcome.applied.record),
    });
  } catch {
    return finish(503, { error: "Unavailable", retryable: true });
  }
}

function placeParts(place: string) {
  const regions: { region: string; pattern: RegExp }[] = [
    { region: "Newfoundland and Labrador", pattern: /\bNewfoundland and Labrador\b/i },
    { region: "Prince Edward Island", pattern: /\bPrince Edward Island\b/i },
    { region: "British Columbia", pattern: /\bBritish Columbia\b/i },
    { region: "Northwest Territories", pattern: /\bNorthwest Territories\b/i },
    { region: "New Brunswick", pattern: /\bNew Brunswick\b/i },
    { region: "Nova Scotia", pattern: /\bNova Scotia\b/i },
    { region: "Saskatchewan", pattern: /\bSaskatchewan\b/i },
    { region: "Alberta", pattern: /\bAlberta\b/i },
    { region: "Manitoba", pattern: /\bManitoba\b/i },
    { region: "Ontario", pattern: /\bOntario\b/i },
    { region: "Quebec", pattern: /\bQu[eé]bec\b/i },
    { region: "Yukon", pattern: /\bYukon\b/i },
    { region: "Nunavut", pattern: /\bNunavut\b/i },
    { region: "Alberta", pattern: /\bAB\b/ },
    { region: "British Columbia", pattern: /\bBC\b/ },
    { region: "Saskatchewan", pattern: /\bSK\b/ },
    { region: "Manitoba", pattern: /\bMB\b/ },
    { region: "Ontario", pattern: /\bON\b/ },
    { region: "Quebec", pattern: /\bQC\b/ },
    { region: "New Brunswick", pattern: /\bNB\b/ },
    { region: "Nova Scotia", pattern: /\bNS\b/ },
    { region: "Prince Edward Island", pattern: /\bPE\b/ },
    { region: "Newfoundland and Labrador", pattern: /\bNL\b/ },
    { region: "Yukon", pattern: /\bYT\b/ },
    { region: "Northwest Territories", pattern: /\bNT\b/ },
    { region: "Nunavut", pattern: /\bNU\b/ },
  ];
  let region = "";
  for (const item of regions) {
    if (item.pattern.test(place)) {
      region = item.region;
      break;
    }
  }
  let country = "";
  if (/\bCanada\b/i.test(place)) country = "Canada";
  else if (/\bUnited States\b/i.test(place) || /\bUSA\b/.test(place)) country = "United States";
  return { country, region };
}

function caslCheck(company: Company): "apollo-stamp" | "page" | "none" {
  if (company.casl?.provider === "Apollo") return "apollo-stamp";
  const published = company.casl?.publishedOn?.trim() ?? "";
  if (/^https?:\/\//i.test(published)) return "page";
  return "none";
}

function dncView(entries: DncEntry[], domain: string, email: string, today: string) {
  const blocking = entries.filter((entry) => dncBlocks([entry], domain, email, today));
  if (blocking.length === 0) return { blocked: false, reason: "" as DncReason | "", scope: "" as const };
  const person = blocking.find((entry) => entry.email);
  const chosen = person ?? blocking[0];
  return {
    blocked: true,
    reason: chosen?.reason ?? "",
    scope: chosen?.email ? ("person" as const) : ("company" as const),
  };
}

function summaryOf(record: OutreachRecord, includeEmail: boolean) {
  return {
    cardId: record.cardId,
    domain: record.domain ?? "",
    ...(includeEmail ? { email: record.email ?? "" } : {}),
    experimentId: record.experimentId ?? "",
    variantId: record.variantId ?? "",
    threadId: record.threadId ?? "",
    consentBasis: record.consentBasis ?? "",
    emailSource: record.emailSource ?? "",
    edited: record.edited === true,
    firstSentAt: record.firstSentAt ?? "",
    lastSentAt: record.lastSentAt ?? "",
    touches: record.touches,
    repliedAt: record.repliedAt ?? "",
    replyType: record.replyType ?? "",
    optedOutAt: record.optedOutAt ?? "",
    optOutScope: record.optOutScope ?? "",
    optOutSource: record.optOutSource ?? "",
    bouncedAt: record.bouncedAt ?? "",
    ...(includeEmail ? { bouncedEmail: record.bouncedEmail ?? "" } : {}),
    bookedAt: record.bookedAt ?? "",
    events: record.events,
  };
}

function sentBlocksQualifying(record: OutreachRecord | null, email: string) {
  if (!record?.firstSentAt) return false;
  const current = email.trim().toLowerCase();
  if (record.bouncedAt && record.bouncedEmail && current && current !== record.bouncedEmail.trim().toLowerCase()) return false;
  return true;
}

function cocoCard(company: Company, record: OutreachRecord | null, dnc: DncEntry[], today: string) {
  const scored = scoreCompany(company);
  const [effective] = applyOutreachMarks([company], record ? new Map([[company.id, record]]) : new Map());
  const placed = placeParts(company.place ?? "");
  const link = unsubscribeUrl(company.id);
  return {
    id: company.id,
    org: company.org,
    domain: company.domain,
    sourceUrl: company.sourceUrl,
    industry: company.industry,
    sizeBand: company.sizeBand,
    place: company.place ?? "",
    city: company.city,
    hunterRegion: company.hunterRegion ?? "",
    country: placed.country,
    region: placed.region,
    buyerName: company.buyerName,
    buyerTitle: company.buyerTitle,
    email: company.email,
    emailSource: company.emailSource,
    contactSource: company.contactSource ?? "",
    apolloEmailStatus: company.apolloEmailStatus ?? "",
    contactRetrievedOn: company.contactRetrievedOn ?? "",
    apolloUpdatedOn: company.apolloUpdatedOn ?? "",
    contactLastSeenOn: company.contactLastSeenOn ?? "",
    emailMx: company.emailMx ?? null,
    cardFlags: company.cardFlags ?? [],
    enrichment: company.enrichment ?? "",
    enrichmentOn: company.enrichmentOn ?? "",
    why: company.why,
    whySources: company.whySources ?? [],
    signals: company.signals ?? [],
    profileHits: company.profileHits ?? [],
    facts: company.facts ?? [],
    hunterScore: company.hunterScore ?? null,
    hunterBreak: company.hunterBreak ?? null,
    score100: scored.total,
    band: scored.band,
    contactReady: isContactReady(company),
    casl: company.casl ?? null,
    caslCheck: caslCheck(company),
    caslStatus: company.caslStatus ?? "",
    review: company.review ?? "unreviewed",
    reviewedOn: company.reviewedOn ?? "",
    filedOn: company.filedOn ?? "",
    pipeline: effective?.pipeline ?? "",
    pipelineOn: effective?.pipelineOn ?? "",
    dnc: dncView(dnc, company.domain, company.email, today),
    outreach: record ? summaryOf(record, true) : null,
    unsubscribeUrl: link,
  };
}

type CocoCard = ReturnType<typeof cocoCard>;

function qualifyingFailures(company: Company, record: OutreachRecord | null, dnc: DncEntry[], today: string): SkipRule[] {
  const failed: SkipRule[] = [];
  if (!isContactReady(company)) failed.push("contact-ready");
  if (company.review !== "approved") failed.push("review");
  const recovered =
    !!record?.firstSentAt && !!record.bouncedAt && !sentBlocksQualifying(record, company.email);
  if (sentBlocksQualifying(record, company.email)) failed.push("already-sent");
  const [effective] = applyOutreachMarks([company], record ? new Map([[company.id, record]]) : new Map());
  const pipeline = effective?.pipeline ?? "";
  if (pipeline === "lost" || pipeline === "won" || (pipeline !== "" && !recovered)) failed.push("pipeline");
  if (dncBlocks(dnc, company.domain, company.email, today)) failed.push("do-not-contact");
  if (company.cardFlags?.includes("No unsolicited email")) failed.push("no-unsolicited");
  if (company.cardFlags?.includes("Stale")) failed.push("stale");
  if (company.cardFlags?.includes("Apollo email not verified")) failed.push("apollo-unverified");
  if (company.emailMx === false) failed.push("email-mx");
  if (!company.email.trim()) failed.push("email-blank");
  if (record?.bouncedEmail && company.email.trim().toLowerCase() === record.bouncedEmail.trim().toLowerCase()) {
    failed.push("bounced-email");
  }
  if (!unsubscribeUrl(company.id)) failed.push("no-unsubscribe-link");
  return failed;
}

function inSequence(company: Company, record: OutreachRecord | null) {
  if (!record?.firstSentAt) return false;
  if (record.repliedAt || record.optedOutAt || record.bouncedAt || record.bookedAt) return false;
  if (record.touches >= 3) return false;
  const [effective] = applyOutreachMarks([company], new Map([[company.id, record]]));
  const pipeline = effective?.pipeline ?? "";
  return pipeline !== "lost" && pipeline !== "won";
}

function encodeCursor(key: string) {
  return Buffer.from(key, "utf8").toString("base64url");
}

function decodeCursor(cursor: string) {
  try {
    const text = Buffer.from(cursor, "base64url").toString("utf8");
    if (!text || text.length > 500) return null;
    return text;
  } catch {
    return null;
  }
}

function pageByKey<T>(rows: T[], limit: number, cursor: string | null, keyOf: (row: T) => string) {
  let start = 0;
  if (cursor) {
    const key = decodeCursor(cursor);
    if (!key) throw new InvalidParam("cursor");
    const index = rows.findIndex((row) => keyOf(row) === key);
    if (index < 0) throw new InvalidParam("cursor");
    start = index + 1;
  }
  const slice = rows.slice(start, start + limit);
  const last = slice.at(-1);
  const more = start + slice.length < rows.length;
  return { slice, total: rows.length, nextCursor: more && last ? encodeCursor(keyOf(last)) : null };
}

function readLimit(url: URL) {
  const raw = url.searchParams.get("limit");
  if (raw == null || raw === "") return 25;
  if (!/^\d+$/.test(raw)) throw new InvalidParam("limit");
  const limit = Number(raw);
  if (limit < 1 || limit > 50) throw new InvalidParam("limit");
  return limit;
}

function readSince(url: URL) {
  const raw = url.searchParams.get("since");
  if (raw == null || raw === "") return null;
  if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(raw)) {
    throw new InvalidParam("since");
  }
  const parsed = new Date(raw.length === 10 ? `${raw}T00:00:00.000Z` : raw);
  if (Number.isNaN(parsed.getTime())) throw new InvalidParam("since");
  return parsed.toISOString();
}

function qualifyingKey(card: CocoCard) {
  const score = typeof card.hunterScore === "number" ? card.hunterScore : -1;
  return JSON.stringify([score, card.filedOn, card.id]);
}

export async function handleCardRead(url: URL) {
  try {
    const view = url.searchParams.get("view")?.trim() ?? "";
    const limit = readLimit(url);
    const cursor = url.searchParams.get("cursor");
    const redis = await getRedisClient();
    if (!redis) return json({ error: "Unavailable", retryable: true }, 503);
    const loaded = await loadBook();
    if (loaded.storage !== "redis") return json({ error: "Unavailable", retryable: true }, 503);
    const records = await readOutreachMap(redis);
    const dnc = await loadDoNotContact(redis);
    const today = edmontonToday();
    if (view === "card") {
      const id = url.searchParams.get("id")?.trim() ?? "";
      if (!id) throw new InvalidParam("id");
      const company = loaded.book.companies.find((item) => item.id === id);
      if (!company) return json({ error: "unknown-card" }, 404);
      return json({ view, card: cocoCard(company, records.get(id) ?? null, dnc, today) }, 200);
    }
    if (view === "qualifying") {
      const skipped = Object.fromEntries(SKIP_RULES.map((rule) => [rule, 0])) as Record<SkipRule, number>;
      const passed: CocoCard[] = [];
      for (const company of loaded.book.companies) {
        const failed = qualifyingFailures(company, records.get(company.id) ?? null, dnc, today);
        if (failed.length > 0) {
          for (const rule of failed) skipped[rule] += 1;
          continue;
        }
        passed.push(cocoCard(company, records.get(company.id) ?? null, dnc, today));
      }
      passed.sort((a, b) => {
        const score = (b.hunterScore ?? -1) - (a.hunterScore ?? -1);
        if (score !== 0) return score;
        const filed = a.filedOn.localeCompare(b.filedOn);
        if (filed !== 0) return filed;
        return a.id.localeCompare(b.id);
      });
      const page = pageByKey(passed, limit, cursor, qualifyingKey);
      return json({ view, total: page.total, nextCursor: page.nextCursor, skipped, cards: page.slice }, 200);
    }
    if (view === "in-sequence") {
      const cards = loaded.book.companies
        .filter((company) => inSequence(company, records.get(company.id) ?? null))
        .map((company) => cocoCard(company, records.get(company.id) ?? null, dnc, today))
        .sort((a, b) => {
          const left = a.outreach?.lastSentAt ?? "";
          const right = b.outreach?.lastSentAt ?? "";
          const byTime = left.localeCompare(right);
          return byTime === 0 ? a.id.localeCompare(b.id) : byTime;
        });
      const page = pageByKey(cards, limit, cursor, (card) => JSON.stringify([card.outreach?.lastSentAt ?? "", card.id]));
      return json({ view, total: page.total, nextCursor: page.nextCursor, cards: page.slice }, 200);
    }
    const since = readSince(url);
    const cards = loaded.book.companies
      .flatMap((company) => {
        const record = records.get(company.id);
        if (!record) return [];
        if (since && !record.events.some((event) => event.at >= since)) return [];
        const scored = scoreCompany(company);
        const [effective] = applyOutreachMarks([company], new Map([[company.id, record]]));
        return [
          {
            id: company.id,
            org: company.org,
            domain: company.domain,
            hunterScore: company.hunterScore ?? null,
            score100: scored.total,
            band: scored.band,
            pipeline: effective?.pipeline ?? "",
            pipelineOn: effective?.pipelineOn ?? "",
            outreach: summaryOf(record, false),
            unsubscribeUrl: unsubscribeUrl(company.id),
          },
        ];
      })
      .sort((a, b) => a.id.localeCompare(b.id));
    const page = pageByKey(cards, limit, cursor, (card) => card.id);
    return json({ view: "outreach", total: page.total, nextCursor: page.nextCursor, cards: page.slice }, 200);
  } catch (error) {
    if (error instanceof InvalidParam) return json({ error: "invalid", field: error.field }, 400);
    return json({ error: "Unavailable", retryable: true }, 503);
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    if (char === "&") return "&amp;";
    if (char === "<") return "&lt;";
    if (char === ">") return "&gt;";
    if (char === '"') return "&quot;";
    return "&#39;";
  });
}

function unsubscribePage(input: { message: string; token?: string; mask?: string }) {
  const detail = input.mask
    ? `<p>This stops email from Unearth Self to ${escapeHtml(input.mask)}.</p>`
    : `<p>${escapeHtml(input.message)}</p>`;
  const form = input.token
    ? `<form method="post" action="/u/${escapeHtml(input.token)}"><button type="submit">Unsubscribe</button></form>`
    : "";
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<meta name="referrer" content="no-referrer">
<title>Unsubscribe</title>
<style>
  body { margin: 0; background: #f4f1ea; color: #161718; font: 18px/1.5 Georgia, serif; }
  main { max-width: 34rem; margin: 0 auto; padding: 3.5rem 1.25rem 4rem; }
  h1 { font-size: 2rem; font-weight: 500; margin: 0 0 1rem; }
  button { font: inherit; background: #161718; color: #f4f1ea; border: 0; padding: 0.65rem 1rem; cursor: pointer; }
  footer { margin-top: 2.5rem; }
  a { color: inherit; }
</style>
</head>
<body>
<main>
  <h1>Unsubscribe</h1>
  ${input.token ? detail : `<p>${escapeHtml(input.message)}</p>`}
  ${form}
  <footer>
    <p>Unearth Self<br>356 4 Street West<br>Drumheller, Alberta</p>
    <p><a href="https://www.unearthself.xyz/" rel="noreferrer">unearthself.xyz</a></p>
  </footer>
</main>
</body>
</html>`;
  return new Response(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "referrer-policy": "no-referrer",
      "x-robots-tag": "noindex, nofollow",
      "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'",
    },
  });
}

function tokenFromPath(request: Request) {
  try {
    const url = new URL(request.url);
    const parts = url.pathname.split("/").filter(Boolean);
    return decodeURIComponent(parts[1] ?? "");
  } catch {
    return "";
  }
}

export async function handleUnsubscribe(request: Request) {
  if (request.method !== "GET" && request.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { "cache-control": "no-store", "referrer-policy": "no-referrer", "content-type": "text/plain; charset=utf-8" },
    });
  }
  if (!currentWriteToken()) {
    return unsubscribePage({ message: "Unsubscribe is unavailable just now." });
  }
  const cardId = readUnsubscribeCardId(tokenFromPath(request));
  if (!cardId) return unsubscribePage({ message: "This link isn't valid." });
  if (request.method === "GET") {
    let mask = "";
    try {
      const loaded = await loadBook();
      const company = loaded.book.companies.find((item) => item.id === cardId);
      if (company) mask = maskEmail(company.email);
    } catch {
      mask = "";
    }
    return unsubscribePage({
      message: "This stops email from Unearth Self.",
      token: tokenFromPath(request),
      mask,
    });
  }
  try {
    const redis = await getRedisClient();
    if (!redis) return json({ error: "Unavailable", retryable: true }, 503);
    const outcome = await withOutreachLock(redis, cardId, async () => {
      const loaded = await loadBook();
      const company = loaded.storage === "redis" ? loaded.book.companies.find((item) => item.id === cardId) : undefined;
      if (!company || !company.email.trim()) return "missing" as const;
      const existing = (await readOutreachRecord(redis, company.id)) ?? { cardId: company.id, touches: 0, events: [] };
      const at = new Date().toISOString();
      if (existing.optedOutAt) {
        await appendDoNotContact({
          domain: company.domain,
          email: company.email,
          reason: "unsubscribe",
          today: edmontonToday(),
        });
        return "done" as const;
      }
      const applied = await recordOptOut({
        redis,
        company,
        record: existing,
        scope: "person",
        at,
        source: "link",
        event: {
          eventId: `link-${cardId}`.slice(0, 80),
          type: "opted_out",
          at,
          optOutScope: "person",
          optOutSource: "link",
        },
      });
      if (!applied.ok) return "unavailable" as const;
      return "done" as const;
    });
    if (outcome == null || outcome === "unavailable") return json({ error: "Unavailable", retryable: true }, 503);
    if (outcome === "missing") return unsubscribePage({ message: "This link isn't valid." });
    return unsubscribePage({ message: "You're unsubscribed. We won't email that address from Unearth Self." });
  } catch {
    return json({ error: "Unavailable", retryable: true }, 503);
  }
}
