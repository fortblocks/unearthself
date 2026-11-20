/**
 * Phase-one rules that sit beside the search itself.
 * Search behaviour is unchanged. These functions decide what a response means,
 * what may be filed, and what Rex sees.
 */

import { daysBetween, normalizeDomain, type CardHook } from "./lead-score.ts";
import { readXaiUsage, XAI_USD_TICKS } from "./xai-search.ts";
import {
  HUNTER_ALARM_TIMEOUT_MS,
  HUNTER_APOLLO_KEY_PREFIX,
  HUNTER_CALLS_KEY_PREFIX,
  HUNTER_DNC_KEY,
  HUNTER_ESTIMATED_CALL_DOLLARS,
  HUNTER_HEARTBEAT_GAP_MS,
  HUNTER_HEARTBEAT_OFF_HOURS_MS,
  HUNTER_METHOD_ID,
  HUNTER_MODEL_ID,
  HUNTER_PROMPT_VERSION,
  HUNTER_RESET_KEYS,
  HUNTER_RUN_DEADLINE_MS,
  HUNTER_RUN_WALL_MS,
  HUNTER_SAMPLE_FLOOR,
  HUNTER_SCORE_VERSION,
  HUNTER_SPEND_ESTIMATE_PREFIX,
  HUNTER_SPEND_KEY_PREFIX,
  HUNTER_SPEND_TICKS_PREFIX,
  HUNTER_ALARM_COPIES,
  HUNTER_ALARM_KEY,
  HUNTER_ALARM_PRIMARY,
  HUNTER_SPEND_UNKNOWN_PREFIX,
  hunterDncCooldownDays,
  hunterMonthlyDollarCap,
  hunterDailyFiledCap,
  hunterQualityFloor,
  hunterTrialShare,
} from "./hunter-config.ts";

export const DROP_REASONS = [
  "page-empty",
  "fetch-failed",
  "blocked",
  "timed-out",
  "name-missing",
  "domain-mismatch",
  "place-mismatch",
  "do-not-contact",
  "duplicate",
  "below-quality-floor",
  "no-mx",
  "unverified",
  "outOfRegion",
  "notBuyerJudged",
  "judgmentUnavailable",
] as const;

export type DropReason = (typeof DROP_REASONS)[number];

export type HunterFunnel = {
  searched: number;
  candidates: number;
  verified: number;
  contactFound: number;
  filed: number;
  drops: Partial<Record<DropReason, number>>;
};

export function emptyFunnel(): HunterFunnel {
  return { searched: 0, candidates: 0, verified: 0, contactFound: 0, filed: 0, drops: {} };
}

export function addDrop(funnel: HunterFunnel, reason: DropReason) {
  funnel.drops[reason] = (funnel.drops[reason] ?? 0) + 1;
}

export type DncReason = "unsubscribe" | "dont-contact" | "lost" | "skipped";

export type DncEntry = {
  domain: string;
  email: string;
  reason: DncReason;
  addedOn: string;
  until: string;
};

export type SkipReason = "wrong-size" | "wrong-sector" | "no-retreat-signal" | "bad-contact" | "duplicate" | "other";

export type ReviewState = "unreviewed" | "approved" | "skipped" | "expired-unreviewed";

export type PipelineMark = "" | "sent" | "replied" | "booked" | "won" | "lost";

export type CardLineage = {
  method: typeof HUNTER_METHOD_ID | "public-linkedin-post";
  query: string;
  promptVersion: string;
  model: string;
  scoreVersion: string;
  signals: string[];
  sourceUrl: string;
  experimentId: string;
  axis: "" | "subject" | "opener" | "angle";
  variants: { id: string; text: string; status: "live" | "winner" | "retired" }[];
  assignments: { cardId: string; variantId: string; approvedAt: string; sentAt: string; fromAddress: string }[];
  sampleFloor: number;
  exploration?: boolean;
};

export type SourcedFact = {
  sourceUrl: string;
  fetchedOn: string;
  snippet: string;
};

export type CaslBasis = {
  publishedOn: string;
  roleFit: boolean;
  noUnsolicitedNotice: boolean;
  /** Set when the email came from Apollo. Never a page URL. */
  provider?: "Apollo";
  /** Edmonton date the Apollo row was pulled. */
  pulledOn?: string;
  statement?: string;
};

export const APOLLO_CASL_STATEMENT = "Under Apollo's terms its data comes from public sources.";

/** Titles Apollo searches for. Role fit uses this list. */
export const BUYER_ROLE_TITLES = [
  "marketing director",
  "sales director",
  "hr director",
  "people director",
  "people and culture lead",
  "head of people",
  "office manager",
  "operations manager",
  "executive assistant to the CEO",
  "chief people officer",
  "head of culture",
  "director of people and culture",
];

/** Close titles in the same lanes: people, HR, culture, learning, operations, and executive leaders. */
const EXTRA_ROLE_TITLES = [
  "human resources",
  "people and culture",
  "people lead",
  "head of talent",
  "vp people",
  "vice president of people",
  "learning and development",
  "l and d",
  "head of learning",
  "head of operations",
  "chief operating",
  "chief executive",
];

/** True when the title is one Hunter already treats as a buyer role. A blank title is not a fit. */
export function titleFitsBuyerRole(title: string) {
  const normalized = title
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (normalized.length < 2) return false;
  if ([...BUYER_ROLE_TITLES, ...EXTRA_ROLE_TITLES].some((term) => normalized.includes(term))) return true;
  return /\b(ceo|coo|cpo|chro)\b/.test(normalized);
}

/** Apollo is the basis. The pull date is the day the row was retrieved. No page URL is created. */
export function apolloCaslBasis(pulledOn: string, title = ""): CaslBasis {
  return {
    publishedOn: "Apollo",
    roleFit: titleFitsBuyerRole(title),
    noUnsolicitedNotice: true,
    provider: "Apollo",
    pulledOn,
    statement: APOLLO_CASL_STATEMENT,
  };
}

export function cardDedupeKey(domain: string, email: string) {
  return `${normalizeDomain(domain)}|${email.trim().toLowerCase()}`;
}

export function isDuplicateCard(existing: { domain: string; email?: string }[], domain: string, email: string) {
  const key = cardDedupeKey(domain, email);
  return existing.some((row) => cardDedupeKey(row.domain, row.email ?? "") === key);
}

/** 0 to 90 days is fresh, 91 to 365 is older, and older than that or a missing date is no hook. */
export function hookFreshness(date: string, today: string): "fresh" | "older" | "none" {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{4}-\d{2}-\d{2}$/.test(today)) return "none";
  const age = daysBetween(today, date);
  if (age == null || age < 0) return "none";
  if (age <= 90) return "fresh";
  if (age <= 365) return "older";
  return "none";
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Keep a hook only when the fetched page prints the exact text and the date. A stale date is dropped. */
export function verifiedHook(
  hook: { text?: string; sourceUrl?: string; sourceDate?: string; kind?: string } | undefined,
  page: string,
  today: string,
): CardHook | undefined {
  const text = hook?.text?.trim() ?? "";
  const sourceUrl = hook?.sourceUrl?.trim() ?? "";
  const sourceDate = hook?.sourceDate?.trim() ?? "";
  const kind = hook?.kind?.trim() ?? "";
  if (text.length < 8 || kind.length < 2 || kind.length > 40) return undefined;
  if (!/^https?:\/\//i.test(sourceUrl) || !ISO_DATE.test(sourceDate)) return undefined;
  if (hookFreshness(sourceDate, today) === "none") return undefined;
  const hay = page.toLowerCase();
  if (!hay.includes(text.toLowerCase()) || !page.includes(sourceDate)) return undefined;
  return { text, sourceUrl, sourceDate, kind };
}

export function addDays(isoDate: string, days: number) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return isoDate;
  const stamp = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return new Date(stamp + days * 86_400_000).toISOString().slice(0, 10);
}

export function dncNeverExpires(reason: DncReason) {
  return reason === "unsubscribe" || reason === "dont-contact";
}

export function makeDncEntry(input: {
  domain: string;
  email?: string;
  reason: DncReason;
  today: string;
  cooldownDays?: number;
}): DncEntry {
  const addedOn = input.today;
  return {
    domain: normalizeDomain(input.domain),
    email: (input.email ?? "").trim().toLowerCase(),
    reason: input.reason,
    addedOn,
    until: dncNeverExpires(input.reason) ? "never" : addDays(addedOn, input.cooldownDays ?? hunterDncCooldownDays()),
  };
}

export function dncBlocks(entries: DncEntry[], domain: string, email: string, today: string) {
  const host = normalizeDomain(domain);
  const address = email.trim().toLowerCase();
  return entries.some((entry) => {
    if (!dncNeverExpires(entry.reason) && entry.until !== "never" && entry.until < today) return false;
    const sameDomain = entry.domain === host;
    if (!sameDomain) return false;
    if (!entry.email) return true;
    return entry.email === address;
  });
}

export function dncField(entry: { domain: string; email?: string }) {
  return `${normalizeDomain(entry.domain)}|${(entry.email ?? "").trim().toLowerCase()}`;
}

function dncCovers(entry: DncEntry, next: DncEntry) {
  if (entry.domain !== next.domain) return false;
  if (!entry.email || !next.email) return true;
  return entry.email === next.email;
}

/**
 * A permanent reason is always written. It replaces a temporary entry for the same domain or email.
 * A temporary reason does not replace a permanent one.
 */
export function dncUpsertPlan(entries: DncEntry[], next: DncEntry, today: string): DncEntry[] {
  if (!dncNeverExpires(next.reason)) {
    if (dncBlocks(entries, next.domain, next.email, today)) return [];
    return [next];
  }
  const upgraded = entries
    .filter((entry) => dncCovers(entry, next) && !dncNeverExpires(entry.reason))
    .map((entry) => ({ ...entry, reason: next.reason, until: "never", addedOn: next.addedOn }));
  if (!upgraded.some((entry) => dncField(entry) === dncField(next))) upgraded.push(next);
  return upgraded;
}

export function parseDncValue(raw: unknown): DncEntry | null {
  const row = typeof raw === "string" ? safeJson(raw) : raw;
  if (!row || typeof row !== "object") return null;
  const entry = row as DncEntry;
  if (!entry.domain || !entry.reason || !entry.addedOn) return null;
  return entry;
}

function safeJson(raw: string) {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

/** A book reset may replace the lead book and the hunter state. It must not touch this key. */
export function doNotContactKey() {
  return HUNTER_DNC_KEY;
}

export function resetMayTouch(key: string) {
  return (HUNTER_RESET_KEYS as readonly string[]).includes(key);
}

export function retryDelayMs(attempt: number, random: () => number = Math.random) {
  const step = Math.max(1, attempt);
  const base = 400 * 2 ** (step - 1);
  const jitter = Math.floor(Math.min(0.999, Math.max(0, random())) * base);
  return base + jitter;
}

/** True once failures have used the first try and every allowed retry. */
export function shouldAbandon(failures: number, maxRetries: number) {
  return failures > maxRetries;
}

export function median(values: number[]) {
  const nums = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (nums.length === 0) return null;
  const mid = Math.floor(nums.length / 2);
  if (nums.length % 2 === 1) return nums[mid] ?? 0;
  return ((nums[mid - 1] ?? 0) + (nums[mid] ?? 0)) / 2;
}

/** Under half the trailing median. A median of 0 or no history does not alarm. */
export function belowMedianAlarm(filedToday: number, previousDays: number[]) {
  const mid = median(previousDays);
  if (mid == null || mid <= 0) return false;
  return filedToday < mid / 2;
}

export function zeroCandidateAlarm(candidates: number, failed: boolean) {
  if (failed) return false;
  return candidates === 0;
}

export function heartbeatLate(lastAt: string, now: Date, withinHours: boolean) {
  if (!lastAt) return { late: withinHours, ageMs: null as number | null };
  const stamp = Date.parse(lastAt);
  if (!Number.isFinite(stamp)) return { late: withinHours, ageMs: null };
  const ageMs = now.getTime() - stamp;
  const gap = withinHours ? HUNTER_HEARTBEAT_GAP_MS : HUNTER_HEARTBEAT_OFF_HOURS_MS;
  return { late: ageMs > gap, ageMs };
}

export type ModelUsage = {
  inputTokens: number;
  outputTokens: number;
  dollars: number | null;
};

/** Dollars only when the response names a dollar amount. Ticks are not converted. */
export function readModelUsage(payload: unknown): ModelUsage {
  return readXaiUsage(payload);
}

export type MonthlyCapState = "no-cap" | "ok" | "warn" | "stop" | "unknown";

export function monthlyCapState(spentDollars: number | null, cap = hunterMonthlyDollarCap()): MonthlyCapState {
  if (cap == null) return "no-cap";
  if (spentDollars == null) return "unknown";
  if (spentDollars >= cap) return "stop";
  if (spentDollars >= cap * 0.8) return "warn";
  return "ok";
}

export function monthlyCapLabel(state: MonthlyCapState) {
  if (state === "no-cap") return "no cap set";
  if (state === "unknown") return "dollars unknown";
  if (state === "warn") return "80% of the monthly cap";
  if (state === "stop") return "monthly cap reached";
  return "within the monthly cap";
}

export type CounterClient = {
  incr: (key: string) => Promise<number>;
  decr: (key: string) => Promise<number>;
  incrby?: (key: string, amount: number) => Promise<number>;
  expire?: (key: string, seconds: number) => Promise<unknown>;
};

export function callCounterKey(day: string) {
  return `${HUNTER_CALLS_KEY_PREFIX}${day}`;
}

export function apolloCounterKey(day: string) {
  return `${HUNTER_APOLLO_KEY_PREFIX}${day}`;
}

export function spendCounterKey(month: string) {
  return `${HUNTER_SPEND_KEY_PREFIX}${month}`;
}

export function spendUnknownKey(month: string) {
  return `${HUNTER_SPEND_UNKNOWN_PREFIX}${month}`;
}

export function spendTicksKey(month: string) {
  return `${HUNTER_SPEND_TICKS_PREFIX}${month}`;
}

export function spendEstimateKey(month: string) {
  return `${HUNTER_SPEND_ESTIMATE_PREFIX}${month}`;
}

/** Nearest tick. A tick is 10^-10 dollars, so this is not a whole-cent rounding. */
export function dollarsToTicks(dollars: number) {
  if (!Number.isFinite(dollars) || dollars <= 0) return 0;
  return Math.round(dollars * XAI_USD_TICKS);
}

export function ticksToDollars(ticks: number) {
  if (!Number.isFinite(ticks) || ticks <= 0) return 0;
  return ticks / XAI_USD_TICKS;
}

/** Counts one model call. There is no daily cap. The monthly dollar cap is checked separately. */
export async function countCall(client: CounterClient, key: string) {
  const used = await client.incr(key);
  await client.expire?.(key, 10 * 24 * 60 * 60);
  return used;
}

/** Increments first. Gives the count back when the cap would be passed, and does not make the call. */
export async function reserveCounter(client: CounterClient, key: string, cap: number) {
  const used = await client.incr(key);
  await client.expire?.(key, 10 * 24 * 60 * 60);
  if (used > cap) {
    const restored = await client.decr(key);
    return { allowed: false, used: restored };
  }
  return { allowed: true, used };
}

export async function addSpendTicks(client: CounterClient, key: string, ticks: number) {
  if (ticks <= 0 || !client.incrby) return 0;
  const total = await client.incrby(key, ticks);
  await client.expire?.(key, 120 * 24 * 60 * 60);
  return total;
}

/**
 * Records a model call toward the monthly cap.
 * A missing cost adds the documented estimate, on its own key, and is not actual spend.
 */
export async function noteModelSpend(client: CounterClient, month: string, dollars: number | null) {
  if (dollars == null) {
    const ticks = dollarsToTicks(HUNTER_ESTIMATED_CALL_DOLLARS);
    await addSpendTicks(client, spendEstimateKey(month), ticks);
    return { actualTicks: 0, estimatedTicks: ticks };
  }
  const ticks = dollarsToTicks(dollars);
  await addSpendTicks(client, spendTicksKey(month), ticks);
  return { actualTicks: ticks, estimatedTicks: 0 };
}

export type MonthSpend = { actual: number; estimated: number };

/** Actual dollars from the old cent counter plus tick counter. Estimates are separate and still count toward the cap. */
export function monthSpendFromCounts(cents: number, ticks: number, estimateTicks: number): MonthSpend {
  const actual = (Number.isFinite(cents) ? Math.max(0, cents) : 0) / 100 + ticksToDollars(ticks);
  return { actual, estimated: ticksToDollars(estimateTicks) };
}

export function capSpend(spend: MonthSpend) {
  return spend.actual + spend.estimated;
}

export function passesQualityFloor(score: number, floor = hunterQualityFloor()) {
  return score >= floor;
}

export function dailyFileRoom(filedToday: number, cap = hunterDailyFiledCap()) {
  return Math.max(0, cap - Math.max(0, filedToday));
}

const MOVED_PHRASE = /no longer (?:at|with)|left the company|formerly|previously at|now at|moved on to|moved to/i;
const EMPLOYER_STOP = new Set([
  "the",
  "our",
  "this",
  "that",
  "a",
  "an",
  "now",
  "new",
  "office",
  "team",
  "company",
  "calgary",
  "edmonton",
  "canada",
  "alberta",
]);

/**
 * True only when the named person is tied, next to a move phrase, to a different employer.
 * A loose "now at" or "moved to" on the page is not enough. Apollo's employer check stays the main stale signal.
 */
export function pageShowsMovedOn(page: string, person = "", currentOrg = "") {
  const name = person.trim();
  if (name.length < 3 || !page) return false;
  const at = page.toLowerCase().indexOf(name.toLowerCase());
  if (at < 0) return false;
  const window = page.slice(at, Math.min(page.length, at + name.length + 90));
  const match = MOVED_PHRASE.exec(window);
  if (!match) return false;
  const after = window.slice(match.index + match[0].length);
  const named = after.match(/\b([A-Z][\w&.'-]*(?:\s+[A-Z][\w&.'-]*){0,3})/);
  if (!named) return false;
  const employer = named[1].trim();
  const words = employer.split(/\s+/);
  if (words.every((word) => EMPLOYER_STOP.has(word.toLowerCase()))) return false;
  const org = currentOrg.trim().toLowerCase();
  const next = employer.toLowerCase();
  if (org && (next.includes(org) || org.includes(next))) return false;
  return true;
}

const SUCCESSOR_STOP = new Set(["co", "inc", "ltd", "llc", "corp", "company", "group", "limited", "the", "and"]);

/**
 * The person named on the page has left. Look on that same page for whoever holds the title now.
 * The successor is kept only when the name, the title, and the email are all on the page.
 * No extra search. If nobody qualifies, the caller drops the person who left and keeps the company.
 */
export function successorOnPage(page: string, departedName: string, title: string, currentOrg: string, departedEmail = "") {
  const role = title.trim();
  if (role.length < 3 || !page) return null;
  const roleAt = page.toLowerCase().indexOf(role.toLowerCase());
  if (roleAt < 0) return null;
  const window = page.slice(Math.max(0, roleAt - 240), Math.min(page.length, roleAt + role.length + 240));
  const departed = departedName.trim().toLowerCase();
  const org = currentOrg.trim().toLowerCase();
  const leftEmail = departedEmail.trim().toLowerCase();
  const names = window.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}\b/g) ?? [];
  const emails = window.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
  for (const name of names) {
    const lower = name.toLowerCase();
    if (lower === departed || (org && (lower === org || lower.includes(org) || org.includes(lower)))) continue;
    if (name.toLowerCase().split(/\s+/).some((word) => SUCCESSOR_STOP.has(word))) continue;
    if (pageShowsMovedOn(page, name, currentOrg)) continue;
    const nameAt = window.indexOf(name);
    const titleAt = window.toLowerCase().indexOf(role.toLowerCase());
    if (nameAt < 0 || titleAt < 0 || Math.abs(nameAt - titleAt) > role.length + name.length + 40) continue;
    const email = emails.find((item) => {
      if (item.toLowerCase() === leftEmail) return false;
      const at = window.toLowerCase().indexOf(item.toLowerCase());
      return at >= 0 && Math.abs(at - nameAt) < 180;
    });
    if (!email) continue;
    if (!page.toLowerCase().includes(name.toLowerCase()) || !page.toLowerCase().includes(email.toLowerCase())) continue;
    return { name, email: email.toLowerCase() };
  }
  return null;
}

/** Other-studio domains and names stay out of this book. The check is not a search prompt. */
export function isSeparateStudio(domain: string, org: string) {
  const hay = `${domain} ${org}`.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return hay.includes("geolab");
}

export type RunClock = {
  elapsed: () => number;
  remaining: () => number;
  out: () => boolean;
  clip: (wantedMs: number) => number;
  clipWall: (wantedMs: number) => number;
};

/** Samples `clock` on each check. Work stops at the deadline. Alarm posts may use the later wall. */
export function makeRunClock(clock: () => number, deadlineMs = HUNTER_RUN_DEADLINE_MS, wallMs = HUNTER_RUN_WALL_MS): RunClock {
  const started = clock();
  const elapsed = () => Math.max(0, clock() - started);
  const remaining = () => Math.max(0, deadlineMs - elapsed());
  return {
    elapsed,
    remaining,
    out: () => remaining() < 2_000,
    clip(wantedMs: number) {
      const left = remaining();
      if (left < 1_000) return 0;
      return Math.min(wantedMs, left);
    },
    clipWall(wantedMs: number) {
      const left = Math.max(0, wallMs - elapsed());
      if (left < 500) return 0;
      return Math.min(wantedMs, left);
    },
  };
}

export type AlarmTarget = { name: string; url: string; primary: boolean };

export function alarmWebhookTargets(env: { HUNTER_ALARM_WEBHOOK_URL?: string; HUNTER_ALARM_CC_WEBHOOK_URLS?: string } = process.env): AlarmTarget[] {
  const targets: AlarmTarget[] = [];
  const primary = env.HUNTER_ALARM_WEBHOOK_URL?.trim() ?? "";
  if (primary) targets.push({ name: HUNTER_ALARM_PRIMARY, url: primary, primary: true });
  const copies = (env.HUNTER_ALARM_CC_WEBHOOK_URLS ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  copies.forEach((url, index) => {
    targets.push({ name: HUNTER_ALARM_COPIES[index] ?? `copy ${index + 1}`, url, primary: false });
  });
  return targets;
}

/**
 * Turns HUNTER_ALARM_WEBHOOK_KEY into an Authorization header value.
 * A bare key is sent as Bearer. A value that already has a scheme is sent as-is.
 * A value that starts with "Authorization:" has that prefix removed.
 * Empty stays unset. The key is not logged.
 */
export function alarmAuthorizationHeader(raw: string | null | undefined): string | null {
  const text = (raw ?? "").trim();
  if (!text) return null;
  if (/^authorization:/i.test(text)) {
    const value = text.replace(/^authorization:/i, "").trim();
    return value || null;
  }
  if (/^[A-Za-z][A-Za-z0-9!#$%&'*+.^_`|~-]*\s+\S/.test(text)) return text;
  return `Bearer ${text}`;
}

export type AlarmPost = { name: string; ok: boolean };

/** Posts to Rex first, then each copy. The auth header goes only to the primary. A failed post does not stop the rest. */
export async function deliverAlarmWebhooks(input: {
  targets: AlarmTarget[];
  body: string;
  authorization?: string | null;
  timeoutMs?: number;
  timeoutFor?: () => number;
  fetchImpl?: (url: string, init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal }) => Promise<unknown>;
}): Promise<AlarmPost[]> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const authorization = alarmAuthorizationHeader(input.authorization);
  const posts: AlarmPost[] = [];
  for (const target of input.targets) {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (target.primary && authorization) headers.Authorization = authorization;
    const timeoutMs = input.timeoutFor?.() ?? input.timeoutMs ?? HUNTER_ALARM_TIMEOUT_MS;
    if (timeoutMs < 500) {
      posts.push({ name: target.name, ok: false });
      continue;
    }
    try {
      const response = await fetchImpl(target.url, {
        method: "POST",
        headers,
        body: input.body,
        signal: AbortSignal.timeout(timeoutMs),
      });
      const ok = response != null && typeof response === "object" && "ok" in response ? Boolean((response as { ok: boolean }).ok) : false;
      posts.push({ name: target.name, ok });
    } catch {
      // A missed webhook must not stop the hunt or the copies after it. Do not log the URL or the key.
      posts.push({ name: target.name, ok: false });
    }
  }
  return posts;
}

export function reviewExpired(filedOn: string, today: string, review: ReviewState, days: number) {
  if (review !== "unreviewed") return false;
  const age = daysBetween(today, filedOn);
  if (age == null) return false;
  return age >= days;
}

export function applyReviewExpiry<T extends { review?: ReviewState; filedOn?: string; scoutBatch?: string }>(
  companies: T[],
  today: string,
  days: number,
  epoch = "",
): { companies: T[]; expired: number } {
  let expired = 0;
  const next = companies.map((company) => {
    const filedOn = company.filedOn || (/^\d{4}-\d{2}-\d{2}$/.test(company.scoutBatch ?? "") ? company.scoutBatch ?? "" : "");
    if (epoch && filedOn && filedOn < epoch) return company;
    const review = company.review ?? "unreviewed";
    if (!reviewExpired(filedOn, today, review, days)) return company;
    expired += 1;
    return { ...company, review: "expired-unreviewed" as const };
  });
  return { companies: next, expired };
}

const UNSOLICITED = ["no unsolicited", "do not email", "no solicitation", "do not contact"];

export function quoteSnippet(page: string, needle: string, radius = 70) {
  const hay = page.replace(/\s+/g, " ").trim();
  const text = needle.trim();
  if (!hay || text.length < 2) return "";
  const at = hay.toLowerCase().indexOf(text.toLowerCase());
  if (at < 0) return "";
  const start = Math.max(0, at - radius);
  const end = Math.min(hay.length, at + text.length + radius);
  return hay.slice(start, end).trim();
}

/**
 * Don't-send rule. When a page already fetched says the company does not want unsolicited email,
 * clear the email and keep the company. This does not search again and it does not drop the company.
 */
export function clearEmailWhenUnsolicited<T extends { email?: string; cardFlags?: string[] }>(company: T, page: string): T {
  const email = company.email?.trim() ?? "";
  if (!email || !page.toLowerCase().includes(email.toLowerCase())) return company;
  const basis = caslBasis(page, email, "", "");
  if (!basis || basis.noUnsolicitedNotice) return company;
  const flags = company.cardFlags ?? [];
  return {
    ...company,
    email: "",
    cardFlags: flags.includes("No unsolicited email") ? flags : [...flags, "No unsolicited email"],
  };
}

export function caslBasis(page: string, email: string, title: string, sourceUrl: string): CaslBasis | null {
  if (!email.trim() || !page.toLowerCase().includes(email.trim().toLowerCase())) return null;
  const lower = page.toLowerCase();
  return {
    publishedOn: sourceUrl,
    roleFit: title.trim().length >= 2,
    noUnsolicitedNotice: !UNSOLICITED.some((phrase) => lower.includes(phrase)),
  };
}

export async function domainHasMx(domain: string, lookup: (host: string) => Promise<{ exchange?: string }[]>) {
  const host = normalizeDomain(domain);
  if (!host || host.endsWith(".example")) return false;
  try {
    const records = await lookup(host);
    return records.some((record) => Boolean(record.exchange?.trim()));
  } catch {
    return false;
  }
}

/** example.com domains are fixtures. They are not probed. */
export async function emailDomainHasMx(email: string, lookup: (host: string) => Promise<{ exchange?: string }[]>) {
  return (await checkEmailMx(email, lookup)) === "yes";
}

export type MxStatus = "yes" | "no" | "unknown";

/** A timeout or a temporary DNS failure is unknown, not a missing mailbox. */
export function mxFailureStatus(error: unknown): "no" | "unknown" {
  const code = error && typeof error === "object" && "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
  const message = error instanceof Error ? `${error.name} ${error.message}` : "";
  if (/ETIMEOUT|ESERVFAIL|EAI_AGAIN|EAGAIN|ENETUNREACH|ECONNRESET|SERVFAIL|Timeout|timed out/i.test(`${code} ${message}`)) {
    return "unknown";
  }
  return "no";
}

export async function checkEmailMx(email: string, lookup: (host: string) => Promise<{ exchange?: string }[]>): Promise<MxStatus> {
  const host = email.trim().toLowerCase().split("@")[1] ?? "";
  if (!host) return "no";
  if (host.endsWith(".example") || host === "example.com") return "no";
  try {
    const records = await lookup(host);
    return records.some((record) => Boolean(record.exchange?.trim())) ? "yes" : "no";
  } catch (error) {
    return mxFailureStatus(error);
  }
}

export function makeLineage(input: {
  query: string;
  signals: string[];
  sourceUrl: string;
  cardId?: string;
  exploration?: boolean;
  method?: CardLineage["method"];
}): CardLineage {
  return {
    method: input.method ?? HUNTER_METHOD_ID,
    query: input.query,
    promptVersion: HUNTER_PROMPT_VERSION,
    model: HUNTER_MODEL_ID,
    scoreVersion: HUNTER_SCORE_VERSION,
    signals: input.signals,
    sourceUrl: input.sourceUrl,
    experimentId: "",
    axis: "",
    variants: [],
    assignments: input.cardId
      ? [{ cardId: input.cardId, variantId: "", approvedAt: "", sentAt: "", fromAddress: "" }]
      : [],
    sampleFloor: HUNTER_SAMPLE_FLOOR,
    exploration: input.exploration === true,
  };
}

const DESK_FIELDS = [
  "review",
  "skipReason",
  "pipeline",
  "pipelineOn",
  "reviewedOn",
  "draftSubject",
  "draftBody",
  "status",
  "lastTouch",
  "buyerName",
  "buyerTitle",
  "email",
  "emailSource",
  "sourceUrl",
] as const;

const BUYER_FILL = new Set<string>(["buyerName", "buyerTitle", "email", "emailSource"]);

function blankField(value: unknown) {
  return !String(value ?? "").trim();
}

/** Keep a desk edit made while Hunter was running, and keep cards Hunter filed. */
export function mergeHunterCompanies<T extends { id: string }>(start: T[], hunter: T[], fresh: T[]): T[] {
  const startBy = new Map(start.map((company) => [company.id, company]));
  const hunterBy = new Map(hunter.map((company) => [company.id, company]));
  const seen = new Set<string>();
  const merged: T[] = [];
  for (const current of fresh) {
    seen.add(current.id);
    const hunted = hunterBy.get(current.id);
    const started = startBy.get(current.id);
    if (!hunted) {
      merged.push(current);
      continue;
    }
    if (!started) {
      const created = { ...hunted };
      for (const key of DESK_FIELDS) {
        const field = key as keyof T;
        if (current[field] === hunted[field]) continue;
        if (BUYER_FILL.has(key) && blankField(current[field]) && !blankField(hunted[field])) continue;
        created[field] = current[field];
      }
      merged.push(created);
      continue;
    }
    const next = { ...current };
    for (const key of Object.keys(hunted) as (keyof T)[]) {
      if (DESK_FIELDS.includes(key as (typeof DESK_FIELDS)[number])) continue;
      if (hunted[key] !== started[key]) next[key] = hunted[key];
    }
    for (const key of DESK_FIELDS) {
      const field = key as keyof T;
      if (current[field] !== started[field]) next[field] = current[field];
    }
    for (const key of BUYER_FILL) {
      const field = key as keyof T;
      if (blankField(current[field]) && blankField(started[field]) && !blankField(hunted[field])) next[field] = hunted[field];
    }
    merged.push(next);
  }
  for (const hunted of hunter) {
    if (!seen.has(hunted.id)) merged.unshift(hunted);
  }
  return merged;
}

export function explorationTurn(cursor: number, trialShare = hunterTrialShare()) {
  const every = Math.max(2, Math.round(1 / trialShare));
  return ((cursor % every) + every) % every === every - 1;
}

export function slotKey(signalId: string, regionId: string) {
  return `${signalId}|${regionId}`;
}

export function slotFromQuery(query: string) {
  const [signalId, regionId] = query.split("|");
  if (!signalId || !regionId) return "";
  return slotKey(signalId, regionId);
}

export function slotUsage(rows: { lineage?: { query?: string } | null }[]) {
  const usage: Record<string, number> = {};
  for (const row of rows) {
    const key = slotFromQuery(row.lineage?.query ?? "");
    if (!key) continue;
    usage[key] = (usage[key] ?? 0) + 1;
  }
  return usage;
}

/** Booked counts more than replied, and replied more than approved. Thin samples stay at zero. */
export function slotWeights(
  rows: { lineage?: { query?: string } | null; review?: ReviewState; pipeline?: PipelineMark }[],
  sampleFloor = HUNTER_SAMPLE_FLOOR,
) {
  const buckets = new Map<string, { reviewed: number; score: number }>();
  for (const row of rows) {
    const key = slotFromQuery(row.lineage?.query ?? "");
    if (!key) continue;
    const bucket = buckets.get(key) ?? { reviewed: 0, score: 0 };
    if (row.review === "approved" || row.review === "skipped") bucket.reviewed += 1;
    if (row.pipeline === "booked" || row.pipeline === "won") bucket.score += 3;
    else if (row.pipeline === "replied") bucket.score += 2;
    else if (row.review === "approved") bucket.score += 1;
    buckets.set(key, bucket);
  }
  const weights: Record<string, number> = {};
  for (const [key, bucket] of buckets) {
    if (bucket.reviewed >= sampleFloor && bucket.score > 0) weights[key] = bucket.score;
  }
  return weights;
}

export function chooseSlotIndex(input: {
  cursor: number;
  slots: { signalId: string; regionId: string }[];
  usage: Record<string, number>;
  weights: Record<string, number>;
  explore: boolean;
}) {
  const count = input.slots.length || 1;
  if (input.explore) {
    let best = 0;
    let least = Number.POSITIVE_INFINITY;
    input.slots.forEach((slot, index) => {
      const used = input.usage[slotKey(slot.signalId, slot.regionId)] ?? 0;
      if (used < least) {
        least = used;
        best = index;
      }
    });
    return best;
  }
  const ranked = input.slots
    .map((slot, index) => ({ index, weight: input.weights[slotKey(slot.signalId, slot.regionId)] ?? 0 }))
    .filter((slot) => slot.weight > 0)
    .sort((a, b) => b.weight - a.weight || a.index - b.index);
  if (ranked.length === 0) return ((input.cursor % count) + count) % count;
  return ranked[0]?.index ?? 0;
}

export type AlarmItem = { at: string; text: string; run: string };

export function alarmsWithin(items: AlarmItem[], now: Date, hours = 24) {
  const cutoff = now.getTime() - hours * 60 * 60 * 1000;
  return items.filter((item) => {
    const stamp = Date.parse(item.at);
    return Number.isFinite(stamp) && stamp >= cutoff;
  });
}

export function filedThroughHour(runs: { at: string; cardsFiled: number }[], day: string, hour: number, clock: (at: string) => { date: string; hour: number }) {
  let total = 0;
  let seen = false;
  for (const run of runs) {
    const when = clock(run.at);
    if (when.date !== day || when.hour > hour) continue;
    seen = true;
    total += run.cardsFiled;
  }
  return seen ? total : null;
}

export type FindingMethod = {
  id: string;
  label: string;
  enabled: boolean;
  trial: boolean;
  share: number;
};

/**
 * Two sources, one web search call. Public LinkedIn posts are a second source inside that call.
 * They do not add a vendor, a login, or a separate spend. The trial share stays unassigned.
 */
export function findingMethods(trialShare = hunterTrialShare()): FindingMethod[] {
  return [
    {
      id: HUNTER_METHOD_ID,
      label: "xAI web search",
      enabled: true,
      trial: false,
      share: Number((1 - trialShare).toFixed(2)),
    },
    {
      id: "public-linkedin-post",
      label: "Public LinkedIn posts",
      enabled: true,
      trial: false,
      share: 0,
    },
  ];
}

export type MethodStats = {
  method: string;
  filed: number;
  reviewed: number;
  approved: number;
  replied: number;
  booked: number;
  enough: boolean;
  approvalRate: number | null;
  replyRate: number | null;
  costPerCard: number | null;
};

export function methodStats(
  rows: {
    lineage?: { method?: string } | null;
    review?: ReviewState;
    pipeline?: PipelineMark;
    source?: string;
  }[],
  spentDollars: number | null,
  sampleFloor = HUNTER_SAMPLE_FLOOR,
): MethodStats[] {
  return findingMethods().map((method) => {
    const mine = rows.filter((row) => {
      const recorded = row.lineage?.method ?? (row.source === "hunter" || row.source === "scout" ? HUNTER_METHOD_ID : "");
      return recorded === method.id;
    });
    const filed = mine.length;
    const reviewed = mine.filter((row) => row.review === "approved" || row.review === "skipped").length;
    const approved = mine.filter((row) => row.review === "approved").length;
    const replied = mine.filter((row) => row.pipeline === "replied" || row.pipeline === "booked" || row.pipeline === "won").length;
    const booked = mine.filter((row) => row.pipeline === "booked" || row.pipeline === "won").length;
    const enough = reviewed >= sampleFloor;
    return {
      method: method.id,
      filed,
      reviewed,
      approved,
      replied,
      booked,
      enough,
      approvalRate: enough && reviewed > 0 ? approved / reviewed : null,
      replyRate: enough && approved > 0 ? replied / approved : null,
      costPerCard: enough && filed > 0 && spentDollars != null ? spentDollars / filed : null,
    };
  });
}

export function bookedThisMonth(rows: { pipeline?: PipelineMark; pipelineOn?: string }[], month: string) {
  return rows.filter((row) => (row.pipeline === "booked" || row.pipeline === "won") && (row.pipelineOn ?? "").startsWith(month)).length;
}

/** No booking-link service. The hook is a named empty slot for a later yes from Chris. */
export const BOOKING_LINK_HOOK = {
  kind: "unset" as const,
  note: "No booking link. That needs Chris's yes before any service is connected.",
};

export type PageRead = {
  text: string;
  reason: "ok" | "page-empty" | "fetch-failed" | "blocked" | "timed-out";
};

export function classifyPageResponse(status: number, body: string, timedOut: boolean): PageRead {
  if (timedOut) return { text: "", reason: "timed-out" };
  if (status === 401 || status === 403 || status === 429) return { text: "", reason: "blocked" };
  if (status < 200 || status >= 300) return { text: "", reason: "fetch-failed" };
  if (!body.trim()) return { text: "", reason: "page-empty" };
  return { text: body, reason: "ok" };
}

export type DryCompany = {
  domain: string;
  org: string;
  email: string;
  sourceUrl: string;
  page: string;
  score: number;
  expect: "file" | "drop";
  reason?: DropReason;
};

/** Fictional fixtures. The live list stays empty until Chris fills it. */
export const HUNTER_KNOWN_GOOD: DryCompany[] = [
  {
    domain: "northwind.example",
    org: "Northwind Example",
    email: "ada@northwind.example",
    sourceUrl: "https://northwind.example/about",
    page: "Northwind Example builds outdoor gear. Headquarters in Calgary, Canada. Ada North, Head of People, ada@northwind.example.",
    score: 40,
    expect: "file",
  },
];

export const HUNTER_KNOWN_BAD: DryCompany[] = [
  {
    domain: "empty.example",
    org: "Empty Example",
    email: "",
    sourceUrl: "https://empty.example",
    page: "",
    score: 40,
    expect: "drop",
    reason: "page-empty",
  },
  {
    domain: "weak.example",
    org: "Weak Example",
    email: "",
    sourceUrl: "https://weak.example",
    page: "Weak Example sells paper. Headquarters in Calgary, Canada.",
    score: 4,
    expect: "drop",
    reason: "below-quality-floor",
  },
];

/** Real companies Chris may add later. Leave this empty. */
export const HUNTER_LIVE_LIST: DryCompany[] = [];

/** The dry run lives in hunter-dry-run.ts so it can call the real verify and file path. */
