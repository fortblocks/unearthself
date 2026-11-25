/**
 * Coco's write route and the card views behind it.
 * Outreach lives in its own hash so a desk save cannot wipe it.
 * Unsubscribe links are signed with a key derived from HUNTER_WRITE_TOKEN.
 * HUNTER_UNSUBSCRIBE_KEY_RING verifies links signed by a previous token for 60 days after that token was retired.
 * HUNTER_WRITE_TOKEN_PREVIOUS is not a verification key.
 */

import { createHash, createHmac, hkdfSync, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { getRedisClient, loadBook, saveBook, type LeadsRedis } from "./leads-book.ts";
import { bearerConfigured } from "./hunter-read.ts";
import { isContactReady } from "./hunter-cap.ts";
import {
  appendDoNotContact,
  loadDoNotContact,
} from "./leads-hunter.ts";
import { dncBlocks, type DncEntry, type DncReason, type PipelineMark } from "./hunter-phase.ts";
import { draftMentionsTessAndI, greetingNameCheck } from "./coco-letter.ts";
import { humanizerCheck } from "./humanizer.ts";
import { draftHasPrice, draftProblems } from "./lead-copy.ts";
import {
  edmontonToday,
  hasAccess,
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

const EVENT_TYPES = [
  "sent",
  "followup_sent",
  "replied",
  "opted_out",
  "bounced",
  "booked",
  "drafting",
  "drafted",
  "send_approved",
  "draft_skipped",
  "send_withdrawn",
] as const;
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
  "sources",
  "note",
  "reason",
]);

const FIELDS_FOR: Record<EventType, string[]> = {
  sent: ["touch", "experimentId", "variantId", "threadId", "messageId", "fromAddress", "edited", "consentBasis", "emailSource", "subject", "body", "note"],
  followup_sent: ["touch", "experimentId", "variantId", "threadId", "messageId", "fromAddress", "edited", "subject", "body", "note"],
  replied: ["replyType", "messageId", "note"],
  opted_out: ["optOutScope", "messageId", "note"],
  bounced: ["messageId", "note"],
  booked: ["messageId", "note"],
  drafting: ["touch"],
  drafted: ["touch", "subject", "body", "variantId", "experimentId", "sources"],
  send_approved: ["touch", "subject", "body"],
  draft_skipped: ["touch", "reason"],
  send_withdrawn: ["touch"],
};

const CLAIM_MS = 15 * 60 * 1000;
const WEBHOOK_TIMEOUT_MS = 2500;

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
  reason?: string;
};

type SentCopy = { subject: string; body: string; at: string };
type DraftClaim = { eventId: string; at: string };

/** A page Coco cited for this draft. It is not part of the email. */
export type DraftSource = { url: string; note?: string };

const MAX_DRAFT_SOURCES = 10;
const MAX_SOURCE_URL = 500;
const MAX_SOURCE_NOTE = 200;

type OutreachDraft = {
  subject?: string;
  body?: string;
  editedSubject?: string;
  editedBody?: string;
  variantId?: string;
  experimentId?: string;
  draftedAt?: string;
  problems?: string[];
  claim?: DraftClaim;
  sent?: SentCopy;
  /** True when this desk added the plain-text unsubscribe URL to the draft. */
  unsubscribeAppended?: boolean;
  /** Replaced wholesale by the next drafted event. A desk edit does not change it. */
  sources?: DraftSource[];
  /** Section 4 gate. True only when the reject list is clear. */
  humanizerPass?: boolean;
  humanizerNotes?: string[];
};

type OutreachQueue = { queuedAt: string; queuedBy: string };

export type SendApproved = {
  eventId: string;
  touch: number;
  subject: string;
  body: string;
  at: string;
};

type DraftSkipped = { reason: string; touch: number; at: string };

/** The last rejected write-back. The check is a short code. The draft text is not stored. */
type DraftRejected = { at: string; check: string };

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
  queue?: OutreachQueue;
  sendApproved?: SendApproved;
  draftSkipped?: DraftSkipped;
  draftRejected?: DraftRejected;
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
  sources?: DraftSource[];
  note?: string;
  reason?: string;
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

function rejectionCopy(payload: unknown): { subject?: string; body?: string } | undefined {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return undefined;
  const row = payload as Record<string, unknown>;
  const subject = typeof row.subject === "string" ? row.subject : undefined;
  const body = typeof row.body === "string" ? row.body : undefined;
  if (!subject && !body) return undefined;
  return { subject, body };
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

/** The opt-out sentence. The link sits on "Unsubscribe here". The card shows this same line as text. */
export const UNSUBSCRIBE_NOTICE = "Don't want these emails? Unsubscribe here and we won't contact you again.";

/** Postal address on every outreach footer and on the unsubscribe page. */
export const OUTREACH_POSTAL_ADDRESS = "356 4th Street West, Drumheller, Alberta, T0J 0Y3, Canada";

/** Second contact method on those footers. The card shows the words. The sent HTML links them. */
export const OUTREACH_SITE = "www.unearthself.xyz";

const OUTREACH_SITE_URL = "https://www.unearthself.xyz/";

/**
 * Sender identification on the outreach footer. Legal has not approved the wording.
 * Leave this equal to the placeholder until Legal replaces it with the approved line.
 * While it is the placeholder, Approve to send and a send_approved event fail closed.
 * The placeholder is not written into a draft, the card, the unsubscribe page, or a send.
 */
export const OUTREACH_SENDER_IDENTIFICATION_PLACEHOLDER = "[SENDER IDENTIFICATION PENDING LEGAL]";
export const OUTREACH_SENDER_IDENTIFICATION = OUTREACH_SENDER_IDENTIFICATION_PLACEHOLDER;

let senderIdentificationOverride: string | null = null;

/** Tests only. A live send reads OUTREACH_SENDER_IDENTIFICATION and ignores this. */
export function setOutreachSenderIdentificationForTests(value: string | null) {
  senderIdentificationOverride = value;
}

/** Empty, the placeholder, a "PENDING LEGAL" line, or a bracketed stand-in is not approved wording. */
export function senderIdentificationReady(value = senderIdentificationOverride ?? OUTREACH_SENDER_IDENTIFICATION): boolean {
  const text = value.trim();
  if (!text) return false;
  if (text === OUTREACH_SENDER_IDENTIFICATION_PLACEHOLDER) return false;
  if (/\bPENDING LEGAL\b/i.test(text)) return false;
  if (text.startsWith("[") && text.endsWith("]")) return false;
  return true;
}

function configuredReadySender(): string {
  const text = OUTREACH_SENDER_IDENTIFICATION.trim();
  return senderIdentificationReady(text) ? text : "";
}

function effectiveSenderIdentification(): string {
  const text = (senderIdentificationOverride ?? OUTREACH_SENDER_IDENTIFICATION).trim();
  return senderIdentificationReady(text) ? text : "";
}

function footerSender(sender: string): string {
  const text = sender.trim();
  return senderIdentificationReady(text) ? text : "";
}

/** HTML anchor. The visible words are "Unsubscribe here". The token stays in the href. */
export function unsubscribeHtml(link: string, sender = configuredReadySender()) {
  const who = footerSender(sender);
  const line = who ? `${escapeHtml(who)}<br>` : "";
  return `${line}Don't want these emails? <a href="${escapeHtml(link)}">Unsubscribe here</a> and we won't contact you again.<br>${OUTREACH_POSTAL_ADDRESS}<br><a href="${OUTREACH_SITE_URL}">${OUTREACH_SITE}</a>`;
}

/** Plain-text fallback for a client that does not render the anchor. The URL stays so a reply can still opt out. */
export function unsubscribePlain(link: string, sender = configuredReadySender()) {
  const who = footerSender(sender);
  const line = who ? `${who}\n` : "";
  return `${line}Don't want these emails? Unsubscribe here: ${link} and we won't contact you again.\n${OUTREACH_POSTAL_ADDRESS}\n${OUTREACH_SITE}`;
}

/**
 * The footer stored on a send. Returns null while sender identification is unset,
 * or when the body already contains the placeholder. Null means do not send and do not store.
 */
export function withOutreachFooter(body: string, link: string): string | null {
  const sender = effectiveSenderIdentification();
  if (!sender || body.includes(OUTREACH_SENDER_IDENTIFICATION_PLACEHOLDER)) return null;
  const letter = letterWithoutUnsubscribe(body, link);
  const block = `${unsubscribeHtml(link, sender)}\n${unsubscribePlain(link, sender)}`;
  const trimmed = letter.replace(/\s+$/g, "");
  const next = trimmed ? `${trimmed}\n\n${block}` : block;
  if (next.includes(OUTREACH_SENDER_IDENTIFICATION_PLACEHOLDER)) return null;
  if (!next.includes(sender) || !next.includes(link) || !next.includes(OUTREACH_POSTAL_ADDRESS) || !next.includes(OUTREACH_SITE)) return null;
  if (!next.includes(`<a href="${escapeHtml(link)}">Unsubscribe here</a>`)) return null;
  if (!next.includes(`Unsubscribe here: ${link}`)) return null;
  return next;
}

/** Muted card preview. The placeholder is never included. */
export function outreachFooterPreview(): string {
  const sender = configuredReadySender();
  const tail = `${UNSUBSCRIBE_NOTICE} ${OUTREACH_POSTAL_ADDRESS}. ${OUTREACH_SITE}`;
  return sender ? `Email footer (added automatically): ${sender}. ${tail}` : `Email footer (added automatically): ${tail}`;
}

/** A sample for Legal. Not used by a route, the card, or a send. */
export function renderLegalReviewSample(link = "https://www.unearthself.xyz/u/sample-not-a-live-link") {
  const sender = OUTREACH_SENDER_IDENTIFICATION_PLACEHOLDER;
  const letter = "Hello,\n\nThis sample is for Legal review. It is not addressed to a real person, and it has not been sent.";
  const htmlFooter = `${escapeHtml(sender)}<br>Don't want these emails? <a href="${escapeHtml(link)}">Unsubscribe here</a> and we won't contact you again.<br>${OUTREACH_POSTAL_ADDRESS}<br><a href="${OUTREACH_SITE_URL}">${OUTREACH_SITE}</a>`;
  const textFooter = `${sender}\nDon't want these emails? Unsubscribe here: ${link} and we won't contact you again.\n${OUTREACH_POSTAL_ADDRESS}\n${OUTREACH_SITE}`;
  const htmlLetter = escapeHtml(letter).replace(/\n\n/g, "</p><p>");
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Sample outreach email</title></head>
<body>
<p><strong>Sample for Legal review.</strong> The sender line below is a placeholder. It is not shown on the site, and a send is refused while that placeholder is still the configured wording.</p>
<p>From: ${escapeHtml(FROM_ADDRESS)}</p>
<p>Subject: A note from Unearth Self</p>
<p>${htmlLetter}</p>
<p>${htmlFooter}</p>
</body>
</html>`;
  const text = `Sample for Legal review. The sender line below is a placeholder. It is not shown on the site, and a send is refused while that placeholder is still the configured wording.

From: ${FROM_ADDRESS}
Subject: A note from Unearth Self

${letter}

${textFooter}
`;
  return { html, text };
}

export function unsubscribeBlock(link: string) {
  return `${unsubscribeHtml(link)}\n${unsubscribePlain(link)}`;
}

/**
 * Append the HTML anchor and the plain-text fallback when the draft does not already contain the URL.
 * A body that already contains the URL is left as it was.
 */
export function ensureUnsubscribeLink(body: string, link: string): { body: string; appended: boolean } {
  if (body.includes(link)) return { body, appended: false };
  const block = unsubscribeBlock(link);
  const trimmed = body.replace(/\s+$/g, "");
  if (!trimmed) return { body: block, appended: true };
  return { body: `${trimmed}\n\n${block}`, appended: true };
}

/** The letter without the unsubscribe footer, so the desk can show the anchor instead of the raw URL. */
export function letterWithoutUnsubscribe(body: string, link: string | null) {
  if (!link) return body;
  let next = body;
  const sender = effectiveSenderIdentification();
  const blocks = [unsubscribeBlock(link)];
  if (sender) blocks.unshift(`${unsubscribeHtml(link, sender)}\n${unsubscribePlain(link, sender)}`);
  let stripped = false;
  for (const footer of blocks) {
    const block = `\n\n${footer}`;
    if (next.endsWith(block)) {
      next = next.slice(0, -block.length);
      stripped = true;
      break;
    }
  }
  if (!stripped) {
    if (sender) {
      next = next.split(unsubscribeHtml(link, sender)).join("");
      next = next.split(unsubscribePlain(link, sender)).join("");
    }
    next = next.split(unsubscribeHtml(link)).join("");
    next = next.split(unsubscribePlain(link)).join("");
    const trailing = `\n\n${link}`;
    if (next.endsWith(trailing)) next = next.slice(0, -trailing.length);
    else if (next.trim() === link) next = "";
  }
  const legacyHtml = `<a href="${escapeHtml(link)}">unsubscribe</a>`;
  const legacyPlain = `unsubscribe: ${link}`;
  const previousHtml = `Don't want these emails? <a href="${escapeHtml(link)}">Unsubscribe here</a> and we won't contact you again.`;
  const previousPlain = `Don't want these emails? Unsubscribe here: ${link} and we won't contact you again.`;
  next = next.split(legacyHtml).join("");
  next = next.split(legacyPlain).join("");
  next = next.split(previousHtml).join("");
  next = next.split(previousPlain).join("");
  return next.replace(/[ \t]+$/g, "").replace(/\n{3,}/g, "\n\n").replace(/\s+$/g, "");
}

/** Name of the env var Chris sets. JSON array of { id, secret, retiredAt }. Unset or invalid is ignored. */
export const HUNTER_UNSUBSCRIBE_KEY_RING_ENV = "HUNTER_UNSUBSCRIBE_KEY_RING";

/** A retired signing key verifies for this long, including a key retired exactly this long ago. */
export const UNSUBSCRIBE_KEY_RING_WINDOW_MS = 60 * 24 * 60 * 60 * 1000;

const KEY_RING_LIMIT = 8;

/**
 * Previous unsubscribe signing keys. Each entry is
 * { "id": string, "secret": "<the retired HUNTER_WRITE_TOKEN>", "retiredAt": "<ISO-8601>" }.
 * secret is at least 32 characters and is derived with the same HKDF as the current token.
 * A key verifies only when now - retiredAt is from 0 through 60 days. A missing field, a future
 * retiredAt, an unparseable date, a short secret, invalid JSON, or an unset value is skipped.
 * The secret is never logged.
 */
export function unsubscribeKeysFromRing(raw: string | undefined, now: number): Buffer[] {
  if (!raw || !raw.trim()) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const keys: Buffer[] = [];
  for (const item of parsed.slice(0, KEY_RING_LIMIT)) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    if (typeof row.id !== "string" || !row.id.trim()) continue;
    if (typeof row.secret !== "string" || typeof row.retiredAt !== "string") continue;
    const retired = Date.parse(row.retiredAt);
    if (!Number.isFinite(retired)) continue;
    const age = now - retired;
    if (age < 0 || age > UNSUBSCRIBE_KEY_RING_WINDOW_MS) continue;
    const key = deriveUnsubscribeKey(row.secret);
    if (key) keys.push(key);
  }
  return keys;
}

function verificationKeys(now = Date.now()): Buffer[] {
  const current = deriveUnsubscribeKey(process.env.HUNTER_WRITE_TOKEN ?? "");
  if (!current) return [];
  return [current, ...unsubscribeKeysFromRing(process.env[HUNTER_UNSUBSCRIBE_KEY_RING_ENV], now)];
}

/** Accepts the current key and previous keys still inside the 60-day window. Returns the card id or null. */
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
    queue: readQueue(row.queue),
    sendApproved: readSendApproved(row.sendApproved),
    draftSkipped: readDraftSkipped(row.draftSkipped),
    draftRejected: readDraftRejected(row.draftRejected),
    drafts: row.drafts && typeof row.drafts === "object" ? row.drafts : undefined,
    events: row.events.filter((event) => event && typeof event === "object" && typeof event.eventId === "string"),
  };
}

function readQueue(value: unknown): OutreachQueue | undefined {
  if (!value || typeof value !== "object") return undefined;
  const row = value as { queuedAt?: unknown; queuedBy?: unknown };
  if (typeof row.queuedAt !== "string" || !row.queuedAt || typeof row.queuedBy !== "string") return undefined;
  return { queuedAt: row.queuedAt, queuedBy: row.queuedBy };
}

function readSendApproved(value: unknown): SendApproved | undefined {
  if (!value || typeof value !== "object") return undefined;
  const row = value as { eventId?: unknown; touch?: unknown; subject?: unknown; body?: unknown; at?: unknown };
  if (typeof row.eventId !== "string" || typeof row.subject !== "string" || typeof row.body !== "string" || typeof row.at !== "string") {
    return undefined;
  }
  if (row.touch !== 1 && row.touch !== 2 && row.touch !== 3) return undefined;
  return { eventId: row.eventId, touch: row.touch, subject: row.subject, body: row.body, at: row.at };
}

function readDraftSkipped(value: unknown): DraftSkipped | undefined {
  if (!value || typeof value !== "object") return undefined;
  const row = value as { reason?: unknown; touch?: unknown; at?: unknown };
  if (typeof row.reason !== "string" || !row.reason || typeof row.at !== "string") return undefined;
  if (row.touch !== 1 && row.touch !== 2 && row.touch !== 3) return undefined;
  return { reason: row.reason, touch: row.touch, at: row.at };
}

function readDraftRejected(value: unknown): DraftRejected | undefined {
  if (!value || typeof value !== "object") return undefined;
  const row = value as { at?: unknown; check?: unknown };
  if (typeof row.at !== "string" || !row.at || typeof row.check !== "string") return undefined;
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(row.check)) return undefined;
  return { at: row.at, check: row.check };
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
  // @upstash/redis hset is (key, fields). A third argument is ignored, so the card id has to be the field name.
  await redis.hset(HUNTER_OUTREACH_KEY, { [record.cardId]: JSON.stringify(record) });
}

/** Remember a rejected write-back. A letter Chris can fix stays on the card. A structural rejection only stamps the check. */
async function rememberDraftRejection(cardId: string, check: string, copy?: { subject?: string; body?: string }) {
  if (!logSafe(cardId) || !/^[A-Za-z0-9_-]{1,40}$/.test(check)) return;
  try {
    const redis = await getRedisClient();
    if (!redis) return;
    const loaded = await loadBook();
    if (loaded.storage !== "redis") return;
    if (!loaded.book.companies.some((company) => company.id === cardId)) return;
    const fixable = check === "tess-and-i" || check === "greeting-name" || check === "em-dash" || check === "price";
    await withOutreachLock(redis, cardId, async () => {
      const existing = await readOutreachRecord(redis, cardId);
      if (!existing) return;
      const at = new Date().toISOString();
      existing.draftRejected = { at, check };
      const subject = copy?.subject?.slice(0, 200) ?? "";
      const body = copy?.body?.slice(0, 4096) ?? "";
      if (fixable && (subject || body)) {
        const touch = nextTouchNumber(existing) ?? 1;
        const key = touchKey(touch);
        const drafts = { ...(existing.drafts ?? {}) };
        const prior = drafts[key] ?? {};
        drafts[key] = { ...prior, subject: subject || prior.subject || "", body: body || prior.body || "", draftedAt: at };
        existing.drafts = drafts;
      }
      await writeOutreachRecord(redis, existing);
    });
  } catch {
    // The 400 still goes back. A missed stamp leaves the previous one.
  }
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

/** A short check name. The subject, body, and header values never become the name. */
function formatCheck(field: string, value: unknown) {
  const row = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
  if (field === "eventId") return "eventId-not-uuidv4";
  if (field === "touch") return "missing-touch";
  if (field === "experimentId") return "experimentId";
  if (field === "variantId") return "variantId";
  if (field === "subject" && typeof row?.subject === "string") {
    if (draftMentionsTessAndI(row.subject)) return "tess-and-i";
    if (greetingNameCheck(row.subject)) return "greeting-name";
    if (/[\r\n]/.test(row.subject)) return "subject-multiline";
    if (row.subject.length > 200) return "subject-too-long";
  }
  if (field === "body" && typeof row?.body === "string") {
    if (draftMentionsTessAndI(row.body) || (typeof row.subject === "string" && draftMentionsTessAndI(row.subject))) return "tess-and-i";
    if (greetingNameCheck(row.body) || (typeof row.subject === "string" && greetingNameCheck(row.subject))) return "greeting-name";
    if (Buffer.byteLength(row.body, "utf8") > 4096) return "body-too-long";
    if (row.body.includes("\u2014")) return "em-dash";
    if (draftHasPrice(row.body)) return "price";
  }
  return /^[A-Za-z0-9_-]{1,40}$/.test(field) ? field : "unknown-field";
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

function httpsSourceUrl(value: string) {
  if (!value || value.length > MAX_SOURCE_URL || /\s/.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && url.hostname.length > 0;
  } catch {
    return false;
  }
}

/** https pages only, ten at most. A bad entry fails the whole list. */
function parseDraftSources(value: unknown): { ok: true; sources: DraftSource[] } | { ok: false } {
  if (!Array.isArray(value) || value.length > MAX_DRAFT_SOURCES) return { ok: false };
  const sources: DraftSource[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return { ok: false };
    const row = item as Record<string, unknown>;
    for (const key of Object.keys(row)) {
      if (key !== "url" && key !== "note") return { ok: false };
    }
    if (typeof row.url !== "string") return { ok: false };
    const url = row.url.trim();
    if (!httpsSourceUrl(url)) return { ok: false };
    const source: DraftSource = { url };
    if ("note" in row) {
      if (typeof row.note !== "string" || /[\r\n]/.test(row.note)) return { ok: false };
      const note = row.note.trim();
      if (note.length > MAX_SOURCE_NOTE) return { ok: false };
      if (note) source.note = note;
    }
    sources.push(source);
  }
  return { ok: true, sources };
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
  if (
    type === "drafting" ||
    type === "drafted" ||
    type === "send_approved" ||
    type === "draft_skipped" ||
    type === "send_withdrawn"
  ) {
    if (typeof row.touch !== "number" || !Number.isInteger(row.touch) || row.touch < 1 || row.touch > 3) {
      return { ok: false, field: "touch" };
    }
    event.touch = row.touch;
  }
  if (type === "drafted" || type === "send_approved") {
    if (typeof row.subject !== "string") return { ok: false, field: "subject" };
    const subject = oneLine(row.subject, 200);
    if (subject == null || subject.length === 0) return { ok: false, field: "subject" };
    event.subject = subject;
    if (typeof row.body !== "string") return { ok: false, field: "body" };
    if (Buffer.byteLength(row.body, "utf8") > 4096) return { ok: false, field: "body" };
    event.body = row.body;
  }
  if (type === "drafted") {
    if (draftMentionsTessAndI(event.subject ?? "") || greetingNameCheck(event.subject ?? "")) return { ok: false, field: "subject" };
    if (
      draftMentionsTessAndI(event.body ?? "") ||
      greetingNameCheck(event.body ?? "") ||
      event.body?.includes("\u2014") ||
      draftHasPrice(event.body ?? "")
    ) {
      return { ok: false, field: "body" };
    }
    if (typeof row.experimentId !== "string" || !slug(row.experimentId, 64)) return { ok: false, field: "experimentId" };
    event.experimentId = row.experimentId;
    if (typeof row.variantId !== "string" || !slug(row.variantId, 64)) return { ok: false, field: "variantId" };
    event.variantId = row.variantId;
    if ("sources" in row) {
      const sources = parseDraftSources(row.sources);
      if (!sources.ok) return { ok: false, field: "sources" };
      event.sources = sources.sources;
    }
  }
  if (type === "draft_skipped") {
    if (typeof row.reason !== "string") return { ok: false, field: "reason" };
    const reason = oneLine(row.reason.trim(), 200);
    if (!reason) return { ok: false, field: "reason" };
    event.reason = reason;
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
  if (event.reason) stored.reason = event.reason;
  return stored;
}

function sameInstant(left: string, right: string) {
  const a = new Date(left).getTime();
  const b = new Date(right).getTime();
  return Number.isFinite(a) && a === b;
}

type ApplyResult =
  | { ok: true; duplicate: boolean; record: OutreachRecord; lift: boolean }
  | { ok: false; status: number; error: string; reasons?: string[] };

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
  if (event.subject == null || event.body == null) return event.edited === true;
  if (record.sendApproved && record.sendApproved.touch === touch) {
    return event.subject !== record.sendApproved.subject || event.body !== record.sendApproved.body;
  }
  const key = String(touch) as "1" | "2" | "3";
  const draft = record.drafts?.[key];
  if (draft && (draft.subject || draft.body || draft.editedSubject != null || draft.editedBody != null)) {
    const subject = draft.editedSubject ?? draft.subject ?? "";
    const body = draft.editedBody ?? draft.body ?? "";
    return event.subject !== subject || event.body !== body;
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

function touchKey(touch: number): "1" | "2" | "3" {
  if (touch === 2) return "2";
  if (touch === 3) return "3";
  return "1";
}

function claimLive(claim: DraftClaim | undefined, now: number) {
  if (!claim?.at || !claim.eventId) return false;
  const at = Date.parse(claim.at);
  if (!Number.isFinite(at)) return false;
  return now - at < CLAIM_MS;
}

function sequenceOpen(record: OutreachRecord) {
  return !record.repliedAt && !record.optedOutAt && !record.bouncedAt && !record.bookedAt;
}

async function applyEvent(
  redis: LeadsRedis,
  company: Company,
  existing: OutreachRecord | null,
  event: ParsedEvent,
  dnc: DncEntry[],
  now = Date.now(),
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
  if (event.type === "sent" || event.type === "followup_sent") {
    if (event.body?.includes(OUTREACH_SENDER_IDENTIFICATION_PLACEHOLDER)) {
      return { ok: false, status: 409, error: "sender-identification" };
    }
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
  if (event.type === "drafting" || event.type === "drafted" || event.type === "send_approved" || event.type === "draft_skipped" || event.type === "send_withdrawn") {
    return applyCocoEvent(redis, company, record, event, dnc, today, now);
  }
  record.bookedAt = event.at;
  record.events.push(toStoredEvent(event));
  await writeOutreachRecord(redis, record);
  return { ok: true, duplicate: false, record, lift: true };
}

async function applyCocoEvent(
  redis: LeadsRedis,
  company: Company,
  record: OutreachRecord,
  event: ParsedEvent,
  dnc: DncEntry[],
  today: string,
  now: number,
): Promise<ApplyResult> {
  const touch = event.touch ?? 0;
  const key = touchKey(touch);
  const reject = (error: string, status = 409, reasons?: string[]): ApplyResult => {
    console.info(JSON.stringify({ coco: "rejected", cardId: company.id, error, status }));
    return reasons ? { ok: false, status, error, reasons } : { ok: false, status, error };
  };
  if (event.type === "drafting") {
    const reasons = cocoBlockReasons(company, record, dnc, today).filter((rule) => touch === 1 || rule !== "already-sent");
    if (reasons.length > 0) return reject("blocked", 409, reasons);
    if (touch === 1) {
      if (!record.queue?.queuedAt) return reject("queue");
    } else if (record.touches !== touch - 1 || !sequenceOpen(record)) {
      return reject(record.touches !== touch - 1 ? "touch" : "stopped");
    }
    const drafts = { ...(record.drafts ?? {}) };
    const prior = drafts[key] ?? {};
    if (prior.claim && prior.claim.eventId !== event.eventId && claimLive(prior.claim, now)) {
      return reject("claimed");
    }
    drafts[key] = { ...prior, claim: { eventId: event.eventId, at: event.at } };
    record.drafts = drafts;
    record.events.push(toStoredEvent(event));
    await writeOutreachRecord(redis, record);
    return { ok: true, duplicate: false, record, lift: false };
  }
  if (event.type === "drafted") {
    if (touch === 1 && !record.queue?.queuedAt) return reject("queue");
    if (touch > 1 && (record.touches !== touch - 1 || !sequenceOpen(record))) {
      return reject(record.touches === touch - 1 ? "stopped" : "touch");
    }
    const drafts = { ...(record.drafts ?? {}) };
    const prior = drafts[key] ?? {};
    if (prior.claim && claimLive(prior.claim, now) && prior.claim.eventId !== event.eventId && !record.events.some((item) => item.eventId === prior.claim?.eventId && item.type === "drafting")) {
      return reject("claimed");
    }
    const link = unsubscribeUrl(company.id);
    if (!link) return reject("no-unsubscribe");
    const ensured = ensureUnsubscribeLink(event.body ?? "", link);
    if (ensured.appended) {
      console.info(JSON.stringify({ coco: "draft-missing-unsubscribe", cardId: company.id, appended: true }));
    }
    drafts[key] = {
      subject: event.subject,
      body: ensured.body,
      variantId: event.variantId,
      experimentId: event.experimentId,
      draftedAt: event.at,
      problems: draftProblems(ensured.body),
      sent: prior.sent,
      unsubscribeAppended: ensured.appended ? true : undefined,
      ...(event.sources ? { sources: event.sources } : {}),
    };
    record.drafts = drafts;
    if (record.draftSkipped?.touch === touch) record.draftSkipped = undefined;
    delete record.draftRejected;
    record.events.push(toStoredEvent(event));
    await writeOutreachRecord(redis, record);
    return { ok: true, duplicate: false, record, lift: false };
  }
  if (event.type === "send_approved") {
    const link = unsubscribeUrl(company.id);
    if (!link || !event.body?.includes(link)) return reject("unsubscribe");
    const completed = withOutreachFooter(event.body, link);
    if (!completed) return reject("sender-identification");
    if (record.touches >= touch) return reject("touch");
    if (record.sendApproved && record.sendApproved.touch === touch && record.touches < touch) {
      return reject("send-approved");
    }
    record.sendApproved = {
      eventId: event.eventId,
      touch,
      subject: event.subject ?? "",
      body: completed,
      at: event.at,
    };
    record.events.push(toStoredEvent(event));
    await writeOutreachRecord(redis, record);
    return { ok: true, duplicate: false, record, lift: false };
  }
  if (event.type === "draft_skipped") {
    record.draftSkipped = { reason: event.reason ?? "", touch, at: event.at };
    record.events.push(toStoredEvent(event));
    await writeOutreachRecord(redis, record);
    return { ok: true, duplicate: false, record, lift: false };
  }
  if (!record.sendApproved || record.sendApproved.touch !== touch) return reject("none");
  if (record.touches >= touch) return reject("touch");
  record.sendApproved = undefined;
  record.events.push(toStoredEvent(event));
  await writeOutreachRecord(redis, record);
  return { ok: true, duplicate: false, record, lift: false };
}

export async function handleOutreach(request: Request) {
  const started = Date.now();
  let eventId = "";
  let cardId = "";
  let type = "";
  const finish = (status: number, body: unknown, check = "") => {
    const ms = Date.now() - started;
    const line =
      status === 400 && check
        ? { eventId, cardId, type, status, check, ms }
        : { eventId, cardId, type, status, ms };
    console.info(JSON.stringify(line));
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
      return finish(400, { error: "invalid", field: "body" }, "body");
    }
    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
      const row = payload as Record<string, unknown>;
      eventId = logSafe(row.eventId);
      cardId = logSafe(row.cardId);
      type = logSafe(row.type);
    }
    const parsed = parseEvent(payload, Date.now());
    if (!parsed.ok) {
      const check = formatCheck(parsed.field, payload);
      if (cardId) await rememberDraftRejection(cardId, check, rejectionCopy(payload));
      return finish(400, { error: "invalid", field: parsed.field }, check);
    }
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
      const body: { error: string; reasons?: string[] } = { error: outcome.applied.error };
      if (outcome.applied.reasons && outcome.applied.reasons.length > 0) body.reasons = outcome.applied.reasons;
      return finish(outcome.applied.status, body);
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
    fitRating: company.fitRating ?? null,
    hook: company.hook ?? null,
    fieldSources: company.fieldSources ?? null,
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
    stage: cocoStage(company, record, Date.now(), dnc, today),
    sendApproved: record?.sendApproved
      ? {
          eventId: record.sendApproved.eventId,
          subject: record.sendApproved.subject,
          body: record.sendApproved.body,
          touch: record.sendApproved.touch,
        }
      : null,
    draftSkipped: record?.draftSkipped ?? null,
  };
}

type CocoCard = ReturnType<typeof cocoCard>;

export function cocoBlockReasons(company: Company, record: OutreachRecord | null, dnc: DncEntry[], today: string): SkipRule[] {
  return qualifyingFailures(company, record, dnc, today).filter((rule) => rule !== "review");
}

export type CocoStage =
  | "booked"
  | "won"
  | "closed"
  | "replied"
  | "opted-out"
  | "bounced"
  | "sent"
  | "wording-approved"
  | "draft-ready"
  | "draft-flagged"
  | "draft-skipped"
  | "drafting"
  | "queued"
  | "approved"
  | "blocked"
  | "new";

function nextTouchNumber(record: OutreachRecord | null) {
  const touches = record?.touches ?? 0;
  if (touches >= 3) return null;
  return touches + 1;
}

function draftAt(record: OutreachRecord | null, touch: number) {
  return record?.drafts?.[touchKey(touch)];
}

/** A rejection with no later accepted draft. An older rejection does not hide a draft that landed after it. */
function draftFlagged(record: OutreachRecord | null) {
  const rejected = record?.draftRejected;
  if (!rejected?.at || !rejected.check) return false;
  const touch = nextTouchNumber(record);
  if (touch == null) return false;
  const draft = draftAt(record, touch);
  const hasCopy = Boolean(draft?.subject || draft?.body || draft?.editedBody);
  if (!hasCopy || !draft?.draftedAt) return true;
  const drafted = Date.parse(draft.draftedAt);
  const at = Date.parse(rejected.at);
  if (!Number.isFinite(drafted) || !Number.isFinite(at)) return true;
  return at >= drafted;
}

export function cocoStage(company: Company, record: OutreachRecord | null, now = Date.now(), dnc: DncEntry[] = [], today = edmontonToday()): CocoStage {
  const pipeline = company.pipeline ?? "";
  if (pipeline === "lost") return "closed";
  if (pipeline === "won") return "won";
  if (pipeline === "booked" || record?.bookedAt) return "booked";
  if (record?.repliedAt) return "replied";
  if (record?.optedOutAt) return "opted-out";
  if (record?.bouncedAt) return "bounced";
  const touch = nextTouchNumber(record);
  if (record?.sendApproved && touch != null && record.sendApproved.touch === touch && (record.touches ?? 0) < record.sendApproved.touch) {
    return "wording-approved";
  }
  if (draftFlagged(record)) return "draft-flagged";
  if (touch != null && (draftAt(record, touch)?.subject || draftAt(record, touch)?.body)) return "draft-ready";
  const claim = touch != null ? draftAt(record, touch)?.claim : undefined;
  if (claim && claimLive(claim, now)) return "drafting";
  if (touch != null && record?.draftSkipped?.touch === touch) return "draft-skipped";
  if ((record?.touches ?? 0) > 0) return "sent";
  if (record?.queue?.queuedAt) return "queued";
  if (company.review === "approved") return "approved";
  if (cocoBlockReasons(company, record, dnc, today).length > 0) return "blocked";
  return "new";
}

export function stageLabel(stage: CocoStage, record: OutreachRecord | null) {
  if (stage === "sent") return `Sent, ${record?.touches ?? 0} of 3`;
  if (stage === "queued") return "Queued";
  if (stage === "drafting") return "Drafting";
  if (stage === "draft-ready") return "Draft ready";
  if (stage === "draft-flagged") return "Draft flagged";
  if (stage === "wording-approved") return "Wording approved";
  if (stage === "approved") return "Approved";
  if (stage === "booked") return "Booked";
  if (stage === "won") return "Won";
  if (stage === "closed") return "Lost";
  if (stage === "replied") return "Replied";
  if (stage === "opted-out") return "Opted out";
  if (stage === "bounced") return "Bounced";
  if (stage === "blocked") return "Blocked";
  if (stage === "draft-skipped") return "Draft skipped";
  return "Unreviewed";
}

export function draftEditWarnings(subject: string, body: string) {
  const warnings: string[] = [];
  if (draftMentionsTessAndI(subject) || draftMentionsTessAndI(body)) warnings.push('This copy says "Tess and I".');
  if (subject.includes("\u2014") || body.includes("\u2014")) warnings.push("This copy has an em dash.");
  if (draftHasPrice(subject) || draftHasPrice(body)) warnings.push("This copy has a price.");
  return warnings;
}

/** Hard reject for a draft write. The check code is what the card stores. */
export function draftRejectionCheck(subject: string, body: string): string | null {
  if (draftMentionsTessAndI(subject) || draftMentionsTessAndI(body)) return "tess-and-i";
  if (greetingNameCheck(subject) || greetingNameCheck(body)) return "greeting-name";
  if (subject.includes("\u2014") || body.includes("\u2014")) return "em-dash";
  if (draftHasPrice(subject) || draftHasPrice(body)) return "price";
  return null;
}

/** Plain reason for a failed, errored, or rejected draft. The raw check code is not the sentence. */
export function draftRejectionReason(check: string) {
  const known: Record<string, string> = {
    "tess-and-i": 'The draft says "Tess and I".',
    "greeting-name": "The greeting name is initials, one or two letters, or all capitals.",
    "em-dash": "The draft has an em dash.",
    price: "The draft has a price.",
    "body-too-long": "The draft is too long.",
    "subject-too-long": "The subject is too long.",
    "subject-multiline": "The subject runs over more than one line.",
    "no-unsubscribe": "The unsubscribe link is not available.",
    "draft-error": "The draft failed before it could be saved.",
    rejected: "The draft was rejected.",
  };
  if (known[check]) return known[check];
  if (/^[A-Za-z0-9_-]{1,40}$/.test(check)) return `The draft was rejected (${check}).`;
  return "The draft was rejected.";
}

const BLOCK_COPY: Record<string, string> = {
  "contact-ready": "This card is not contact-ready.",
  "already-sent": "The first email has already gone out.",
  pipeline: "This card is already in a pipeline.",
  "do-not-contact": "This contact is on the do-not-contact list.",
  "no-unsolicited": "The card is flagged no unsolicited email.",
  stale: "The contact is flagged stale.",
  "apollo-unverified": "The Apollo email is not verified.",
  "email-mx": "The email domain has no mail server.",
  "email-blank": "There is no email address.",
  "bounced-email": "Mail to this address bounced.",
  "no-unsubscribe-link": "The unsubscribe link is not available.",
};

/** Block copy that means the card cannot be emailed. Do-not-contact and a bounce are only known after the outreach join. */
export const SEND_IMPOSSIBLE_COPY = [
  "do-not-contact",
  "no-unsolicited",
  "stale",
  "apollo-unverified",
  "email-mx",
  "email-blank",
  "bounced-email",
].map((rule) => BLOCK_COPY[rule] ?? rule);

const CARD_SEND_BLOCKS = ["No unsolicited email", "Stale", "Apollo email not verified"];

/** Named person, verified or published email, source URL, not stopped, and no send block. Score band is not a gate. */
export function emailableLead(company: Company, blocked: readonly string[] = []) {
  if (company.status === "stopped") return false;
  if (!hasAccess(company)) return false;
  if (company.emailMx === false) return false;
  if (company.cardFlags?.some((flag) => CARD_SEND_BLOCKS.includes(flag))) return false;
  return !blocked.some((line) => SEND_IMPOSSIBLE_COPY.includes(line));
}

export type CocoJoin = {
  stage: CocoStage;
  stageLabel: string;
  status: string;
  touch: number | null;
  subject: string;
  body: string;
  problems: string[];
  blocked: string[];
  skipNote: string;
  draftRejected: { at: string; check: string } | null;
  /** Plain sentence when the draft failed, errored, or was rejected. Empty when the draft can be shown. */
  draftFlag: string;
  unsubscribeAppended: boolean;
  sources: DraftSource[];
  canApproveDraft: boolean;
  canApproveWording: boolean;
  canWithdraw: boolean;
  wordingNote: string;
  unsubscribeUrl: string | null;
  /** Section 4. False while the letter fails the humanizer. There is no override. */
  humanizerPass: boolean;
  humanizerNotes: string[];
  /** Set when the letter has to greet with Hello, because the sourced name is unusable. */
  greetingNote: string;
};

function shownDraftSources(draft: OutreachDraft | undefined): DraftSource[] {
  if (!draft?.sources) return [];
  const parsed = parseDraftSources(draft.sources);
  return parsed.ok ? parsed.sources : [];
}

function statusFor(stage: CocoStage, record: OutreachRecord | null) {
  if (stage === "queued") return "Approved, waiting for Coco.";
  if (stage === "drafting") return "Coco is writing the draft.";
  if (stage === "draft-ready") return "Read the draft, then approve the wording.";
  if (stage === "draft-flagged") return "";
  if (stage === "wording-approved") return "Waiting for your Send in Coco's chat.";
  if (stage === "sent") return `Sent, ${record?.touches ?? 0} of 3.`;
  if (stage === "draft-skipped") return "";
  return "";
}

export function cocoJoin(company: Company, record: OutreachRecord | null, dnc: DncEntry[], today: string, now = Date.now()): CocoJoin {
  const stage = cocoStage(company, record, now, dnc, today);
  const touch = nextTouchNumber(record);
  const draft = touch != null ? draftAt(record, touch) : undefined;
  const subject = draft?.editedSubject ?? draft?.subject ?? "";
  const storedBody = draft?.editedBody ?? draft?.body ?? "";
  const link = unsubscribeUrl(company.id);
  const shown = link && storedBody.trim() && !storedBody.includes(link) ? ensureUnsubscribeLink(storedBody, link) : { body: storedBody, appended: false };
  const blocked = cocoBlockReasons(company, record, dnc, today).map((rule) => BLOCK_COPY[rule] ?? rule);
  const flagged = stage === "draft-flagged";
  const draftFlag = flagged ? draftRejectionReason(record?.draftRejected?.check ?? "rejected") : "";
  const body = shown.body;
  const shownSubject = subject;
  const hasDraft = Boolean(draft?.subject || draft?.body || draft?.editedBody);
  const voice = humanizerCheck(shownSubject, body);
  const greetingNote = body.startsWith("Hello,") ? "No usable first name. The greeting is Hello." : "";
  const wordingNote = !hasDraft
    ? ""
    : !link
      ? "The unsubscribe link is not available."
      : !body.includes(link)
        ? "Approve wording needs the unsubscribe link in the email."
        : "";
  return {
    stage,
    stageLabel: stageLabel(stage, record),
    status: flagged ? draftFlag : statusFor(stage, record),
    touch,
    subject: shownSubject,
    body,
    problems: draft?.problems ?? [],
    blocked,
    skipNote: record?.draftSkipped?.reason ?? "",
    draftRejected: record?.draftRejected ?? null,
    draftFlag,
    unsubscribeAppended: draft?.unsubscribeAppended === true || shown.appended,
    sources: shownDraftSources(draft),
    canApproveDraft:
      emailableLead(company, blocked) &&
      blocked.length === 0 &&
      company.review !== "skipped" &&
      (stage === "new" || stage === "approved" || (stage === "draft-ready" && company.review !== "approved")),
    canApproveWording:
      stage === "draft-ready" &&
      company.review === "approved" &&
      wordingNote === "" &&
      hasDraft &&
      link !== null &&
      body.includes(link) &&
      voice.pass &&
      !greetingNameCheck(body),
    canWithdraw: stage === "wording-approved",
    wordingNote,
    unsubscribeUrl: link,
    humanizerPass: voice.pass,
    humanizerNotes: voice.notes,
    greetingNote,
  };
}

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
    if (view === "queued") {
      const now = Date.now();
      const skipped = Object.fromEntries(SKIP_RULES.filter((rule) => rule !== "review").map((rule) => [rule, 0])) as Record<string, number>;
      const waiting: { card: CocoCard; sort: string }[] = [];
      for (const company of loaded.book.companies) {
        const record = records.get(company.id) ?? null;
        const waitingDraft = Boolean(record?.queue?.queuedAt) && !record?.firstSentAt;
        const waitingSend = Boolean(record?.sendApproved) && (record?.touches ?? 0) < (record?.sendApproved?.touch ?? 0);
        if (!waitingDraft && !waitingSend) continue;
        const reasons = cocoBlockReasons(company, record, dnc, today);
        if (reasons.length > 0) {
          for (const rule of reasons) skipped[rule] = (skipped[rule] ?? 0) + 1;
          continue;
        }
        const stage = cocoStage(company, record, now, dnc, today);
        if (waitingDraft && !waitingSend && (stage === "drafting" || stage === "draft-skipped")) continue;
        const sort = record?.queue?.queuedAt || record?.sendApproved?.at || "";
        waiting.push({ card: cocoCard(company, record, dnc, today), sort });
      }
      waiting.sort((a, b) => a.sort.localeCompare(b.sort) || a.card.id.localeCompare(b.card.id));
      const page = pageByKey(waiting.map((item) => item.card), limit, cursor, (card) => card.id);
      return json({ view, total: page.total, nextCursor: page.nextCursor, skipped, cards: page.slice }, 200);
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

export type WakeFetch = (input: string, init: { method: string; headers: Record<string, string>; body: string; signal: AbortSignal }) => Promise<{ status: number }>;

function webhookReady() {
  const url = (process.env.COCO_DRAFT_WEBHOOK_URL ?? "").trim();
  const key = (process.env.COCO_DRAFT_WEBHOOK_KEY ?? "").trim();
  const header = (process.env.COCO_DRAFT_WEBHOOK_HEADER ?? "").trim();
  if (!url || !key || !header || !/^[A-Za-z0-9-]+$/.test(header)) return null;
  return { url, key, header };
}

/** Wakes Coco with the card id only. The header name comes from COCO_DRAFT_WEBHOOK_HEADER. A missing setting makes no call. */
export async function wakeCocoDraft(cardId: string, fetchImpl?: WakeFetch) {
  const ready = webhookReady();
  if (!ready) return { called: false, status: 0 };
  const call = fetchImpl ?? fetch;
  try {
    const response = await call(ready.url, {
      method: "POST",
      headers: { "content-type": "application/json", [ready.header]: ready.key },
      body: JSON.stringify({ cardId }),
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
    });
    console.info(JSON.stringify({ webhook: "coco-draft", cardId, status: response.status }));
    return { called: true, status: response.status };
  } catch {
    console.info(JSON.stringify({ webhook: "coco-draft", cardId, status: 0 }));
    return { called: true, status: 0 };
  }
}

export const COCO_PREDRAFT_BY = "coco-predraft";

/**
 * Files one background draft. Does not approve the lead and does not send.
 * A letter that fails the draft check is stored and flagged. The words stay so they can be edited.
 * A card that already has a draft or a flag is left alone.
 */
export async function storeBackgroundDraft(input: {
  company: Company;
  subject: string;
  body: string;
}): Promise<"ready" | "flagged" | "skipped" | "unavailable"> {
  const redis = await getRedisClient();
  if (!redis) return "unavailable";
  const link = unsubscribeUrl(input.company.id);
  const check = draftRejectionCheck(input.subject, input.body);
  const now = new Date().toISOString();
  const stored = await withOutreachLock(redis, input.company.id, async () => {
    const fresh = (await readOutreachRecord(redis, input.company.id)) ?? { cardId: input.company.id, touches: 0, events: [] };
    if (fresh.firstSentAt || fresh.sendApproved || fresh.draftSkipped || (fresh.touches ?? 0) > 0) return "skipped" as const;
    if (fresh.draftRejected?.check) return "flagged" as const;
    const prior = fresh.drafts?.["1"];
    if (prior?.subject || prior?.body || prior?.editedBody) return "skipped" as const;
    const ensured = link && !check ? ensureUnsubscribeLink(input.body, link) : null;
    const after = ensured ? draftRejectionCheck(input.subject, ensured.body) : check ?? "no-unsubscribe";
    if (!ensured || after) {
      fresh.draftRejected = { at: now, check: after || "draft-error" };
      fresh.queue = fresh.queue ?? { queuedAt: now, queuedBy: COCO_PREDRAFT_BY };
      const drafts = { ...(fresh.drafts ?? {}) };
      drafts["1"] = { subject: input.subject, body: input.body, draftedAt: now };
      fresh.drafts = drafts;
      await writeOutreachRecord(redis, fresh);
      return "flagged" as const;
    }
    fresh.queue = fresh.queue ?? { queuedAt: now, queuedBy: COCO_PREDRAFT_BY };
    const drafts = { ...(fresh.drafts ?? {}) };
    const voice = humanizerCheck(input.subject, ensured.body);
    drafts["1"] = {
      subject: input.subject,
      body: ensured.body,
      draftedAt: now,
      problems: draftProblems(ensured.body),
      unsubscribeAppended: ensured.appended ? true : undefined,
      humanizerPass: voice.pass,
      humanizerNotes: voice.notes,
    };
    fresh.drafts = drafts;
    delete fresh.draftRejected;
    await writeOutreachRecord(redis, fresh);
    return "ready" as const;
  });
  return stored ?? "unavailable";
}

export type DeskCocoResult =
  | { ok: true; stage: CocoStage; warnings?: string[] }
  | { ok: false; error: string; reasons?: string[] };

export async function approveAndQueueForCoco(input: {
  cardId: string;
  queuedBy: string;
  /** Clears a flagged letter and asks Coco for another. Approve does not set this. */
  rewrite?: boolean;
  fetchImpl?: WakeFetch;
}): Promise<DeskCocoResult> {
  const redis = await getRedisClient();
  if (!redis) return { ok: false, error: "unavailable" };
  const loaded = await loadBook();
  if (loaded.storage !== "redis") return { ok: false, error: "unavailable" };
  const company = loaded.book.companies.find((item) => item.id === input.cardId);
  if (!company) return { ok: false, error: "unknown-card" };
  const dnc = await loadDoNotContact(redis);
  const today = edmontonToday();
  const existing = await readOutreachRecord(redis, company.id);
  const reasons = cocoBlockReasons(company, existing, dnc, today);
  if (reasons.length > 0) return { ok: false, error: "blocked", reasons };
  if (!emailableLead(company)) {
    return {
      ok: false,
      error: "blocked",
      reasons: [company.status === "stopped" ? "This card is stopped." : "This card cannot be emailed."],
    };
  }
  const reviewedOn = today;
  const nextBook = {
    ...loaded.book,
    companies: loaded.book.companies.map((item) =>
      item.id === company.id ? { ...item, review: "approved" as const, reviewedOn } : item,
    ),
  };
  await saveBook(nextBook);
  const approved = nextBook.companies.find((item) => item.id === company.id) ?? { ...company, review: "approved" as const, reviewedOn };
  const readyTouch = nextTouchNumber(existing);
  const readyDraft = readyTouch != null ? existing?.drafts?.[touchKey(readyTouch)] : undefined;
  const rewriting = input.rewrite === true && draftFlagged(existing);
  if (!rewriting && readyDraft && (readyDraft.subject || readyDraft.body || readyDraft.editedBody)) {
    return { ok: true, stage: cocoStage(approved, existing, Date.now(), dnc, today) };
  }
  let alreadyQueued = Boolean(existing?.queue?.queuedAt);
  let stored: OutreachRecord | null = null;
  try {
    stored = await withOutreachLock(redis, company.id, async () => {
      const fresh = (await readOutreachRecord(redis, company.id)) ?? { cardId: company.id, touches: 0, events: [] };
      if (draftFlagged(fresh)) {
        delete fresh.draftRejected;
        if (input.rewrite && fresh.drafts) {
          const touch = nextTouchNumber(fresh) ?? 1;
          const key = touchKey(touch);
          const prior = fresh.drafts[key];
          if (prior) {
            const kept = { ...prior };
            delete kept.subject;
            delete kept.body;
            delete kept.editedSubject;
            delete kept.editedBody;
            delete kept.draftedAt;
            fresh.drafts = { ...fresh.drafts, [key]: kept };
          }
        }
        fresh.queue = { queuedAt: new Date().toISOString(), queuedBy: input.queuedBy };
        await writeOutreachRecord(redis, fresh);
        alreadyQueued = false;
        return fresh;
      }
      if (fresh.queue?.queuedAt) {
        alreadyQueued = true;
        return fresh;
      }
      fresh.queue = { queuedAt: new Date().toISOString(), queuedBy: input.queuedBy };
      await writeOutreachRecord(redis, fresh);
      return fresh;
    });
  } catch {
    return { ok: false, error: "queue" };
  }
  if (!stored) return { ok: false, error: "queue" };
  if (!alreadyQueued) {
    try {
      await wakeCocoDraft(company.id, input.fetchImpl);
    } catch {
      // The queue is saved. Coco's sweep still finds the card.
    }
  }
  return { ok: true, stage: cocoStage(approved, stored, Date.now(), dnc, today) };
}

export async function saveCocoDraftEdit(input: {
  cardId: string;
  touch: number;
  subject: string;
  body: string;
}): Promise<DeskCocoResult> {
  if (input.touch !== 1 && input.touch !== 2 && input.touch !== 3) return { ok: false, error: "touch" };
  if (draftMentionsTessAndI(input.subject) || draftMentionsTessAndI(input.body)) return { ok: false, error: "tess-and-i" };
  if (greetingNameCheck(input.subject) || greetingNameCheck(input.body)) return { ok: false, error: "greeting-name" };
  const redis = await getRedisClient();
  if (!redis) return { ok: false, error: "unavailable" };
  const warnings = draftEditWarnings(input.subject, input.body);
  const link = unsubscribeUrl(input.cardId);
  if (!link) {
    console.info(JSON.stringify({ coco: "rejected", cardId: input.cardId, error: "no-unsubscribe", status: 409 }));
    return { ok: false, error: "no-unsubscribe" };
  }
  const ensured = ensureUnsubscribeLink(input.body, link);
  if (ensured.appended) {
    console.info(JSON.stringify({ coco: "draft-missing-unsubscribe", cardId: input.cardId, appended: true }));
  }
  let failed: DeskCocoResult | null = null;
  const stored = await withOutreachLock(redis, input.cardId, async () => {
    const record = await readOutreachRecord(redis, input.cardId);
    if (!record) {
      failed = { ok: false, error: "draft" };
      return record;
    }
    const key = touchKey(input.touch);
    const draft = record.drafts?.[key];
    if (!draft || (!draft.subject && !draft.body)) {
      failed = { ok: false, error: "draft" };
      return record;
    }
    const drafts = { ...(record.drafts ?? {}) };
    const voice = humanizerCheck(input.subject, ensured.body);
    drafts[key] = {
      ...draft,
      editedSubject: input.subject,
      editedBody: ensured.body,
      unsubscribeAppended: ensured.appended ? true : draft.unsubscribeAppended,
      humanizerPass: voice.pass,
      humanizerNotes: voice.notes,
    };
    record.drafts = drafts;
    await writeOutreachRecord(redis, record);
    return record;
  });
  if (failed) return failed;
  if (!stored) return { ok: false, error: "unavailable" };
  return { ok: true, stage: "draft-ready", warnings };
}

export async function approveWording(input: {
  cardId: string;
  subject: string;
  body: string;
  fetchImpl?: WakeFetch;
}): Promise<DeskCocoResult> {
  const redis = await getRedisClient();
  if (!redis) return { ok: false, error: "unavailable" };
  const loaded = await loadBook();
  if (loaded.storage !== "redis") return { ok: false, error: "unavailable" };
  const company = loaded.book.companies.find((item) => item.id === input.cardId);
  if (!company) return { ok: false, error: "unknown-card" };
  const link = unsubscribeUrl(company.id);
  if (!link || !input.body.includes(link)) return { ok: false, error: "unsubscribe" };
  const completed = withOutreachFooter(input.body, link);
  if (!completed) return { ok: false, error: "sender-identification" };
  const rejected = draftRejectionCheck(input.subject, input.body);
  if (rejected) return { ok: false, error: rejected };
  if (greetingNameCheck(input.body)) return { ok: false, error: "greeting-name" };
  const voice = humanizerCheck(input.subject, input.body);
  if (!voice.pass) return { ok: false, error: "humanizer", reasons: voice.notes };
  const dnc = await loadDoNotContact(redis);
  let outcome: ApplyResult | null = null;
  try {
    outcome = await withOutreachLock(redis, company.id, async () => {
      const record = (await readOutreachRecord(redis, company.id)) ?? { cardId: company.id, touches: 0, events: [] };
      const touch = nextTouchNumber(record);
      if (!touch) return { ok: false, status: 409, error: "touch" } satisfies ApplyResult;
      const key = touchKey(touch);
      const draft = record.drafts?.[key];
      if (!draft || (!draft.subject && !draft.body)) return { ok: false, status: 409, error: "draft" } satisfies ApplyResult;
      const drafts = { ...(record.drafts ?? {}) };
      drafts[key] = { ...draft, editedSubject: input.subject, editedBody: input.body };
      record.drafts = drafts;
      const event: ParsedEvent = {
        eventId: randomUUID(),
        cardId: company.id,
        type: "send_approved",
        at: new Date().toISOString(),
        touch,
        subject: input.subject,
        body: completed,
      };
      return applyEvent(redis, company, record, event, dnc);
    });
  } catch {
    return { ok: false, error: "unavailable" };
  }
  if (!outcome) return { ok: false, error: "unavailable" };
  if (!outcome.ok) return { ok: false, error: outcome.error, reasons: outcome.reasons };
  try {
    await wakeCocoDraft(company.id, input.fetchImpl);
  } catch {
    // The approval is saved. The sweep still finds it.
  }
  return { ok: true, stage: cocoStage(company, outcome.record, Date.now(), dnc, edmontonToday()) };
}

export async function withdrawWording(input: { cardId: string }): Promise<DeskCocoResult> {
  const redis = await getRedisClient();
  if (!redis) return { ok: false, error: "unavailable" };
  const loaded = await loadBook();
  if (loaded.storage !== "redis") return { ok: false, error: "unavailable" };
  const company = loaded.book.companies.find((item) => item.id === input.cardId);
  if (!company) return { ok: false, error: "unknown-card" };
  const dnc = await loadDoNotContact(redis);
  const outcome = await withOutreachLock(redis, company.id, async () => {
    const record = (await readOutreachRecord(redis, company.id)) ?? { cardId: company.id, touches: 0, events: [] };
    const touch = record.sendApproved?.touch;
    if (!touch) return { ok: false, status: 409, error: "none" } satisfies ApplyResult;
    const event: ParsedEvent = {
      eventId: randomUUID(),
      cardId: company.id,
      type: "send_withdrawn",
      at: new Date().toISOString(),
      touch,
    };
    return applyEvent(redis, company, record, event, dnc);
  });
  if (!outcome) return { ok: false, error: "unavailable" };
  if (!outcome.ok) return { ok: false, error: outcome.error };
  return { ok: true, stage: cocoStage(company, outcome.record, Date.now(), dnc, edmontonToday()) };
}

function applyUnsubscribeToRecord(record: OutreachRecord, link: string) {
  if (!record.drafts) return false;
  let appended = false;
  const drafts = { ...record.drafts };
  for (const key of ["1", "2", "3"] as const) {
    const draft = drafts[key];
    if (!draft) continue;
    const next = { ...draft };
    let changed = false;
    if (typeof next.body === "string" && next.body.trim() && !next.body.includes(link)) {
      next.body = ensureUnsubscribeLink(next.body, link).body;
      changed = true;
    }
    if (typeof next.editedBody === "string" && next.editedBody.trim() && !next.editedBody.includes(link)) {
      next.editedBody = ensureUnsubscribeLink(next.editedBody, link).body;
      changed = true;
    }
    if (!changed) continue;
    next.unsubscribeAppended = true;
    next.problems = draftProblems(next.editedBody ?? next.body ?? "");
    drafts[key] = next;
    appended = true;
  }
  if (!appended) return false;
  record.drafts = drafts;
  return true;
}

/** On read, add the unsubscribe block to a stored draft that lacks the URL. A second read does not write again. */
async function persistUnsubscribe(redis: LeadsRedis, cardId: string, record: OutreachRecord): Promise<OutreachRecord> {
  const link = unsubscribeUrl(cardId);
  if (!link || !applyUnsubscribeToRecord({ ...record, drafts: record.drafts ? { ...record.drafts } : undefined }, link)) return record;
  const stored = await withOutreachLock(redis, cardId, async () => {
    const fresh = (await readOutreachRecord(redis, cardId)) ?? record;
    if (!applyUnsubscribeToRecord(fresh, link)) return fresh;
    await writeOutreachRecord(redis, fresh);
    console.info(JSON.stringify({ coco: "draft-missing-unsubscribe", cardId, appended: true }));
    return fresh;
  });
  return stored ?? record;
}

export async function readCocoDesk(companies: Company[]) {
  const empty: Record<string, CocoJoin> = {};
  const redis = await getRedisClient();
  if (!redis) return empty;
  const records = await readOutreachMap(redis);
  const dnc = await loadDoNotContact(redis);
  const today = edmontonToday();
  const now = Date.now();
  for (const company of companies) {
    const current = records.get(company.id) ?? null;
    const record = current ? await persistUnsubscribe(redis, company.id, current) : null;
    empty[company.id] = cocoJoin(company, record, dnc, today, now);
  }
  return empty;
}

export async function readCocoCard(cardId: string): Promise<CocoJoin | null> {
  const loaded = await loadBook();
  if (loaded.storage !== "redis") return null;
  const company = loaded.book.companies.find((item) => item.id === cardId);
  if (!company) return null;
  const redis = await getRedisClient();
  if (!redis) return null;
  const existing = await readOutreachRecord(redis, cardId);
  const record = existing ? await persistUnsubscribe(redis, cardId, existing) : null;
  const dnc = await loadDoNotContact(redis);
  return cocoJoin(company, record, dnc, edmontonToday(), Date.now());
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
    <p>Unearth Self<br>${OUTREACH_POSTAL_ADDRESS}</p>
    <p><a href="${OUTREACH_SITE_URL}" rel="noreferrer">${OUTREACH_SITE}</a></p>
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
