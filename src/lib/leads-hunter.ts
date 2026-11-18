/**
 * Lead Hunter. Finds ideal customers for Unearth Self and files research cards.
 * It never sends mail and never calls a paid data vendor.
 * A name, title, or email is kept only when that exact text is on the fetched page.
 */

import { HUNTER_DAILY_CALL_CAP, HUNTER_REGIONS, HUNTER_SIGNALS, PARTNER_KINDS } from "../data/hunter-profile.ts";
import { getRedisClient, loadBook, saveBook } from "./leads-book.ts";
import {
  coerceIndustry,
  coerceSize,
  edmontonToday,
  normalizeDomain,
  normalizeSignals,
  scoreCompany,
  timingFromSignals,
  type Company,
  type DatedSignal,
  type Industry,
  type LeadCity,
  type SizeBand,
  type WhySource,
} from "./lead-score.ts";
import { contactIfPresent } from "./leads-scout.ts";

export const HUNTER_KEY = "unearth:hunter:v1";

const ROLE_NAMES = new Set([
  "hr",
  "people",
  "team",
  "people team",
  "human resources",
  "talent team",
  "people and culture",
]);

export type HunterState = {
  paused: boolean;
  lastRunAt: string;
  lastRunResult: string;
  filedOn: string;
  filedToday: number;
  callsOn: string;
  callsToday: number;
  cursor: number;
  lockedUntil: number;
};

export type ProfileHit = { id: string; label: string; sourceUrl: string };

export type PartnerFlag = { flagged: boolean; reason: string; sourceUrl: string };

export type HunterBreak = { profile: number; access: number; timing: number; travel: number; total: number };

export type HunterDraft = {
  domain: string;
  org: string;
  place: string;
  industry: string;
  sizeBand: string;
  sourceUrl: string;
  signals: unknown;
  profileSignals: { id: string; sourceUrl: string }[];
  buyer: { name: string; title: string; email: string; emailSource: string };
};

export type HunterCard = {
  domain: string;
  org: string;
  city: LeadCity;
  place: string;
  industry: Industry;
  sizeBand: SizeBand;
  sourceUrl: string;
  why: string;
  whySources: WhySource[];
  signals: DatedSignal[];
  buyerName: string;
  buyerTitle: string;
  email: string;
  emailSource: string;
  profileHits: ProfileHit[];
  partnerFlag: PartnerFlag;
  hunterRegion: string;
  hunterBreak: HunterBreak;
  hunterScore: number;
};

export function freshHunterState(): HunterState {
  return {
    paused: false,
    lastRunAt: "",
    lastRunResult: "",
    filedOn: "",
    filedToday: 0,
    callsOn: "",
    callsToday: 0,
    cursor: 0,
    lockedUntil: 0,
  };
}

export function parseHunterState(raw: unknown): HunterState {
  const base = freshHunterState();
  if (!raw || typeof raw !== "object") return base;
  const row = raw as Partial<HunterState>;
  return {
    paused: row.paused === true,
    lastRunAt: typeof row.lastRunAt === "string" ? row.lastRunAt : "",
    lastRunResult: typeof row.lastRunResult === "string" ? row.lastRunResult : "",
    filedOn: typeof row.filedOn === "string" ? row.filedOn : "",
    filedToday: numberOrZero(row.filedToday),
    callsOn: typeof row.callsOn === "string" ? row.callsOn : "",
    callsToday: numberOrZero(row.callsToday),
    cursor: numberOrZero(row.cursor),
    lockedUntil: numberOrZero(row.lockedUntil),
  };
}

function numberOrZero(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

export function countsForToday(state: HunterState, today: string) {
  return {
    filedToday: state.filedOn === today ? state.filedToday : 0,
    callsToday: state.callsOn === today ? state.callsToday : 0,
  };
}

export function hunterMayCall(state: HunterState, today: string, cap = HUNTER_DAILY_CALL_CAP) {
  if (state.paused) return false;
  return countsForToday(state, today).callsToday < cap;
}

export type HunterSlot = { signalId: string; regionId: string; signalLabel: string; regionLabel: string };

export function hunterSlots(): HunterSlot[] {
  const slots: HunterSlot[] = [];
  for (const signal of HUNTER_SIGNALS) {
    for (const region of HUNTER_REGIONS) {
      slots.push({
        signalId: signal.id,
        regionId: region.id,
        signalLabel: signal.label,
        regionLabel: region.label,
      });
    }
  }
  return slots;
}

export function slotAt(cursor: number): { index: number; slot: HunterSlot } {
  const slots = hunterSlots();
  const index = ((cursor % slots.length) + slots.length) % slots.length;
  const slot = slots[index];
  if (!slot) throw new Error("Hunter profile has no slots");
  return { index, slot };
}

export function advanceCursor(cursor: number) {
  const count = hunterSlots().length || 1;
  return (cursor + 1) % count;
}

export function cardSource(company: { source?: string; scoutBatch?: string }): "scout" | "hunter" | "hand" {
  if (company.source === "hunter" || company.source === "scout" || company.source === "hand") return company.source;
  if (/^\d{4}-\d{2}-\d{2}$/.test(company.scoutBatch ?? "")) return "scout";
  return "hand";
}

export function travelPoints(regionId: string) {
  const region = HUNTER_REGIONS.find((item) => item.id === regionId);
  const points = region?.travel ?? 2;
  return Math.max(1, Math.min(10, Math.round(points)));
}

export function profilePoints(hitIds: string[]) {
  const seen = new Set<string>();
  let total = 0;
  for (const id of hitIds) {
    if (seen.has(id)) continue;
    const signal = HUNTER_SIGNALS.find((item) => item.id === id);
    if (!signal) continue;
    seen.add(id);
    total += signal.points;
  }
  return Math.max(0, Math.min(50, total));
}

export function hunterAccessPoints(input: {
  buyerName: string;
  email: string;
  emailSource: string;
  sourceUrl: string;
}) {
  const buyerName = ROLE_NAMES.has(input.buyerName.trim().toLowerCase()) ? "" : input.buyerName;
  return scoreCompany({
    city: "Alberta",
    industry: "other",
    sizeBand: "unknown",
    sourceUrl: input.sourceUrl,
    buyerName,
    email: input.email,
    emailSource: input.emailSource,
    signals: [],
    today: "2026-01-01",
  }).access;
}

export function scoreHunter(input: {
  hitIds: string[];
  buyerName: string;
  email: string;
  emailSource: string;
  sourceUrl: string;
  signals: DatedSignal[];
  lastTouch?: string;
  today: string;
  regionId: string;
}): HunterBreak {
  const profile = profilePoints(input.hitIds);
  const access = hunterAccessPoints(input);
  const timing = timingFromSignals({
    signals: input.signals,
    lastTouch: input.lastTouch,
    today: input.today,
  }).timing;
  const travel = travelPoints(input.regionId);
  return { profile, access, timing, travel, total: profile + access + timing + travel };
}

function asRecord(row: unknown): Record<string, unknown> | null {
  if (!row || typeof row !== "object") return null;
  return row as Record<string, unknown>;
}

/** Keep every sourced company. Geography and headcount are not filters. */
export function selectHunterRows(raw: unknown): HunterDraft[] {
  const record = asRecord(raw);
  const list = Array.isArray(raw) ? raw : Array.isArray(record?.companies) ? record.companies : [];
  const rows: HunterDraft[] = [];
  const seen = new Set<string>();
  for (const item of list) {
    const row = asRecord(item);
    if (!row) continue;
    const domain = normalizeDomain(String(row.domain ?? ""));
    if (!domain || seen.has(domain)) continue;
    const sourceUrl = String(row.sourceUrl ?? "").trim();
    if (!/^https?:\/\//i.test(sourceUrl)) continue;
    const buyer = asRecord(row.buyer);
    const profileSignals = Array.isArray(row.profileSignals)
      ? row.profileSignals.flatMap((entry) => {
          const hit = asRecord(entry);
          if (!hit) return [];
          const id = String(hit.id ?? "").trim();
          const url = String(hit.sourceUrl ?? "").trim();
          if (!id || !/^https?:\/\//i.test(url)) return [];
          return [{ id, sourceUrl: url }];
        })
      : [];
    seen.add(domain);
    rows.push({
      domain,
      org: String(row.org ?? "").trim(),
      place: String(row.place ?? row.city ?? "").trim(),
      industry: String(row.industry ?? "").trim(),
      sizeBand: String(row.sizeBand ?? "").trim(),
      sourceUrl,
      signals: row.signals,
      profileSignals,
      buyer: {
        name: String(buyer?.name ?? "").trim(),
        title: String(buyer?.title ?? "").trim(),
        email: String(buyer?.email ?? "").trim(),
        emailSource: String(buyer?.emailSource ?? "").trim(),
      },
    });
  }
  return rows.slice(0, 8);
}

function pageHas(page: string, needle: string) {
  const text = needle.trim().toLowerCase();
  if (text.length < 2) return false;
  return page.toLowerCase().includes(text);
}

function cityFromPlace(place: string): LeadCity {
  const v = place.toLowerCase();
  if (v.includes("calgary")) return "Calgary";
  if (v.includes("edmonton")) return "Edmonton";
  if (v.includes("red deer")) return "Red Deer";
  if (/\balberta\b/.test(v)) return "Alberta";
  return "Elsewhere";
}

function placeMatchesRegion(place: string, city: LeadCity, regionId: string) {
  if (regionId === "anywhere") return true;
  if (regionId === "canada" && city !== "Elsewhere") return true;
  const region = HUNTER_REGIONS.find((item) => item.id === regionId);
  if (!region) return false;
  const hay = place.toLowerCase();
  return region.placeTerms.some((term) => hay.includes(term));
}

function domainOnSource(domain: string, sourceUrl: string, page: string) {
  try {
    const host = new URL(sourceUrl).hostname.replace(/^www\./, "").toLowerCase();
    if (host === domain || host.endsWith(`.${domain}`)) return true;
  } catch {
    return false;
  }
  return page.toLowerCase().includes(domain.toLowerCase());
}

function usableName(name: string) {
  const cleaned = name.trim();
  if (!cleaned || ROLE_NAMES.has(cleaned.toLowerCase())) return "";
  return cleaned;
}

function titleOnPage(page: string, title: string, nameKept: boolean) {
  const cleaned = title.trim();
  if (!nameKept || cleaned.length < 2) return "";
  return pageHas(page, cleaned) ? cleaned : "";
}

function verifiedSignals(raw: unknown, pages: Record<string, string>, idPrefix: string): DatedSignal[] {
  return normalizeSignals(raw, idPrefix).filter((signal) => {
    const page = pages[signal.sourceUrl] ?? "";
    if (!page) return false;
    const year = signal.date.slice(0, 4);
    const note = signal.note.trim();
    const noteOnPage = note.length >= 12 && pageHas(page, note);
    return page.includes(signal.date) || page.includes(year) || noteOnPage;
  });
}

function verifiedHits(draft: HunterDraft, pages: Record<string, string>): ProfileHit[] {
  const hits: ProfileHit[] = [];
  const seen = new Set<string>();
  for (const claimed of draft.profileSignals) {
    if (seen.has(claimed.id)) continue;
    const signal = HUNTER_SIGNALS.find((item) => item.id === claimed.id);
    if (!signal) continue;
    const page = pages[claimed.sourceUrl] ?? "";
    if (!page) continue;
    if (!signal.terms.some((term) => pageHas(page, term))) continue;
    seen.add(signal.id);
    hits.push({ id: signal.id, label: signal.label, sourceUrl: claimed.sourceUrl });
  }
  return hits;
}

function partnerFromPages(pages: Record<string, string>): PartnerFlag {
  const empty = { flagged: false, reason: "", sourceUrl: "" };
  for (const [url, page] of Object.entries(pages)) {
    if (!page || !/^https?:\/\//i.test(url)) continue;
    for (const kind of PARTNER_KINDS) {
      const term = kind.terms.find((item) => pageHas(page, item));
      if (!term) continue;
      return {
        flagged: true,
        reason: `${kind.label}. The page contains "${term}".`,
        sourceUrl: url,
      };
    }
  }
  return empty;
}

function sizeFromPage(raw: string, page: string): SizeBand {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits || !page.includes(digits)) return "unknown";
  return coerceSize(raw, "unknown");
}

function industryFromPage(raw: string, page: string): Industry {
  const word = raw.trim().toLowerCase();
  if (word.length < 3 || !pageHas(page, word)) return "other";
  return coerceIndustry(word, "other");
}

/**
 * Drop anything the fetched page does not show.
 * A company outside Canada is kept when its place is on the page.
 */
export function verifyHunterDrafts(
  drafts: HunterDraft[],
  pages: Record<string, string>,
  opts: { regionId: string; today: string },
): HunterCard[] {
  const cards: HunterCard[] = [];
  for (const draft of drafts) {
    const page = pages[draft.sourceUrl] ?? "";
    if (!page) continue;
    if (!pageHas(page, draft.org)) continue;
    if (!domainOnSource(draft.domain, draft.sourceUrl, page)) continue;
    const place = draft.place && pageHas(page, draft.place) ? draft.place : "";
    const city = place ? cityFromPlace(place) : "Elsewhere";
    if (!placeMatchesRegion(place || city, city, opts.regionId)) continue;
    const contactPageUrl = /^https?:\/\//i.test(draft.buyer.emailSource) ? draft.buyer.emailSource : "";
    const contactPage = contactPageUrl ? (pages[contactPageUrl] ?? "") : "";
    const contact = contactPage
      ? contactIfPresent(contactPage, draft.buyer.name, draft.buyer.email, contactPageUrl)
      : { name: "", title: "", email: "", emailSource: "" };
    const buyerName = usableName(contact.name);
    const buyerTitle = titleOnPage(contactPage, draft.buyer.title, Boolean(buyerName));
    const hits = verifiedHits(draft, pages);
    const signals = verifiedSignals(draft.signals, pages, `H-${cards.length + 1}`);
    const partnerFlag = partnerFromPages(pages);
    const hunterBreak = scoreHunter({
      hitIds: hits.map((hit) => hit.id),
      buyerName,
      email: contact.email,
      emailSource: contact.emailSource,
      sourceUrl: draft.sourceUrl,
      signals,
      today: opts.today,
      regionId: opts.regionId,
    });
    const why = hits.length
      ? `Research card from Hunter. Public pages show: ${hits.map((hit) => hit.label).join("; ")}.`
      : "Research card from Hunter. No profile signal was verified on a fetched page.";
    cards.push({
      domain: draft.domain,
      org: draft.org,
      city,
      place,
      industry: industryFromPage(draft.industry, page),
      sizeBand: sizeFromPage(draft.sizeBand, page),
      sourceUrl: draft.sourceUrl,
      why,
      whySources: hits.map((hit) => ({ url: hit.sourceUrl, label: hit.label })),
      signals,
      buyerName,
      buyerTitle,
      email: contact.email,
      emailSource: contact.emailSource,
      profileHits: hits,
      partnerFlag,
      hunterRegion: opts.regionId,
      hunterBreak,
      hunterScore: hunterBreak.total,
    });
  }
  return cards;
}

function nextCompanyId(rows: { id: string }[]) {
  const nums = rows.map((row) => Number(String(row.id).replace(/\D/g, ""))).filter((n) => Number.isFinite(n));
  const n = (nums.length ? Math.max(...nums) : 0) + 1;
  return `C-${String(n).padStart(3, "0")}`;
}

function mergeSignals(current: DatedSignal[] | undefined, incoming: DatedSignal[]) {
  const merged = [...(current ?? [])];
  for (const signal of incoming) {
    const dup = merged.some(
      (have) => have.kind === signal.kind && have.date === signal.date && have.sourceUrl === signal.sourceUrl,
    );
    if (!dup) merged.push({ ...signal, id: signal.id || `H-${merged.length + 1}` });
  }
  return merged;
}

function mergeHits(current: ProfileHit[] | undefined, incoming: ProfileHit[]) {
  const merged = [...(current ?? [])];
  for (const hit of incoming) {
    if (merged.some((have) => have.id === hit.id && have.sourceUrl === hit.sourceUrl)) continue;
    merged.push(hit);
  }
  return merged;
}

function blankCompany(card: HunterCard, id: string, today: string): Company {
  return {
    id,
    org: card.org,
    domain: card.domain,
    city: card.city,
    place: card.place,
    industry: card.industry,
    sizeBand: card.sizeBand,
    sourceUrl: card.sourceUrl,
    why: card.why,
    whySources: card.whySources,
    signals: card.signals,
    buyerName: card.buyerName,
    buyerTitle: card.buyerTitle,
    email: card.email,
    emailSource: card.emailSource,
    timingNote: card.signals.length ? "Timing from dated signals." : "No dated signals yet.",
    timingScore: timingFromSignals({ signals: card.signals, today }).timing,
    status: "watch",
    filedLeadId: "",
    draftSubject: "",
    draftBody: "",
    lastTouch: "",
    scoutBatch: "",
    source: "hunter",
    hunterRegion: card.hunterRegion,
    hunterScore: card.hunterScore,
    hunterBreak: card.hunterBreak,
    profileHits: card.profileHits,
    partnerFlag: card.partnerFlag,
  };
}

/**
 * Same book as the scout. A known domain is updated. A new domain is a research card.
 * Existing scout fields (why, buyer, batch, source) stay as they were.
 */
export function fileHunterCards(
  companies: Company[],
  cards: HunterCard[],
  opts: { today: string },
): { companies: Company[]; filed: number; updated: number } {
  const next = [...companies];
  let filed = 0;
  let updated = 0;
  for (const card of cards) {
    const domain = normalizeDomain(card.domain);
    if (!domain) continue;
    const index = next.findIndex((company) => company.domain === domain);
    if (index === -1) {
      next.unshift(blankCompany({ ...card, domain }, nextCompanyId(next), opts.today));
      filed += 1;
      continue;
    }
    const existing = next[index];
    if (!existing) continue;
    const signals = mergeSignals(existing.signals, card.signals);
    const profileHits = mergeHits(existing.profileHits, card.profileHits);
    const partnerFlag =
      card.partnerFlag.flagged ? card.partnerFlag : (existing.partnerFlag ?? card.partnerFlag);
    const scored = scoreHunter({
      hitIds: profileHits.map((hit) => hit.id),
      buyerName: existing.buyerName,
      email: existing.email,
      emailSource: existing.emailSource,
      sourceUrl: existing.sourceUrl || card.sourceUrl,
      signals,
      lastTouch: existing.lastTouch,
      today: opts.today,
      regionId: existing.city === "Elsewhere" ? card.hunterRegion : "canada",
    });
    next[index] = {
      ...existing,
      signals,
      profileHits,
      partnerFlag,
      hunterRegion: existing.hunterRegion || card.hunterRegion,
      hunterScore: scored.total,
      hunterBreak: {
        profile: scored.profile,
        access: scored.access,
        timing: scored.timing,
        travel: scored.travel,
      },
      place: existing.place || card.place,
    };
    updated += 1;
  }
  return { companies: next, filed, updated };
}

export function hunterPrompt(slot: HunterSlot, knownDomains: string[]) {
  const signal = HUNTER_SIGNALS.find((item) => item.id === slot.signalId);
  const skip = knownDomains.slice(0, 200).join(", ");
  const signalList = HUNTER_SIGNALS.map((item) => `${item.id}: ${item.search}`).join("\n");
  return `Find companies for Badlands Bootcamp at Unearth Self. One team of 6 to 24 people inside a company of any size. Return JSON only.

This batch: ${signal?.label ?? slot.signalLabel}.
Region: ${slot.regionLabel}. Do not drop a company for being outside Canada. Do not filter by headcount.

Skip these domains: ${skip || "none"}.

Profile signals a page can show:
${signalList}

For each company include org, domain, place (city and country as printed on the page), industry, sizeBand only when a number is printed else "", sourceUrl, signals, profileSignals, and buyer.

signals are public dated events only: hiring, office, expansion, win, year-end. Each needs kind, date as YYYY-MM-DD, sourceUrl, and a short note copied from the page. Omit a signal when you do not have both a date and a page URL.

profileSignals is a list of { id, sourceUrl }. Use only the ids above. Include one only when that page shows the signal.

buyer.name, buyer.title, buyer.email, and buyer.emailSource: include a name, title, or email only when that exact text is published on buyer.emailSource. If you cannot point at the page, leave the buyer fields as empty strings. Never guess an email. Never use a pattern such as first.last@. Never use a department name as a person.

Do not invent a price, a date, a partner, a building, or a programme. Do not mention any company other than the one on the page.

Return at most 8 companies:
{ "companies": [] }`;
}

export async function researchHunterSlot(
  slot: HunterSlot,
  knownDomains: string[],
): Promise<{ companies: unknown } | { error: string }> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return { error: "XAI_API_KEY not configured" };
  const { XAI_MODEL } = await import("./structured-minutes.ts");
  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: XAI_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You research public web pages and return JSON. You never invent names, emails, dates, or companies. Every claim needs a source URL. This search is only for Unearth Self.",
        },
        { role: "user", content: hunterPrompt(slot, knownDomains) },
      ],
      temperature: 0,
      response_format: { type: "json_object" },
      search_parameters: {
        mode: "on",
        return_citations: true,
        sources: [{ type: "web" }],
      },
    }),
    signal: AbortSignal.timeout(55000),
  });
  if (!response.ok) {
    const detail = await response.text();
    return { error: `xAI HTTP ${response.status}: ${detail.slice(0, 400)}` };
  }
  const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) return { error: "xAI returned no content" };
  try {
    return JSON.parse(content) as { companies: unknown };
  } catch {
    return { error: "xAI did not return JSON" };
  }
}

async function readPublishedPage(url: string): Promise<string> {
  if (!/^https?:\/\//i.test(url)) return "";
  try {
    const response = await fetch(url, {
      headers: { "user-agent": "UnearthSelfLeadHunter/1.0" },
      signal: AbortSignal.timeout(6000),
      redirect: "follow",
    });
    return response.ok ? await response.text() : "";
  } catch {
    return "";
  }
}

export function urlsForDrafts(drafts: HunterDraft[]) {
  const urls = new Set<string>();
  for (const draft of drafts) {
    if (/^https?:\/\//i.test(draft.sourceUrl)) urls.add(draft.sourceUrl);
    if (/^https?:\/\//i.test(draft.buyer.emailSource)) urls.add(draft.buyer.emailSource);
    for (const hit of draft.profileSignals) urls.add(hit.sourceUrl);
    for (const signal of normalizeSignals(draft.signals)) urls.add(signal.sourceUrl);
  }
  return [...urls].slice(0, 40);
}

async function readPages(urls: string[]) {
  const pages: Record<string, string> = {};
  let cursor = 0;
  async function worker() {
    while (cursor < urls.length) {
      const url = urls[cursor];
      cursor += 1;
      if (!url) continue;
      pages[url] = await readPublishedPage(url);
    }
  }
  await Promise.all(Array.from({ length: Math.min(5, urls.length) }, () => worker()));
  return pages;
}

async function loadHunterState(): Promise<HunterState> {
  const redis = await getRedisClient();
  if (!redis) return freshHunterState();
  return parseHunterState(await redis.get<unknown>(HUNTER_KEY));
}

async function saveHunterState(state: HunterState) {
  const redis = await getRedisClient();
  if (!redis) throw new Error("Redis is not configured");
  await redis.set(HUNTER_KEY, state);
}

export async function runHunterBatch(): Promise<
  | { ok: true; skipped: "paused" | "cap" | "busy"; callsToday: number }
  | { ok: true; filed: number; updated: number; callsToday: number; slot: string }
  | { ok: false; error: string }
> {
  const redis = await getRedisClient();
  if (!redis) return { ok: false, error: "Redis is not configured" };
  const today = edmontonToday();
  const now = Date.now();
  let state = await loadHunterState();
  if (state.lockedUntil > now) {
    return { ok: true, skipped: "busy", callsToday: countsForToday(state, today).callsToday };
  }
  if (state.paused) {
    state = { ...state, lastRunAt: new Date(now).toISOString(), lastRunResult: "Paused. No search." };
    await saveHunterState(state);
    return { ok: true, skipped: "paused", callsToday: countsForToday(state, today).callsToday };
  }
  const used = countsForToday(state, today).callsToday;
  if (used >= HUNTER_DAILY_CALL_CAP) {
    state = {
      ...state,
      lastRunAt: new Date(now).toISOString(),
      lastRunResult: `Daily cap of ${HUNTER_DAILY_CALL_CAP} model calls reached.`,
    };
    await saveHunterState(state);
    return { ok: true, skipped: "cap", callsToday: used };
  }

  state = {
    ...state,
    lockedUntil: now + 90_000,
    callsOn: today,
    callsToday: used + 1,
    filedOn: state.filedOn === today ? state.filedOn : today,
    filedToday: state.filedOn === today ? state.filedToday : 0,
  };
  await saveHunterState(state);

  const { slot } = slotAt(state.cursor);
  try {
    const loaded = await loadBook();
    if (loaded.storage !== "redis") {
      await saveHunterState({
        ...state,
        lockedUntil: 0,
        lastRunAt: new Date().toISOString(),
        lastRunResult: "Redis is not configured.",
      });
      return { ok: false, error: "Redis is not configured" };
    }

    const research = await researchHunterSlot(
      slot,
      loaded.book.companies.map((company) => company.domain),
    );
    if ("error" in research) {
      await saveHunterState({
        ...state,
        lockedUntil: 0,
        lastRunAt: new Date().toISOString(),
        lastRunResult: research.error,
      });
      return { ok: false, error: research.error };
    }

    const drafts = selectHunterRows(research);
    const pages = await readPages(urlsForDrafts(drafts));
    const verified = verifyHunterDrafts(drafts, pages, { regionId: slot.regionId, today });
    const filed = fileHunterCards(loaded.book.companies, verified, { today });
    await saveBook({ ...loaded.book, companies: filed.companies });
    const callsToday = countsForToday(state, today).callsToday;
    await saveHunterState({
      ...state,
      lockedUntil: 0,
      cursor: advanceCursor(state.cursor),
      filedOn: today,
      filedToday: (state.filedOn === today ? state.filedToday : 0) + filed.filed,
      lastRunAt: new Date().toISOString(),
      lastRunResult: `Filed ${filed.filed}. Updated ${filed.updated}. Slot: ${slot.signalLabel} in ${slot.regionLabel}. Calls today ${callsToday} of ${HUNTER_DAILY_CALL_CAP}.`,
    });
    return {
      ok: true,
      filed: filed.filed,
      updated: filed.updated,
      callsToday,
      slot: `${slot.signalLabel} / ${slot.regionLabel}`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Hunter batch failed";
    await saveHunterState({
      ...state,
      lockedUntil: 0,
      lastRunAt: new Date().toISOString(),
      lastRunResult: message,
    });
    return { ok: false, error: message };
  }
}

export async function readHunterDesk(today = edmontonToday()) {
  const redis = await getRedisClient();
  const state = redis ? parseHunterState(await redis.get<unknown>(HUNTER_KEY)) : freshHunterState();
  const counts = countsForToday(state, today);
  return {
    storage: redis ? ("redis" as const) : ("browser" as const),
    paused: state.paused,
    lastRunAt: state.lastRunAt,
    lastRunResult: state.lastRunResult,
    filedToday: counts.filedToday,
    callsToday: counts.callsToday,
    cap: HUNTER_DAILY_CALL_CAP,
  };
}

export async function writeHunterPaused(paused: boolean) {
  const redis = await getRedisClient();
  if (!redis) throw new Error("Redis is not configured");
  const state = parseHunterState(await redis.get<unknown>(HUNTER_KEY));
  const next = { ...state, paused };
  await redis.set(HUNTER_KEY, next);
  return readHunterDesk();
}
