/**
 * Lead Hunter. Finds ideal customers for Unearth Self and files research cards.
 * It never sends mail.
 * A public name, title, or email is kept only when that exact text is on the fetched page.
 * Apollo may add one licensed contact when APOLLO_API_KEY is set. The key is never logged.
 */

import { HUNTER_DAILY_CARD_TARGET, HUNTER_REGIONS, HUNTER_SIGNALS, PARTNER_KINDS } from "../data/hunter-profile.ts";
import { apolloApiKey, apolloCreditCap, enrichHunterContacts } from "./apollo.ts";
import {
  applyHunterWork,
  assignEnrichment,
  capacityOnBudgetStop,
  countContactReadyGain,
  countsForToday,
  hunterCallBudget,
  hunterStop,
  type CapacityProblem,
} from "./hunter-cap.ts";
import { appendHunterRun, hunterRunEntry, readHunterRuns, type HunterRunOutcome } from "./hunter-runs.ts";
import { getRedisClient, loadBook, saveBook } from "./leads-book.ts";
import {
  asLeadCompany,
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
  /** Set when the model-call budget runs out before the card target. Rex reads this. */
  capacity: CapacityProblem | null;
  cursor: number;
  lockedUntil: number;
  /** Edmonton date the Apollo reveal counter belongs to. */
  apolloOn: string;
  /** People-match calls sent today. Search does not count. */
  apolloReveals: number;
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
    capacity: null,
    cursor: 0,
    lockedUntil: 0,
    apolloOn: "",
    apolloReveals: 0,
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
    capacity: parseCapacity(row.capacity),
    cursor: numberOrZero(row.cursor),
    lockedUntil: numberOrZero(row.lockedUntil),
    apolloOn: typeof row.apolloOn === "string" ? row.apolloOn : "",
    apolloReveals: numberOrZero(row.apolloReveals),
  };
}

function parseCapacity(value: unknown): CapacityProblem | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<CapacityProblem>;
  if (typeof row.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) return null;
  return {
    date: row.date,
    cardsFiled: numberAtLeastZero(row.cardsFiled),
    callsUsed: numberAtLeastZero(row.callsUsed),
  };
}

function numberAtLeastZero(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
}

function numberOrZero(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

export function hunterMayCall(
  state: HunterState,
  today: string,
  callBudget = hunterCallBudget(),
  cardTarget = HUNTER_DAILY_CARD_TARGET,
) {
  if (state.paused) return false;
  return hunterStop(state, today, callBudget, cardTarget) === null;
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
  return asLeadCompany({
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
    profileHits: card.profileHits,
  });
}

/**
 * Same book as the nightly run. A known domain is updated. A new domain is a research card.
 * Existing nightly fields (why, buyer, batch, source) stay as they were.
 */
export function fileHunterCards(
  companies: Company[],
  cards: HunterCard[],
  opts: { today: string },
): { companies: Company[]; filed: number; updated: number; contactReady: number } {
  const next = [...companies];
  let filed = 0;
  let updated = 0;
  for (const card of cards) {
    const domain = normalizeDomain(card.domain);
    if (!domain) continue;
    const index = next.findIndex((company) => company.domain === domain);
    if (index === -1) {
      next.unshift(assignEnrichment(blankCompany({ ...card, domain }, nextCompanyId(next), opts.today), opts.today));
      filed += 1;
      continue;
    }
    const existing = next[index];
    if (!existing) continue;
    const signals = mergeSignals(existing.signals, card.signals);
    const profileHits = mergeHits(existing.profileHits, card.profileHits);
    next[index] = assignEnrichment(
      asLeadCompany({
        ...existing,
        signals,
        profileHits,
        hunterRegion: existing.hunterRegion || card.hunterRegion,
        place: existing.place || card.place,
      }),
      opts.today,
    );
    updated += 1;
  }
  return { companies: next, filed, updated, contactReady: countContactReadyGain(companies, next) };
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
  const { callXaiWebSearch } = await import("./xai-search.ts");
  return callXaiWebSearch(
    "You research public web pages and return JSON. You never invent names, emails, dates, or companies. Every claim needs a source URL. This search is only for Unearth Self.",
    hunterPrompt(slot, knownDomains),
    240000,
  );
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

function revealsOn(state: HunterState, today: string) {
  return state.apolloOn === today ? state.apolloReveals : 0;
}

function runNote(extra = "") {
  const off = apolloApiKey() ? "" : "Apollo off: no key";
  return [extra.trim(), off].filter(Boolean).join(" ");
}

async function rememberRun(input: {
  run: "always-on" | "nightly";
  outcome: HunterRunOutcome;
  modelCalls?: number;
  candidates?: number;
  cardsFiled?: number;
  contactReady?: number;
  apolloSearches?: number;
  apolloReveals?: number;
  error?: string;
}) {
  await appendHunterRun(
    hunterRunEntry({
      run: input.run,
      outcome: input.outcome,
      modelCalls: input.modelCalls ?? 0,
      candidates: input.candidates ?? 0,
      cardsFiled: input.cardsFiled ?? 0,
      contactReady: input.contactReady ?? 0,
      apolloSearches: input.apolloSearches ?? 0,
      apolloReveals: input.apolloReveals ?? 0,
      error: input.error ?? "",
    }),
  );
}

export async function enrichUnderApolloCap(input: {
  companies: Company[];
  domains: string[];
  today: string;
  limit: number;
}) {
  const state = await loadHunterState();
  const result = await enrichHunterContacts({
    companies: input.companies,
    domains: input.domains,
    today: input.today,
    revealsUsed: revealsOn(state, input.today),
    cap: apolloCreditCap(),
    apiKey: apolloApiKey(),
    limit: input.limit,
  });
  if (result.reveals > 0) {
    const fresh = await loadHunterState();
    await saveHunterState({
      ...fresh,
      apolloOn: input.today,
      apolloReveals: revealsOn(fresh, input.today) + result.reveals,
    });
  }
  return result;
}

function dayStopCopy(stop: "cards" | "budget", state: HunterState, today: string, budget: number) {
  const counts = countsForToday(state, today);
  if (stop === "cards") return `Daily target of ${HUNTER_DAILY_CARD_TARGET} contact-ready cards filed.`;
  return `Capacity problem. Model-call budget of ${budget} ran out. Filed ${counts.filedToday} of ${HUNTER_DAILY_CARD_TARGET} contact-ready cards.`;
}

export async function runHunterBatch(): Promise<
  | { ok: true; skipped: "paused" | "cards" | "budget" | "busy"; callsToday: number; filedToday: number }
  | { ok: true; filed: number; contactReady: number; updated: number; callsToday: number; filedToday: number; slot: string }
  | { ok: false; error: string }
> {
  const redis = await getRedisClient();
  if (!redis) return { ok: false, error: "Redis is not configured" };
  const today = edmontonToday();
  const now = Date.now();
  const budget = hunterCallBudget();
  let state = await loadHunterState();
  if (state.lockedUntil > now) {
    const counts = countsForToday(state, today);
    await rememberRun({ run: "always-on", outcome: "skipped-busy", error: runNote() });
    return { ok: true, skipped: "busy", callsToday: counts.callsToday, filedToday: counts.filedToday };
  }
  if (state.paused) {
    state = { ...state, lastRunAt: new Date(now).toISOString(), lastRunResult: "Paused. No search." };
    await saveHunterState(state);
    const counts = countsForToday(state, today);
    await rememberRun({ run: "always-on", outcome: "skipped-paused", error: runNote() });
    return { ok: true, skipped: "paused", callsToday: counts.callsToday, filedToday: counts.filedToday };
  }
  const stop = hunterStop(state, today, budget);
  if (stop) {
    const counts = countsForToday(state, today);
    state = {
      ...state,
      capacity: stop === "budget" ? capacityOnBudgetStop(state, today, budget) : state.capacity,
      lastRunAt: new Date(now).toISOString(),
      lastRunResult: dayStopCopy(stop, state, today, budget),
    };
    await saveHunterState(state);
    await rememberRun({
      run: "always-on",
      outcome: stop === "cards" ? "skipped-target-met" : "capped-budget",
      error: runNote(),
    });
    return { ok: true, skipped: stop, callsToday: counts.callsToday, filedToday: counts.filedToday };
  }

  const counts = countsForToday(state, today);
  state = {
    ...state,
    lockedUntil: now + 270_000,
    callsOn: today,
    callsToday: counts.callsToday + 1,
    filedOn: today,
    filedToday: counts.filedToday,
  };
  await saveHunterState(state);

  const { slot } = slotAt(state.cursor);
  try {
    const loaded = await loadBook();
    if (loaded.storage !== "redis") {
      const settled = applyHunterWork(state, today, { calls: 0, contactReady: 0 }, budget);
      await saveHunterState({
        ...settled,
        lockedUntil: 0,
        lastRunAt: new Date().toISOString(),
        lastRunResult: "Redis is not configured.",
      });
      await rememberRun({ run: "always-on", outcome: "error", modelCalls: 1, error: runNote("Redis is not configured.") });
      return { ok: false, error: "Redis is not configured" };
    }

    const research = await researchHunterSlot(
      slot,
      loaded.book.companies.map((company) => company.domain),
    );
    if ("error" in research) {
      const settled = applyHunterWork(state, today, { calls: 0, contactReady: 0 }, budget);
      await saveHunterState({
        ...settled,
        lockedUntil: 0,
        lastRunAt: new Date().toISOString(),
        lastRunResult: research.error,
      });
      await rememberRun({ run: "always-on", outcome: "error", modelCalls: 1, error: runNote(research.error) });
      return { ok: false, error: research.error };
    }

    const drafts = selectHunterRows(research);
    const pages = await readPages(urlsForDrafts(drafts));
    const verified = verifyHunterDrafts(drafts, pages, { regionId: slot.regionId, today });
    const filed = fileHunterCards(loaded.book.companies, verified, { today });
    const apollo = await enrichUnderApolloCap({
      companies: filed.companies,
      domains: verified.map((card) => card.domain),
      today,
      limit: 8,
    });
    const contactReady = countContactReadyGain(loaded.book.companies, apollo.companies);
    await saveBook({ ...loaded.book, companies: apollo.companies });
    const settled = applyHunterWork(state, today, { calls: 0, contactReady }, budget);
    const fresh = await loadHunterState();
    await saveHunterState({
      ...settled,
      apolloOn: fresh.apolloOn,
      apolloReveals: fresh.apolloReveals,
      lockedUntil: 0,
      cursor: advanceCursor(state.cursor),
      lastRunAt: new Date().toISOString(),
      lastRunResult: `Contact-ready cards today ${settled.filedToday} of ${HUNTER_DAILY_CARD_TARGET}. This batch ${contactReady}. Updated ${filed.updated}. Slot: ${slot.signalLabel} in ${slot.regionLabel}. Model calls ${settled.callsToday} of ${budget}.`,
    });
    await rememberRun({
      run: "always-on",
      outcome: "fired",
      modelCalls: 1,
      candidates: drafts.length,
      cardsFiled: filed.filed,
      contactReady,
      apolloSearches: apollo.searches,
      apolloReveals: apollo.reveals,
      error: apollo.note,
    });
    return {
      ok: true,
      filed: filed.filed,
      contactReady,
      updated: filed.updated,
      callsToday: settled.callsToday,
      filedToday: settled.filedToday,
      slot: `${slot.signalLabel} / ${slot.regionLabel}`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Hunter batch failed";
    const settled = applyHunterWork(state, today, { calls: 0, contactReady: 0 }, budget);
    await saveHunterState({
      ...settled,
      lockedUntil: 0,
      lastRunAt: new Date().toISOString(),
      lastRunResult: message,
    });
    await rememberRun({ run: "always-on", outcome: "error", modelCalls: 1, error: runNote(message) });
    return { ok: false, error: message };
  }
}

/** Shared by both runs. A stop here means no model call. A budget stop is stored for Rex. */
export async function holdHunterForDay(): Promise<
  | { ok: true; proceed: true }
  | { ok: true; proceed: false; skipped: "paused" | "cards" | "budget" }
  | { ok: false; error: string }
> {
  const redis = await getRedisClient();
  if (!redis) return { ok: false, error: "Redis is not configured" };
  const today = edmontonToday();
  const budget = hunterCallBudget();
  let state = await loadHunterState();
  if (state.paused) {
    state = { ...state, lastRunAt: new Date().toISOString(), lastRunResult: "Paused. No search." };
    await saveHunterState(state);
    return { ok: true, proceed: false, skipped: "paused" };
  }
  const stop = hunterStop(state, today, budget);
  if (!stop) return { ok: true, proceed: true };
  state = {
    ...state,
    capacity: stop === "budget" ? capacityOnBudgetStop(state, today, budget) : state.capacity,
    lastRunAt: new Date().toISOString(),
    lastRunResult: dayStopCopy(stop, state, today, budget),
  };
  await saveHunterState(state);
  return { ok: true, proceed: false, skipped: stop };
}

/** Count a model call and any contact-ready cards it filed. Both runs use this. */
export async function recordHunterEffort(input: { calls: number; contactReady: number; note: string }) {
  const redis = await getRedisClient();
  if (!redis) return;
  const today = edmontonToday();
  const state = await loadHunterState();
  const settled = applyHunterWork(state, today, input, hunterCallBudget());
  await saveHunterState({
    ...settled,
    lastRunAt: new Date().toISOString(),
    lastRunResult: input.note,
  });
}

export async function readHunterDesk(today = edmontonToday()) {
  const redis = await getRedisClient();
  const state = redis ? parseHunterState(await redis.get<unknown>(HUNTER_KEY)) : freshHunterState();
  const counts = countsForToday(state, today);
  const recentRuns = redis ? await readHunterRuns(20) : [];
  return {
    storage: redis ? ("redis" as const) : ("browser" as const),
    paused: state.paused,
    lastRunAt: state.lastRunAt,
    lastRunResult: state.lastRunResult,
    filedToday: counts.filedToday,
    cardTarget: HUNTER_DAILY_CARD_TARGET,
    callsToday: counts.callsToday,
    callBudget: hunterCallBudget(),
    apolloRevealsToday: revealsOn(state, today),
    apolloCreditCap: apolloCreditCap(),
    capacity: state.capacity,
    capacityActive: state.capacity?.date === today,
    recentRuns,
    today,
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
