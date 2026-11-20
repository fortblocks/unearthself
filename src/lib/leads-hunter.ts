/**
 * Lead Hunter. Finds ideal customers for Unearth Self and files research cards.
 * It never sends mail.
 * A public name, title, or email is kept only when that exact text is on the fetched page.
 * Apollo may add one licensed contact when APOLLO_API_KEY is set. The key is never logged.
 */

import { HUNTER_DAILY_CARD_TARGET, HUNTER_REGIONS, HUNTER_SIGNALS, isPhaseOneCompany, regionWeightForPlace, searchRegionCycle } from "../data/hunter-profile.ts";
import { apolloApiKey, apolloCreditCap, enrichHunterContacts } from "./apollo.ts";
import { isClearBuyer, isStoredJudgment, judgeBuyerFit, type BuyerJudgment, type BuyerJudgmentInput, type FitRating } from "./buyer-judgment.ts";
import {
  applyHunterWork,
  assignEnrichment,
  countContactReadyGain,
  countsForToday,
  hunterStop,
} from "./hunter-cap.ts";
import { appendHunterRun, clearRunStarted, hunterRunEntry, logHunterRunLine, markRunStarted, readHunterRuns, readUnfinishedRun, type HunterRunOutcome } from "./hunter-runs.ts";
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
import {
  HUNTER_CARD_CEILING,
  HUNTER_ALARM_KEY,
  HUNTER_LINKEDIN_METHOD_ID,
  HUNTER_MODEL_ID,
  hunterCallsPerRun,
  hunterKilled,
  hunterMaxRetries,
  hunterMonthlyDollarCap,
  HUNTER_PASS_BUDGET_MS,
  HUNTER_RUN_DEADLINE_MS,
  HUNTER_PROMPT_DOMAIN_CHARS,
  hunterDailyFiledCap,
  hunterQualityFloor,
  hunterReviewDays,
  hunterTrialShare,
} from "./hunter-config.ts";
import { acquireHunterLock, releaseHunterLock } from "./hunter-lock.ts";
import {
  addDays,
  addDrop,
  alarmWebhookTargets,
  alarmsWithin,
  apolloCaslBasis,
  checkEmailMx,
  chooseSlotIndex,
  dailyFileRoom,
  deliverAlarmWebhooks,
  dncField,
  explorationTurn,
  filedThroughHour,
  apolloCounterKey,
  applyReviewExpiry,
  belowMedianAlarm,
  bookedThisMonth,
  BOOKING_LINK_HOOK,
  callCounterKey,
  countCall,
  cardDedupeKey,
  caslBasis,
  clearEmailWhenUnsolicited,
  dncBlocks,
  dncUpsertPlan,
  doNotContactKey,
  mergeHunterCompanies,
  isSeparateStudio,
  pageShowsMovedOn,
  successorOnPage,
  parseDncValue,
  emptyFunnel,
  findingMethods,
  heartbeatLate,
  isDuplicateCard,
  makeDncEntry,
  makeRunClock,
  makeLineage,
  methodStats,
  monthSpendFromCounts,
  monthlyCapLabel,
  monthlyCapState,
  noteModelSpend,
  capSpend,
  ticksToDollars,
  passesQualityFloor,
  quoteSnippet,
  reserveCounter,
  slotUsage,
  slotWeights,
  spendCounterKey,
  spendEstimateKey,
  spendTicksKey,
  zeroCandidateAlarm,
  type DncEntry,
  type DncReason,
  type HunterFunnel,
} from "./hunter-phase.ts";
import { edmontonClock, edmontonWhen, nightlySkip, withinWorkingHours } from "./hunter-time.ts";
import { searchWithRetries } from "./xai-search.ts";

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
  /** Edmonton date the Apollo reveal counter belongs to. */
  apolloOn: string;
  /** People-match calls sent today. Search does not count. */
  apolloReveals: number;
  /** Edmonton date the nightly sweep last ran. */
  nightlyOn: string;
  /** Cards filed before this Edmonton date are not auto-expired. Set on the first run of this code. */
  reviewEpoch: string;
};

export type ProfileHit = { id: string; label: string; sourceUrl: string; snippet?: string; fetchedOn?: string };

export type HunterBreak = { profile: number; access: number; timing: number; travel: number; total: number };

export type HunterSource = "web" | "public-linkedin";

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
  sourceKind?: HunterSource;
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
  hunterRegion: string;
  sourceKind?: HunterSource;
  hunterBreak: HunterBreak;
  hunterScore: number;
  query?: string;
  exploration?: boolean;
  /** Set before filing. "unavailable" means the judgement call failed and the card must not be filed. */
  buyerJudgment?: BuyerJudgment | "unavailable";
  fitRating?: FitRating;
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
    apolloOn: "",
    apolloReveals: 0,
    nightlyOn: "",
    reviewEpoch: "",
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
    apolloOn: typeof row.apolloOn === "string" ? row.apolloOn : "",
    apolloReveals: numberOrZero(row.apolloReveals),
    nightlyOn: typeof row.nightlyOn === "string" ? row.nightlyOn : "",
    reviewEpoch: typeof row.reviewEpoch === "string" ? row.reviewEpoch : "",
  };
}

function numberOrZero(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

export function hunterMayCall(state: HunterState, today: string, cardTarget = HUNTER_DAILY_CARD_TARGET) {
  if (state.paused) return false;
  return hunterStop(state, today, cardTarget) === null;
}

export type HunterSlot = {
  signalId: string;
  regionId: string;
  signalLabel: string;
  regionLabel: string;
  source: HunterSource;
};

function slotFor(signalId: string, signalLabel: string, regionId: string, source: HunterSource): HunterSlot | null {
  const region = HUNTER_REGIONS.find((item) => item.id === regionId);
  if (!region) return null;
  return {
    signalId,
    regionId: region.id,
    signalLabel,
    regionLabel: region.label,
    source,
  };
}

/** Canada first, then the United States, in the phase-one split. Other regions are not searched. */
export function hunterSlots(): HunterSlot[] {
  const cycle = searchRegionCycle();
  const slots: HunterSlot[] = [];
  for (const signal of HUNTER_SIGNALS) {
    for (const regionId of cycle) {
      const slot = slotFor(signal.id, signal.label, regionId, "web");
      if (slot) slots.push(slot);
    }
  }
  for (const regionId of cycle) {
    const slot = slotFor("public-linkedin", "Public LinkedIn post", regionId, "public-linkedin");
    if (slot) slots.push(slot);
  }
  return slots;
}

/** A public post URL. Profiles, login pages, and any other host are refused. */
export function isPublicLinkedInPost(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    if (host !== "linkedin.com" && !host.endsWith(".linkedin.com")) return false;
    const path = parsed.pathname.toLowerCase();
    if (path.startsWith("/in/") || path.startsWith("/login") || path.startsWith("/signup") || path.startsWith("/authwall")) return false;
    return path.includes("/posts/") || path.includes("/pulse/") || path.includes("/feed/update/");
  } catch {
    return false;
  }
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
  place?: string;
}): HunterBreak {
  const profile = profilePoints(input.hitIds);
  const access = hunterAccessPoints(input);
  const timing = timingFromSignals({
    signals: input.signals,
    lastTouch: input.lastTouch,
    today: input.today,
  }).timing;
  const travel = regionWeightForPlace(input.place ?? "", input.regionId);
  return { profile, access, timing, travel, total: profile + access + timing + travel };
}

function asRecord(row: unknown): Record<string, unknown> | null {
  if (!row || typeof row !== "object") return null;
  return row as Record<string, unknown>;
}

function citationsFrom(record: Record<string, unknown> | null) {
  if (!record || !Array.isArray(record.citations)) return [];
  return record.citations.filter((item): item is string => typeof item === "string");
}

function sourceUrlForRow(row: Record<string, unknown>, citations: string[]) {
  for (const key of ["sourceUrl", "url", "website"]) {
    const value = String(row[key] ?? "").trim();
    if (/^https?:\/\//i.test(value)) return value;
  }
  const domain = normalizeDomain(String(row.domain ?? ""));
  if (!domain) return "";
  return (
    citations.find((url) => {
      try {
        return normalizeDomain(new URL(url).hostname) === domain;
      } catch {
        return false;
      }
    }) ?? ""
  );
}

/** Keep every sourced company the model returned. Headcount is not a filter. Country is checked at filing. */
export function selectHunterRows(raw: unknown): HunterDraft[] {
  const record = asRecord(raw);
  const list = Array.isArray(raw) ? raw : Array.isArray(record?.companies) ? record.companies : [];
  const rows: HunterDraft[] = [];
  const seen = new Set<string>();
  for (const item of list) {
    const row = asRecord(item);
    if (!row) continue;
    const domain = normalizeDomain(String(row.domain ?? ""));
    const org = String(row.org ?? "").trim();
    if (!domain || seen.has(domain) || isSeparateStudio(domain, org)) continue;
    const sourceUrl = sourceUrlForRow(row, citationsFrom(record));
    if (!sourceUrl) continue;
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
      org,
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

function verifiedHits(draft: HunterDraft, pages: Record<string, string>, today: string): ProfileHit[] {
  const hits: ProfileHit[] = [];
  const seen = new Set<string>();
  for (const claimed of draft.profileSignals) {
    if (seen.has(claimed.id)) continue;
    const signal = HUNTER_SIGNALS.find((item) => item.id === claimed.id);
    if (!signal) continue;
    const page = pages[claimed.sourceUrl] ?? "";
    if (!page) continue;
    const term = signal.terms.find((item) => pageHas(page, item));
    if (!term) continue;
    seen.add(signal.id);
    hits.push({
      id: signal.id,
      label: signal.label,
      sourceUrl: claimed.sourceUrl,
      snippet: quoteSnippet(page, term),
      fetchedOn: today,
    });
  }
  return hits;
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
 * Place is recorded and scored. It never drops a company.
 */
export function verifyHunterDrafts(
  drafts: HunterDraft[],
  pages: Record<string, string>,
  opts: { regionId: string; today: string },
): HunterCard[] {
  const cards: HunterCard[] = [];
  for (const draft of drafts) {
    if (draft.sourceKind === "public-linkedin" && !isPublicLinkedInPost(draft.sourceUrl)) continue;
    const page = pages[draft.sourceUrl] ?? "";
    if (!page) continue;
    if (!pageHas(page, draft.org)) continue;
    if (!domainOnSource(draft.domain, draft.sourceUrl, page)) continue;
    const place = draft.place && pageHas(page, draft.place) ? draft.place : "";
    const city = place ? cityFromPlace(place) : "Elsewhere";
    const contactPageUrl = /^https?:\/\//i.test(draft.buyer.emailSource) ? draft.buyer.emailSource : "";
    const contactPage = contactPageUrl ? (pages[contactPageUrl] ?? "") : "";
    const movedOnContact = pageShowsMovedOn(contactPage, draft.buyer.name, draft.org);
    const movedOnCompany = pageShowsMovedOn(page, draft.buyer.name, draft.org);
    const movedOn = movedOnContact || movedOnCompany;
    let contact = contactPage && !movedOn
      ? contactIfPresent(contactPage, draft.buyer.name, draft.buyer.email, contactPageUrl)
      : { name: "", title: "", email: "", emailSource: "" };
    if (movedOn) {
      const rolePage = movedOnContact ? contactPage : page;
      const roleUrl = movedOnContact ? contactPageUrl : draft.sourceUrl;
      const successor = successorOnPage(rolePage, draft.buyer.name, draft.buyer.title, draft.org, draft.buyer.email);
      contact = successor
        ? contactIfPresent(rolePage, successor.name, successor.email, roleUrl)
        : { name: "", title: "", email: "", emailSource: "" };
    }
    if (draft.sourceKind === "public-linkedin" && contact.emailSource && !isPublicLinkedInPost(contact.emailSource)) {
      contact = { name: "", title: "", email: "", emailSource: "" };
    }
    const buyerName = usableName(contact.name);
    const titlePage = contact.emailSource ? (pages[contact.emailSource] ?? "") : contactPage;
    const buyerTitle = titleOnPage(titlePage || contactPage, draft.buyer.title, Boolean(buyerName));
    const hits = verifiedHits(draft, pages, opts.today);
    const signals = verifiedSignals(draft.signals, pages, `H-${cards.length + 1}`);
    const hunterBreak = scoreHunter({
      hitIds: hits.map((hit) => hit.id),
      buyerName,
      email: contact.email,
      emailSource: contact.emailSource,
      sourceUrl: draft.sourceUrl,
      signals,
      today: opts.today,
      regionId: opts.regionId,
      place,
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
      hunterRegion: opts.regionId,
      sourceKind: draft.sourceKind,
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
    hunterScore: card.hunterScore,
    hunterBreak: card.hunterBreak,
    review: "unreviewed",
    pipeline: "",
    filedOn: today,
    dedupeKey: cardDedupeKey(card.domain, card.email),
    contactLastSeenOn: card.email ? today : "",
    buyerJudgment: isStoredJudgment(card.buyerJudgment) ? card.buyerJudgment : undefined,
    fitRating: card.fitRating,
    lineage: makeLineage({
      query: card.query || card.hunterRegion,
      signals: card.profileHits.map((hit) => hit.id),
      sourceUrl: card.sourceUrl,
      cardId: id,
      exploration: card.exploration,
      method: card.sourceKind === "public-linkedin" ? HUNTER_LINKEDIN_METHOD_ID : undefined,
    }),
    facts: cardFacts(card, today),
  });
}

function cardFacts(card: HunterCard, today: string) {
  const facts = [
    ...card.profileHits
      .filter((hit) => hit.snippet)
      .map((hit) => ({ sourceUrl: hit.sourceUrl, fetchedOn: hit.fetchedOn || today, snippet: hit.snippet ?? "" })),
    ...card.signals
      .filter((signal) => signal.note.trim() || signal.date)
      .map((signal) => ({
        sourceUrl: signal.sourceUrl,
        fetchedOn: today,
        snippet: signal.note.trim() || `${signal.kind} ${signal.date}`,
      })),
  ];
  return facts.length ? facts : [{ sourceUrl: card.sourceUrl, fetchedOn: today, snippet: card.why.slice(0, 180) }];
}

/**
 * Same book as the nightly run. A known domain is updated. A new domain is a research card.
 * Existing nightly fields (why, buyer, batch, source) stay as they were.
 */
export function fileHunterCards(
  companies: Company[],
  cards: HunterCard[],
  opts: { today: string; dnc?: DncEntry[]; floor?: number; pages?: Record<string, string> },
): { companies: Company[]; filed: number; updated: number; contactReady: number; drops: HunterFunnel["drops"] } {
  const next = [...companies];
  let filed = 0;
  let updated = 0;
  const drops: HunterFunnel["drops"] = {};
  const floor = opts.floor ?? hunterQualityFloor();
  const noteDrop = (reason: keyof HunterFunnel["drops"] & string) => {
    drops[reason] = (drops[reason] ?? 0) + 1;
  };
  for (const card of cards) {
    const domain = normalizeDomain(card.domain);
    if (!domain) continue;
    if (dncBlocks(opts.dnc ?? [], domain, card.email, opts.today)) {
      noteDrop("do-not-contact");
      continue;
    }
    const index = next.findIndex((company) => company.domain === domain);
    if (index === -1 && isDuplicateCard(next, domain, card.email)) {
      noteDrop("duplicate");
      continue;
    }
    const inRegion = isPhaseOneCompany({
      place: card.place,
      city: card.city,
      page: opts.pages?.[card.sourceUrl],
    });
    if (!inRegion) {
      const stored = index === -1 ? null : next[index];
      const existingInRegion = stored ? isPhaseOneCompany({ place: stored.place, city: stored.city }) : false;
      if (!existingInRegion) {
        noteDrop("outOfRegion");
        continue;
      }
    }
    if (index === -1 && (card.profileHits.length === 0 || !passesQualityFloor(card.hunterScore, floor))) {
      noteDrop("below-quality-floor");
      continue;
    }
    const existingContact = index === -1 ? undefined : next[index];
    const writingContact = Boolean(card.buyerName.trim() || card.buyerTitle.trim()) && !existingContact?.buyerName.trim();
    if (writingContact) {
      const judgment = card.buyerJudgment;
      if (!isStoredJudgment(judgment)) {
        noteDrop("judgmentUnavailable");
        console.info(JSON.stringify({ hunter: "buyer-judgment", outcome: "judgmentUnavailable" }));
        continue;
      }
      if (!isClearBuyer(judgment)) {
        noteDrop("notBuyerJudged");
        console.info(JSON.stringify({ hunter: "buyer-judgment", outcome: "notBuyerJudged", reason: judgment.reason }));
        continue;
      }
      console.info(JSON.stringify({ hunter: "buyer-judgment", outcome: "buyer", confidence: judgment.confidence, reason: judgment.reason }));
    }
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
        buyerName: existing.buyerName.trim() ? existing.buyerName : card.buyerName,
        buyerTitle: existing.buyerTitle.trim() ? existing.buyerTitle : card.buyerTitle,
        buyerJudgment: existing.buyerName.trim()
          ? existing.buyerJudgment
          : isStoredJudgment(card.buyerJudgment)
            ? card.buyerJudgment
            : existing.buyerJudgment,
        fitRating: existing.buyerName.trim() ? existing.fitRating : card.fitRating ?? existing.fitRating,
        email: existing.email.trim() ? existing.email : card.email,
        emailSource: existing.emailSource.trim() ? existing.emailSource : card.emailSource,
        contactLastSeenOn:
          (existing.email.trim() ? existing.email : card.email) &&
          existing.email.trim().toLowerCase() === card.email.trim().toLowerCase()
            ? opts.today
            : existing.contactLastSeenOn,
        lineage: existing.lineage ?? makeLineage({
          query: card.query || card.hunterRegion,
          signals: profileHits.map((hit) => hit.id),
          sourceUrl: existing.sourceUrl || card.sourceUrl,
          cardId: existing.id,
          exploration: card.exploration,
        }),
      }),
      opts.today,
    );
    updated += 1;
  }
  return { companies: next, filed, updated, contactReady: countContactReadyGain(companies, next), drops };
}

export function domainsForPrompt(knownDomains: string[], maxChars = HUNTER_PROMPT_DOMAIN_CHARS) {
  const unique = [...new Set(knownDomains.map((domain) => normalizeDomain(domain)).filter(Boolean))];
  const listed: string[] = [];
  let size = 0;
  for (const domain of unique) {
    const next = size + domain.length + 2;
    if (listed.length > 0 && next > maxChars) break;
    listed.push(domain);
    size = next;
  }
  return listed.join(", ");
}

export function hunterPrompt(slot: HunterSlot, knownDomains: string[]) {
  const signal = HUNTER_SIGNALS.find((item) => item.id === slot.signalId);
  const skip = domainsForPrompt(knownDomains);
  const signalList = HUNTER_SIGNALS.map((item) => `${item.id}: ${item.search}`).join("\n");
  const sourceRule = slot.source === "public-linkedin"
    ? "Source: a public LinkedIn post only. sourceUrl must be an https://www.linkedin.com URL whose path contains /posts/, /pulse/, or /feed/update/. Do not use a profile URL, a login page, or a page that asks you to sign in. Do not log in. Keep a field only when its exact text is on that public post."
    : "Source: a public web page. Do not use a login page.";
  return `Find companies for Badlands Bootcamp at Unearth Self. One team of 6 to 24 people inside a company of any size. Any industry is allowed. A forward-thinking technology company is a strong lead. A small company is allowed. Return JSON only.

This batch: ${signal?.label ?? slot.signalLabel}.
${slot.regionId === "canada"
    ? "This batch is Canada. Return only a company headquartered in Canada."
    : "This batch is the United States. Return only a company headquartered in the United States."}
Phase one is Canada and the United States only. Do not return a company in Europe, Mexico, or any other country. Do not filter by headcount or industry.

${sourceRule}

Skip these domains: ${skip || "none"}.

Profile signals a page can show:
${signalList}

For each company include org, domain, place (city and country as printed on the page), industry, sizeBand only when a number is printed else "", sourceUrl, signals, profileSignals, and buyer.

signals are public dated events only: hiring, office, expansion, win, year-end. Each needs kind, date as YYYY-MM-DD, sourceUrl, and a short note copied from the page. Omit a signal when you do not have both a date and a page URL.

profileSignals is a list of { id, sourceUrl }. Use only the ids above. Include one only when that page shows the signal.

buyer.name, buyer.title, buyer.email, and buyer.emailSource: include a name, title, or email only when that exact text is published on buyer.emailSource. If you cannot point at the page, leave the buyer fields as empty strings. A blank buyer is still a company to return. Never guess an email. Never use a pattern such as first.last@. Never use a department name as a person.

Choose the contact by judging whether that person would buy a hotel spa team retreat in Drumheller, Alberta for their company. Reason from the company's size, industry, location, and how the team is set up, and from the person's role. There is no fixed list of job titles.

Do not invent a price, a date, a partner, a building, or a programme. Do not mention any company other than the one on the page.

Return at most 8 companies. Return a company when you have its name, domain, and a page URL, even if the buyer, the headcount, or a signal is blank. Use an empty companies array only when the search found no organisation.
{ "companies": [] }`;
}

export async function researchHunterSlot(
  slot: HunterSlot,
  knownDomains: string[],
): Promise<{ companies: unknown; citations?: string[]; excerpt?: string; searched?: boolean } | { error: string }> {
  const { callXaiWebSearch } = await import("./xai-search.ts");
  return callXaiWebSearch(
    "You research public web pages and return JSON. You never invent names, emails, dates, or companies. Every claim needs a source URL. This search is only for Unearth Self.",
    hunterPrompt(slot, knownDomains),
    90000,
  );
}

async function readPublishedPage(url: string, timeoutMs = 6000): Promise<import("./hunter-phase.ts").PageRead> {
  if (!/^https?:\/\//i.test(url)) return { text: "", reason: "fetch-failed" };
  const timeout = Math.max(500, Math.min(6000, timeoutMs));
  let last: import("./hunter-phase.ts").PageRead = { text: "", reason: "fetch-failed" };
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "user-agent": "UnearthSelfLeadHunter/1.0" },
        signal: AbortSignal.timeout(timeout),
        redirect: "follow",
      });
      const body = response.ok || response.status === 200 ? await response.text() : "";
      const { classifyPageResponse } = await import("./hunter-phase.ts");
      last = classifyPageResponse(response.status, body, false);
      if (last.reason === "ok" || last.reason === "blocked" || last.reason === "page-empty") return last;
    } catch (error) {
      const timedOut = error instanceof Error && (error.name === "TimeoutError" || /timeout/i.test(error.message));
      last = { text: "", reason: timedOut ? "timed-out" : "fetch-failed" };
    }
  }
  return last;
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

export async function readPages(urls: string[], timeLeft?: () => number) {
  const pages: Record<string, import("./hunter-phase.ts").PageRead> = {};
  if (timeLeft && timeLeft() < 1_000) return pages;
  let cursor = 0;
  async function worker() {
    while (cursor < urls.length) {
      if (timeLeft && timeLeft() < 1_000) return;
      const url = urls[cursor];
      cursor += 1;
      if (!url) continue;
      const timeout = timeLeft ? timeLeft() : 6000;
      if (timeout < 500) return;
      pages[url] = await readPublishedPage(url, timeout);
    }
  }
  await Promise.all(Array.from({ length: Math.min(5, urls.length) }, () => worker()));
  return pages;
}

export function draftDropReason(
  draft: HunterDraft,
  page: string,
  _regionId: string,
  fetchReason?: import("./hunter-phase.ts").PageRead["reason"],
  source?: HunterSource,
): import("./hunter-phase.ts").DropReason | null {
  if ((source ?? draft.sourceKind) === "public-linkedin" && !isPublicLinkedInPost(draft.sourceUrl)) return "unverified";
  if (!page) {
    if (fetchReason === "blocked" || fetchReason === "timed-out" || fetchReason === "fetch-failed") return fetchReason;
    return "page-empty";
  }
  if (!pageHas(page, draft.org)) return "name-missing";
  if (!domainOnSource(draft.domain, draft.sourceUrl, page)) return "domain-mismatch";
  return null;
}

export async function loadHunterState(): Promise<HunterState> {
  const redis = await getRedisClient();
  if (!redis) return freshHunterState();
  return parseHunterState(await redis.get<unknown>(HUNTER_KEY));
}

async function saveHunterState(state: HunterState) {
  const redis = await getRedisClient();
  if (!redis) throw new Error("Redis is not configured");
  await redis.set(HUNTER_KEY, state);
}

let mxLookupOverride: ((host: string) => Promise<{ exchange?: string }[]>) | null = null;

export function useMxLookupForTests(lookup: ((host: string) => Promise<{ exchange?: string }[]>) | null) {
  mxLookupOverride = lookup;
}

async function lookupMx(host: string) {
  if (mxLookupOverride) return mxLookupOverride(host);
  const { promises } = await import("node:dns");
  return promises.resolveMx(host);
}

async function settleApolloCompany(company: Company, dnc: DncEntry[], today: string): Promise<Company> {
  if (company.contactSource !== "Apollo" || !company.email) return company;
  if (dncBlocks(dnc, company.domain, company.email, today)) {
    return { ...company, email: "", emailSource: "", cardFlags: [...(company.cardFlags ?? []), "Do not contact"] };
  }
  const mx = await checkEmailMx(company.email, lookupMx);
  if (mx === "no") {
    return { ...company, email: "", emailSource: "", emailMx: false, caslStatus: undefined, casl: undefined };
  }
  const pulledOn = company.contactRetrievedOn || today;
  return {
    ...company,
    emailSource: "Apollo",
    emailMx: mx === "yes",
    caslStatus: "recorded",
    casl: apolloCaslBasis(pulledOn),
  };
}

function revealsOn(state: HunterState, today: string) {
  return state.apolloOn === today ? state.apolloReveals : 0;
}

function runNote(extra = "") {
  const off = apolloApiKey() ? "" : "Apollo off: no key";
  return [extra.trim(), off].filter(Boolean).join(" ");
}

async function rememberRun(input: Parameters<typeof hunterRunEntry>[0]) {
  await appendHunterRun(hunterRunEntry(input));
}

type HunterRedis = {
  get: <T>(key: string) => Promise<T | null>;
  set: (key: string, value: unknown, opts?: { nx?: true; ex?: number }) => Promise<string | null>;
  del?: (key: string) => Promise<unknown>;
  incr: (key: string) => Promise<number>;
  decr: (key: string) => Promise<number>;
  incrby: (key: string, amount: number) => Promise<number>;
  expire: (key: string, seconds: number) => Promise<unknown>;
  eval: (script: string, keys: string[], args: string[]) => Promise<unknown>;
  hset?: (key: string, field: string | Record<string, string>, value?: string) => Promise<unknown>;
  hgetall?: (key: string) => Promise<Record<string, unknown> | null>;
  lpush?: (key: string, value: string) => Promise<unknown>;
  ltrim?: (key: string, start: number, stop: number) => Promise<unknown>;
  lrange?: (key: string, start: number, stop: number) => Promise<unknown[]>;
};

export async function loadDoNotContact(redis: HunterRedis): Promise<DncEntry[]> {
  if (redis.hgetall) {
    try {
      const hash = await redis.hgetall(doNotContactKey());
      if (hash && typeof hash === "object" && !Array.isArray(hash) && Object.keys(hash).length > 0) {
        return Object.values(hash).flatMap((value) => {
          const entry = parseDncValue(value);
          return entry ? [entry] : [];
        });
      }
    } catch {
      // An older list is a string key. Fall through and read it.
    }
  }
  const raw = await redis.get<unknown>(doNotContactKey());
  const list = Array.isArray(raw) ? raw : [];
  return list.flatMap((row) => {
    const entry = parseDncValue(row);
    return entry?.until ? [entry] : [];
  });
}

async function seedCounter(redis: HunterRedis, key: string, atLeast: number) {
  await redis.set(key, String(Math.max(0, atLeast)), { nx: true, ex: 864000 });
  const current = Number(await redis.get<string>(key));
  return Number.isFinite(current) ? current : atLeast;
}

export async function appendDoNotContact(input: {
  domain: string;
  email?: string;
  reason: DncReason;
  today: string;
}) {
  const redis = await getRedisClient();
  if (!redis) throw new Error("Redis is not configured");
  const client = redis as HunterRedis;
  const next = makeDncEntry(input);
  const entries = await loadDoNotContact(client);
  const writes = dncUpsertPlan(entries, next, input.today);
  if (writes.length === 0) return entries;
  if (client.hset) {
    const legacy = await client.get<unknown>(doNotContactKey());
    if (Array.isArray(legacy)) {
      await client.del?.(doNotContactKey());
      for (const row of entries) await client.hset(doNotContactKey(), { [dncField(row)]: JSON.stringify(row) });
    }
    for (const row of writes) await client.hset(doNotContactKey(), { [dncField(row)]: JSON.stringify(row) });
    return loadDoNotContact(client);
  }
  const byField = new Map(entries.map((row) => [dncField(row), row]));
  for (const row of writes) byField.set(dncField(row), row);
  const saved = [...byField.values()];
  await client.set(doNotContactKey(), saved);
  return saved;
}

export async function enrichUnderApolloCap(input: {
  companies: Company[];
  domains: string[];
  today: string;
  limit: number;
  timeLeft?: () => number;
}) {
  const state = await loadHunterState();
  const redis = await getRedisClient();
  const client = redis as HunterRedis | null;
  const cap = apolloCreditCap();
  const dnc = client ? await loadDoNotContact(client) : [];
  const seeded = client ? await seedCounter(client, apolloCounterKey(input.today), revealsOn(state, input.today)) : revealsOn(state, input.today);
  const result = await enrichHunterContacts({
    companies: input.companies,
    domains: input.domains,
    today: input.today,
    revealsUsed: seeded,
    cap,
    apiKey: apolloApiKey(),
    limit: input.limit,
    reserveReveal: client
      ? async () => (await reserveCounter(client, apolloCounterKey(input.today), cap)).allowed
      : undefined,
    skip: (company) => dncBlocks(dnc, company.domain, company.email, input.today),
    timeLeft: input.timeLeft,
    judgeContact: async (contact) => {
      const left = input.timeLeft ? input.timeLeft() : 20_000;
      if (left < 1_000) return { ok: false };
      const result = await judgeBuyerFit(contact, { timeoutMs: Math.min(20_000, left) });
      return result.ok ? { ok: true, judgment: result.judgment, fit: result.fit ?? null } : { ok: false };
    },
  });
  result.companies = await Promise.all(
    result.companies.map((company) => {
      if (input.timeLeft && input.timeLeft() < 1_000) return company;
      return settleApolloCompany(company, dnc, input.today);
    }),
  );
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

function huntQuery(slot: HunterSlot, explore: boolean) {
  const signal = HUNTER_SIGNALS.find((item) => item.id === slot.signalId);
  return `${slot.signalId}|${slot.regionId}|${signal?.search ?? slot.signalLabel}${explore ? "|explore" : ""}`;
}

export async function persistCompanies(start: Company[], hunter: Company[]) {
  const fresh = await loadBook();
  const merged = mergeHunterCompanies(start, hunter, fresh.book.companies);
  if (fresh.storage === "redis") await saveBook({ ...fresh.book, companies: merged });
  return merged;
}

async function keepRunFlags(state: HunterState) {
  const fresh = await loadHunterState();
  return {
    ...state,
    paused: fresh.paused,
    nightlyOn: fresh.nightlyOn || state.nightlyOn,
    reviewEpoch: state.reviewEpoch || fresh.reviewEpoch,
  };
}

async function publishAlarms(redis: HunterRedis, alarms: string[], at: string, run: string, timeoutFor?: () => number) {
  if (!alarms.length || !redis.lpush) return { failed: false };
  for (const text of alarms) await redis.lpush(HUNTER_ALARM_KEY, JSON.stringify({ at, text, run }));
  await redis.ltrim?.(HUNTER_ALARM_KEY, 0, 400);
  const targets = alarmWebhookTargets();
  if (!targets.length) return { failed: false };
  const state = await loadHunterState();
  const counts = countsForToday(state, edmontonClock(new Date(at)).date);
  const lastResult = /https?:\/\//i.test(state.lastRunResult) ? "" : state.lastRunResult;
  const posts = await deliverAlarmWebhooks({
    targets,
    authorization: process.env.HUNTER_ALARM_WEBHOOK_KEY,
    timeoutFor,
    body: JSON.stringify({
      what: alarms,
      when: edmontonWhen(new Date(at)),
      run,
      state: {
        paused: state.paused,
        killed: hunterKilled(),
        callsToday: counts.callsToday,
        contactReadyToday: counts.filedToday,
        lastResult,
      },
    }),
  });
  return { failed: posts.some((post) => !post.ok) };
}

async function readMonthSpend(redis: HunterRedis, month: string) {
  const cents = Number(await redis.get<string>(spendCounterKey(month)));
  const ticks = Number(await redis.get<string>(spendTicksKey(month)));
  const estimate = Number(await redis.get<string>(spendEstimateKey(month)));
  return monthSpendFromCounts(Number.isFinite(cents) ? cents : 0, Number.isFinite(ticks) ? ticks : 0, Number.isFinite(estimate) ? estimate : 0);
}

export async function publishHunterAlarms(alarms: string[], at: string, run: string) {
  const redis = (await getRedisClient()) as HunterRedis | null;
  if (!redis) return;
  await publishAlarms(redis, alarms, at, run);
}

function dayStopCopy() {
  return `Daily ceiling of ${HUNTER_CARD_CEILING} contact-ready cards filed.`;
}

export async function runHunterBatch(now = new Date(), hooks?: { clock?: () => number }): Promise<
  | { ok: true; skipped: "paused" | "cards" | "busy" | "killed" | "hours"; callsToday: number; filedToday: number }
  | { ok: true; filed: number; contactReady: number; updated: number; callsToday: number; filedToday: number; slot: string }
  | { ok: false; error: string }
> {
  const redis = (await getRedisClient()) as HunterRedis | null;
  if (!redis) return { ok: false, error: "Redis is not configured" };
  const today = edmontonToday(now);
  let state = await loadHunterState();
  const counts = countsForToday(state, today);
  const blank = {
    run: "always-on" as const,
    modelCalls: 0,
    candidates: 0,
    cardsFiled: 0,
    contactReady: 0,
    apolloSearches: 0,
    apolloReveals: 0,
    error: "",
    model: HUNTER_MODEL_ID,
  };
  const startedAtSkip = now.toISOString();
  const skipId = crypto.randomUUID();
  const logSkip = (outcome: string, calls = counts.callsToday) => {
    logHunterRunLine({
      runId: skipId,
      run: "always-on",
      startedAt: startedAtSkip,
      endedAt: new Date().toISOString(),
      passes: 0,
      calls,
      funnel: null,
      cardsFiled: counts.filedToday,
      spendActual: 0,
      spendEstimated: 0,
      alarms: [],
      outcome,
    });
  };
  if (hunterKilled()) {
    await rememberRun({ ...blank, outcome: "skipped-killed", error: runNote("Kill switch is on.") });
    logSkip("skipped-killed");
    return { ok: true, skipped: "killed", callsToday: counts.callsToday, filedToday: counts.filedToday };
  }
  if (!withinWorkingHours(now)) {
    await rememberRun({ ...blank, outcome: "skipped-hours", error: runNote() });
    logSkip("skipped-hours");
    return { ok: true, skipped: "hours", callsToday: counts.callsToday, filedToday: counts.filedToday };
  }
  if (state.paused) {
    state = { ...state, lastRunAt: now.toISOString(), lastRunResult: "Paused. No search." };
    await saveHunterState(state);
    await rememberRun({ ...blank, outcome: "skipped-paused", error: runNote() });
    logSkip("skipped-paused");
    return { ok: true, skipped: "paused", callsToday: counts.callsToday, filedToday: counts.filedToday };
  }
  const callsUsed = await seedCounter(redis, callCounterKey(today), counts.callsToday);
  state = { ...state, callsOn: today, callsToday: callsUsed, filedOn: today, filedToday: counts.filedToday };
  const stop = hunterStop(state, today);
  if (stop) {
    state = {
      ...state,
      lastRunAt: now.toISOString(),
      lastRunResult: dayStopCopy(),
    };
    await saveHunterState(state);
    await rememberRun({
      ...blank,
      outcome: "skipped-target-met",
      error: runNote(),
    });
    logSkip("skipped-target-met", callsUsed);
    return { ok: true, skipped: stop, callsToday: callsUsed, filedToday: counts.filedToday };
  }

  const token = crypto.randomUUID();
  const gotLock = await acquireHunterLock(redis, token);
  if (!gotLock) {
    await rememberRun({ ...blank, outcome: "skipped-busy", error: runNote() });
    logSkip("skipped-busy", callsUsed);
    return { ok: true, skipped: "busy", callsToday: callsUsed, filedToday: counts.filedToday };
  }

  try {
    const loaded = await loadBook();
    if (loaded.storage !== "redis") {
      await saveHunterState({
        ...state,
        lockedUntil: 0,
        lastRunAt: now.toISOString(),
        lastRunResult: "Redis is not configured.",
      });
      await rememberRun({ ...blank, outcome: "error", error: runNote("Redis is not configured.") });
      return { ok: false, error: "Redis is not configured" };
    }

    if (!state.reviewEpoch) state = { ...state, reviewEpoch: today };
    const expired = applyReviewExpiry(loaded.book.companies, today, hunterReviewDays(), state.reviewEpoch);
    let companies = expired.companies;
    const known = new Set(companies.map((company) => normalizeDomain(company.domain)));
    const clock = hooks?.clock ?? Date.now;
    const runClock = makeRunClock(clock);
    const startedAt = now.toISOString();
    const funnel = emptyFunnel();
    const held: string[] = [];
    let cursor = state.cursor;
    let slotLabel = "";
    let lastError = "";
    let abandoned = false;
    let xaiFailed = false;
    let timedOut = false;
    let stopReason: "" | "spend" = "";
    let inputTokens = 0;
    let outputTokens = 0;
    let actualDollars = 0;
    let estimatedDollars = 0;
    let passesRun = 0;
    const dnc = await loadDoNotContact(redis);
    const passes = hunterCallsPerRun();
    const retries = hunterMaxRetries();
    const month = today.slice(0, 7);
    const unfinished = await readUnfinishedRun();
    const priorAlarms: string[] = [];
    if (unfinished && unfinished.id !== token) {
      priorAlarms.push("A previous run started and never finished.");
      await clearRunStarted(unfinished.id);
    }
    await markRunStarted("always-on", token, startedAt);

    for (let pass = 0; pass < passes; pass += 1) {
      const elapsed = runClock.elapsed();
      if (elapsed >= HUNTER_RUN_DEADLINE_MS) {
        timedOut = true;
        break;
      }
      if (pass > 0 && elapsed >= HUNTER_PASS_BUDGET_MS) break;
      const live = await loadHunterState();
      if (live.paused) {
        state = { ...state, paused: true };
        break;
      }
      if (hunterStop(state, today)) break;
      if (companies.filter((company) => company.filedOn === today).length >= hunterDailyFiledCap()) break;
      const spent = await readMonthSpend(redis, month);
      if (monthlyCapState(capSpend(spent)) === "stop") {
        stopReason = "spend";
        lastError = "Monthly dollar cap reached.";
        break;
      }
      const explore = explorationTurn(cursor, hunterTrialShare());
      const slotIndex = chooseSlotIndex({
        cursor,
        slots: hunterSlots(),
        usage: slotUsage(companies),
        weights: slotWeights(companies),
        explore,
      });
      const picked = slotAt(slotIndex);
      const query = huntQuery(picked.slot, explore);
      slotLabel = `${picked.slot.signalLabel} / ${picked.slot.regionLabel}${explore ? " / explore" : ""}`;
      const research = await searchWithRetries({
        system:
          "You research public web pages and return JSON. You never invent names, emails, dates, or companies. Every claim needs a source URL. This search is only for Unearth Self.",
        prompt: hunterPrompt(picked.slot, [...known]),
        timeoutMs: 90_000,
        maxRetries: retries,
        beforeAttempt: async () => {
          if (runClock.out()) return { allowed: false, reason: "time" as const };
          const used = await countCall(redis, callCounterKey(today));
          state = { ...state, callsOn: today, callsToday: used };
          return { allowed: true };
        },
        timeoutForAttempt: () => runClock.clip(90_000),
      });
      if ("error" in research) {
        if (research.timedOut) {
          timedOut = true;
          lastError = "Stopped for time.";
          break;
        }
        lastError = research.error;
        xaiFailed = true;
        abandoned = Boolean(research.abandoned);
        if (abandoned) break;
        continue;
      }
      passesRun += 1;
      cursor = advanceCursor(cursor);
      inputTokens += research.usage.inputTokens;
      outputTokens += research.usage.outputTokens;
      const noted = await noteModelSpend(redis, month, research.usage.dollars);
      if (research.usage.dollars == null) estimatedDollars += ticksToDollars(noted.estimatedTicks);
      else actualDollars += research.usage.dollars;
      const drafts = selectHunterRows(research).map((draft) => ({ ...draft, sourceKind: picked.slot.source })).filter((draft) => {
        if (!known.has(normalizeDomain(draft.domain))) return true;
        addDrop(funnel, "duplicate");
        return false;
      });
      funnel.searched += 1;
      funnel.candidates += drafts.length;
      if (runClock.out()) {
        timedOut = true;
        break;
      }
      const fetched = await readPages(urlsForDrafts(drafts), () => runClock.clip(6_000));
      const pages: Record<string, string> = {};
      for (const [url, page] of Object.entries(fetched)) pages[url] = page.text;
      const kept = drafts.filter((draft) => {
        const page = fetched[draft.sourceUrl] ?? { text: "", reason: "fetch-failed" as const };
        const reason = draftDropReason(draft, page.text, picked.slot.regionId, page.reason, picked.slot.source);
        if (!reason) return true;
        addDrop(funnel, reason);
        if (reason === "fetch-failed" || reason === "blocked" || reason === "timed-out") held.push(`${draft.org} (${reason})`);
        return false;
      });
      const verified = verifyHunterDrafts(kept, pages, { regionId: picked.slot.regionId, today });
      const ready: HunterCard[] = [];
      const mxYes = new Set<string>();
      for (const card of verified) {
        const stamped = { ...card, query, exploration: explore };
        if (stamped.email) {
          if (runClock.out()) {
            timedOut = true;
            ready.push(stamped);
            break;
          }
          const mx = await checkEmailMx(stamped.email, lookupMx);
          if (mx === "yes") mxYes.add(normalizeDomain(stamped.domain));
          if (mx === "no") {
            addDrop(funnel, "no-mx");
            ready.push({ ...stamped, email: "", emailSource: "" });
            continue;
          }
        }
        ready.push(stamped);
      }
      const limited = ready.slice(0, dailyFileRoom(companies.filter((company) => company.filedOn === today).length));
      funnel.verified += limited.length;
      funnel.contactFound += limited.filter((card) => card.email).length;
      const judged = await attachBuyerJudgments(limited, () => runClock.clip(20_000), async (usage) => {
        inputTokens += usage.inputTokens;
        outputTokens += usage.outputTokens;
        if (usage.dollars == null) return;
        actualDollars += usage.dollars;
      });
      const filed = fileHunterCards(companies, judged, { today, dnc, pages });
      companies = filed.companies.map((company) => {
        const stamped = stampCard(company, limited, pages, today);
        return mxYes.has(company.domain) ? { ...stamped, emailMx: true } : stamped;
      });
      for (const [reason, count] of Object.entries(filed.drops)) {
        for (let n = 0; n < count; n += 1) addDrop(funnel, reason as "duplicate");
      }
      funnel.filed += filed.filed;
      for (const card of limited) known.add(normalizeDomain(card.domain));
      const gain = countContactReadyGain(loaded.book.companies, companies);
      state = { ...state, cursor, filedOn: today, filedToday: counts.filedToday + gain, lockedUntil: 0 };
      companies = await persistCompanies(loaded.book.companies, companies);
      state = await keepRunFlags(state);
      await saveHunterState(state);
    }

    const apollo = timedOut
      ? { companies, searches: 0, reveals: 0, verifiedEmails: 0, failures: { timeout: 1 }, note: "Stopped for time.", failed: false, timedOut: true }
      : await enrichUnderApolloCap({
          companies,
          domains: companies.filter((company) => company.filedOn === today).map((company) => company.domain),
          today,
          limit: 8,
          timeLeft: () => runClock.clip(20_000),
        });
    if (apollo.timedOut) timedOut = true;
    companies = apollo.companies;
    const contactReady = countContactReadyGain(loaded.book.companies, companies);
    companies = await persistCompanies(loaded.book.companies, companies);
    const settled = applyHunterWork(
      { ...state, callsOn: today, callsToday: callsUsed, filedOn: today, filedToday: counts.filedToday },
      today,
      { calls: Math.max(0, state.callsToday - callsUsed), contactReady },
    );
    const history = await readHunterRuns(400);
    const hour = edmontonClock(now).hour;
    const previous: number[] = [];
    for (let offset = 1; offset <= 7; offset += 1) {
      const day = addDays(today, -offset);
      const value = filedThroughHour(history, day, hour, (at) => edmontonClock(new Date(at)));
      if (value != null) previous.push(value);
    }
    const todaySoFar = (filedThroughHour(history, today, hour, (at) => edmontonClock(new Date(at))) ?? 0) + funnel.filed;
    const alarms: string[] = [...priorAlarms];
    const quietStop = stopReason !== "" && funnel.searched === 0;
    if (xaiFailed) alarms.push("xAI search failed.");
    if (apollo.failed) alarms.push("Apollo request failed.");
    if (timedOut) alarms.push("Stopped early for time.");
    if (zeroCandidateAlarm(funnel.candidates, abandoned || quietStop || xaiFailed || timedOut)) alarms.push("Zero candidates this run.");
    if (belowMedianAlarm(todaySoFar, previous)) {
      alarms.push("Filed cards are under half the 7-day median at this time of day.");
    }
    if (expired.expired > 0) alarms.push(`${expired.expired} cards expired unreviewed.`);
    if (stopReason === "spend") alarms.push("Monthly dollar cap reached. Calling resumes next month.");
    const note = [
      slotLabel,
      `Contact-ready cards today ${settled.filedToday} of ${HUNTER_CARD_CEILING}.`,
      held.length ? `Held unverified: ${held.slice(0, 8).join(", ")}.` : "",
      apollo.note,
      lastError,
    ]
      .filter(Boolean)
      .join(" ");
    await saveHunterState(await keepRunFlags({
      ...settled,
      cursor,
      lockedUntil: 0,
      lastRunAt: now.toISOString(),
      lastRunResult: note,
      apolloOn: today,
      apolloReveals: revealsOn(state, today) + apollo.reveals,
      reviewEpoch: state.reviewEpoch,
    }));
    const delivery = await publishAlarms(redis, alarms, now.toISOString(), "always-on", () => runClock.clipWall(8_000));
    if (delivery.failed) alarms.push("Alarm post failed.");
    const outcome = timedOut
      ? "stopped-time"
      : abandoned || xaiFailed
        ? "error"
        : stopReason === "spend"
          ? "capped-spend"
          : "fired";
    await rememberRun({
      run: "always-on",
      outcome,
      modelCalls: Math.max(0, state.callsToday - callsUsed),
      candidates: funnel.candidates,
      cardsFiled: funnel.filed,
      contactReady,
      apolloSearches: apollo.searches,
      apolloReveals: apollo.reveals,
      error: runNote([lastError, alarms.join(" ")].filter(Boolean).join(" ")),
      model: HUNTER_MODEL_ID,
      alarms,
      inputTokens,
      outputTokens,
      dollars: actualDollars > 0 ? actualDollars : null,
      estimatedDollars,
      funnel,
    });
    logHunterRunLine({
      runId: token,
      run: "always-on",
      startedAt,
      endedAt: new Date().toISOString(),
      passes: passesRun,
      calls: Math.max(0, state.callsToday - callsUsed),
      funnel,
      cardsFiled: funnel.filed,
      spendActual: actualDollars,
      spendEstimated: estimatedDollars,
      alarms,
      outcome,
      apollo: {
        searches: apollo.searches,
        reveals: apollo.reveals,
        verifiedEmails: apollo.verifiedEmails,
        contactReady,
        failures: apollo.failures,
      },
    });
    if (abandoned && lastError) return { ok: false, error: lastError };
    return {
      ok: true,
      filed: funnel.filed,
      contactReady,
      updated: 0,
      callsToday: settled.callsToday,
      filedToday: settled.filedToday,
      slot: slotLabel,
    };
  } catch (error) {
    const message = publicFailure(error);
    const settled = applyHunterWork(
      { ...state, callsOn: today, callsToday: callsUsed, filedToday: counts.filedToday, filedOn: today },
      today,
      { calls: Math.max(0, state.callsToday - callsUsed), contactReady: 0 },
    );
    await saveHunterState(await keepRunFlags({
      ...settled,
      lockedUntil: 0,
      lastRunAt: now.toISOString(),
      lastRunResult: message,
      reviewEpoch: state.reviewEpoch,
    }));
    const crashAlarms = ["Hunter run crashed."];
    await publishAlarms(redis, crashAlarms, now.toISOString(), "always-on");
    await rememberRun({ ...blank, outcome: "error", modelCalls: Math.max(0, state.callsToday - callsUsed), error: runNote(message), alarms: crashAlarms });
    logHunterRunLine({
      runId: token,
      run: "always-on",
      startedAt: now.toISOString(),
      endedAt: new Date().toISOString(),
      passes: 0,
      calls: Math.max(0, state.callsToday - callsUsed),
      funnel: null,
      cardsFiled: 0,
      spendActual: 0,
      spendEstimated: 0,
      alarms: crashAlarms,
      outcome: "error",
    });
    return { ok: false, error: message };
  } finally {
    await clearRunStarted(token);
    await releaseHunterLock(redis, token);
  }
}

function judgmentInput(card: HunterCard): BuyerJudgmentInput {
  return {
    org: card.org,
    domain: card.domain,
    place: card.place,
    city: card.city,
    industry: card.industry,
    sizeBand: card.sizeBand,
    signals: [...card.profileHits.map((hit) => hit.label), ...card.signals.map((signal) => signal.kind)].filter(Boolean).join(", "),
    role: card.buyerTitle,
  };
}

/** Judge a named contact before filing. A card with no name and no title stays a research card. */
async function attachBuyerJudgments(
  cards: HunterCard[],
  timeoutFor: () => number,
  noteUsage: (usage: { inputTokens: number; outputTokens: number; dollars: number | null }) => Promise<void>,
): Promise<HunterCard[]> {
  const next: HunterCard[] = [];
  for (const card of cards) {
    if (!card.buyerName.trim() && !card.buyerTitle.trim()) {
      next.push(card);
      continue;
    }
    const timeoutMs = timeoutFor();
    if (timeoutMs < 1_000) {
      next.push({ ...card, buyerJudgment: "unavailable" });
      continue;
    }
    const result = await judgeBuyerFit(judgmentInput(card), { timeoutMs });
    await noteUsage(result.usage);
    next.push(
      result.ok
        ? { ...card, buyerJudgment: result.judgment, ...(result.fit ? { fitRating: result.fit } : {}) }
        : { ...card, buyerJudgment: "unavailable" },
    );
  }
  return next;
}

function publicFailure(error: unknown) {
  const message = error instanceof Error ? error.message : "Hunter batch failed";
  const cleaned = message.replace(/https?:\/\/\S+/gi, "").replace(/\s+/g, " ").trim();
  return cleaned.slice(0, 180) || "Hunter batch failed";
}

export function stampCard(company: Company, ready: HunterCard[], pages: Record<string, string>, today: string): Company {
  const card = ready.find((row) => normalizeDomain(row.domain) === company.domain && company.filedOn === today);
  if (!card || company.casl || company.contactSource === "Apollo" || company.emailSource === "Apollo") return company;
  const page = pages[card.emailSource] || pages[card.sourceUrl] || "";
  const basis = caslBasis(page, card.email, card.buyerTitle, card.emailSource || card.sourceUrl);
  const held = clearEmailWhenUnsolicited(company, page);
  const snippet = quoteSnippet(page, card.org) || company.facts?.[0]?.snippet || "";
  return {
    ...held,
    emailMx: company.emailMx,
    caslStatus: basis ? "recorded" : company.caslStatus,
    casl: basis
      ? {
          publishedOn: basis.publishedOn,
          roleFit: company.buyerJudgment ? isClearBuyer(company.buyerJudgment) : basis.roleFit,
          noUnsolicitedNotice: basis.noUnsolicitedNotice,
        }
      : company.casl,
    facts: company.facts?.length
      ? company.facts
      : snippet
        ? [{ sourceUrl: card.emailSource || card.sourceUrl, fetchedOn: today, snippet }]
        : company.facts,
  };
}

function filedOnDay(runs: { at: string; cardsFiled: number }[], today: string) {
  let total = 0;
  let seen = false;
  for (const run of runs) {
    const day = edmontonToday(new Date(run.at));
    if (day !== today) continue;
    seen = true;
    total += run.cardsFiled;
  }
  return seen ? total : null;
}

function filedOnPreviousDays(runs: { at: string; cardsFiled: number }[], today: string) {
  const totals = new Map<string, number>();
  for (const run of runs) {
    const day = edmontonToday(new Date(run.at));
    totals.set(day, (totals.get(day) ?? 0) + run.cardsFiled);
  }
  const previous: number[] = [];
  for (let offset = 1; offset <= 7; offset += 1) {
    const day = addDays(today, -offset);
    if (totals.has(day)) previous.push(totals.get(day) ?? 0);
  }
  return previous;
}

/** Shared by both runs. A stop here means no model call. */
export async function holdHunterForDay(): Promise<
  | { ok: true; proceed: true }
  | { ok: true; proceed: false; skipped: "paused" | "cards" | "killed" }
  | { ok: false; error: string }
> {
  const redis = await getRedisClient();
  if (!redis) return { ok: false, error: "Redis is not configured" };
  if (hunterKilled()) return { ok: true, proceed: false, skipped: "killed" };
  const today = edmontonToday();
  let state = await loadHunterState();
  if (state.paused) {
    state = { ...state, lastRunAt: new Date().toISOString(), lastRunResult: "Paused. No search." };
    await saveHunterState(state);
    return { ok: true, proceed: false, skipped: "paused" };
  }
  const stop = hunterStop(state, today);
  if (!stop) return { ok: true, proceed: true };
  state = {
    ...state,
    lastRunAt: new Date().toISOString(),
    lastRunResult: dayStopCopy(),
  };
  await saveHunterState(state);
  return { ok: true, proceed: false, skipped: stop };
}

/** Nightly only. Working hours do not apply. The kill switch does. */
export async function gateNightly(now = new Date()): Promise<
  | { ok: true; proceed: true }
  | { ok: true; proceed: false; skipped: "paused" | "cards" | "killed" | "not-4am" | "already-swept" }
  | { ok: false; error: string }
> {
  if (hunterKilled()) return { ok: true, proceed: false, skipped: "killed" };
  const state = await loadHunterState();
  const skip = nightlySkip(now, state.nightlyOn);
  if (skip) return { ok: true, proceed: false, skipped: skip };
  return holdHunterForDay();
}

export async function markNightlySwept(date: string) {
  const state = await loadHunterState();
  await saveHunterState({ ...state, nightlyOn: date });
}

/** Count contact-ready cards. Model calls are counted by the atomic counter, not here. */
export async function recordHunterEffort(input: { calls: number; contactReady: number; note: string }) {
  const redis = (await getRedisClient()) as HunterRedis | null;
  if (!redis) return;
  const today = edmontonToday();
  const state = await loadHunterState();
  const usedRaw = await redis.get<string>(callCounterKey(today));
  const base = countsForToday(state, today);
  const used = usedRaw == null || usedRaw === "" ? base.callsToday + Math.max(0, input.calls) : Number(usedRaw);
  const settled = applyHunterWork(
    { ...state, callsOn: today, callsToday: Number.isFinite(used) ? used : base.callsToday },
    today,
    { calls: 0, contactReady: input.contactReady },
  );
  await saveHunterState({
    ...settled,
    callsOn: today,
    callsToday: Number.isFinite(used) ? used : settled.callsToday,
    lastRunAt: new Date().toISOString(),
    lastRunResult: input.note,
  });
}

export async function readHunterDesk(today = edmontonToday(), now = new Date()) {
  const redis = (await getRedisClient()) as HunterRedis | null;
  const state = redis ? parseHunterState(await redis.get<unknown>(HUNTER_KEY)) : freshHunterState();
  const counts = countsForToday(state, today);
  const recentRuns = redis ? await readHunterRuns(20) : [];
  const book = redis ? await loadBook() : null;
  const companies = book?.book.companies ?? [];
  const month = today.slice(0, 7);
  const spend = redis ? await readMonthSpend(redis, month) : { actual: 0, estimated: 0 };
  const spent = capSpend(spend);
  const cap = monthlyCapState(spent);
  const lastLine = recentRuns[0]?.at || state.lastRunAt;
  const beat = heartbeatLate(lastLine, now, withinWorkingHours(now));
  const stored = redis?.lrange ? await redis.lrange(HUNTER_ALARM_KEY, 0, 400) : [];
  const recentAlarms = alarmsWithin(
    stored.flatMap((row) => {
      try {
        const item = (typeof row === "string" ? JSON.parse(row) : row) as { at?: string; text?: string; run?: string };
        if (!item?.text || !item.at) return [];
        return [{ at: item.at, text: item.text, run: item.run ?? "" }];
      } catch {
        return [];
      }
    }),
    now,
  );
  const alarms = recentAlarms.map((item) => item.text);
  if (beat.late) alarms.push("Heartbeat is late.");
  const expired = companies.filter((company) => company.review === "expired-unreviewed").length;
  if (expired > 0) alarms.push(`${expired} cards expired unreviewed.`);
  const cardsFiledToday = companies.filter((company) => company.filedOn === today || company.scoutBatch === today).length;
  return {
    storage: redis ? ("redis" as const) : ("browser" as const),
    paused: state.paused,
    killed: hunterKilled(),
    lastRunAt: state.lastRunAt,
    lastRunResult: state.lastRunResult,
    filedToday: counts.filedToday,
    cardsFiledToday,
    fileCap: hunterDailyFiledCap(),
    cardTarget: HUNTER_CARD_CEILING,
    callsToday: counts.callsToday,
    apolloRevealsToday: revealsOn(state, today),
    apolloCreditCap: apolloCreditCap(),
    recentRuns,
    today,
    heartbeatLate: beat.late,
    heartbeatAt: lastLine,
    monthlyCap: monthlyCapLabel(cap),
    bookedThisMonth: bookedThisMonth(companies, month),
    methods: methodStats(companies, spend.actual > 0 ? spend.actual : null),
    spendEstimated: spend.estimated,
    methodRegistry: findingMethods(),
    bookingLink: BOOKING_LINK_HOOK,
    alarms,
    funnel: recentRuns[0]?.funnel ?? null,
    model: HUNTER_MODEL_ID,
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
