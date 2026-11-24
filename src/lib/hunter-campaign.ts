/**
 * Weekly Apollo campaigns. Apollo finds the companies. xAI only reads pages we already fetched.
 * Phase two, an xAI web search on strong-rated companies only, is not built.
 * Headcount is a ranking input. It never drops a company.
 */

import { HUNTER_SIGNALS, regionWeightForPlace, searchRegionCycle } from "../data/hunter-profile.ts";
import type { ApolloOrganization } from "./apollo.ts";
import { HUNTER_SAMPLE_FLOOR } from "./hunter-config.ts";
import { addDays } from "./hunter-phase.ts";

export const HUNTER_CAMPAIGN_KEY = "unearth:hunter:campaign:v1";
export function apolloCreditKey(month: string) {
  return `unearth:hunter:apollo-credits:v1:${month}`;
}
export const HUNTER_COMPANY_SOURCE_DEFAULT = "campaign";
/** Published Basic monthly credits. Chris's own allowance is not verified. An alarm is not a cap. */
export const APOLLO_BASIC_MONTHLY_CREDITS = 2500;
export const APOLLO_CREDIT_ALARM_AT = 2000;
export const CAMPAIGN_PAGES_PER_REGION = 10;
/** Bump when a stored campaign must drop a stuck exhausted flag and pull again. */
export const CAMPAIGN_STATE_VERSION = 2;
export const THREE_CITY_LOCATIONS = ["Edmonton, Alberta, Canada", "Calgary, Alberta, Canada", "Red Deer, Alberta, Canada"] as const;
export const CAMPAIGN_COMPANIES_PER_PASS = 4;
/** Campaign draws only. The older slot walker keeps HUNTER_REGION_SPLIT. */
export const CAMPAIGN_SPLIT = { canada: 85, us: 15 } as const;
export const CANADA_TILT_REASON = "Canada tilt approved by Christopher 24 Nov";

export type CampaignQueue = "cities" | "canada" | "us";
export type QueueCounts = { cities: number; canada: number; us: number };
export type QueueFlags = { cities: boolean; canada: boolean; us: boolean };

export type CompanySource = "campaign" | "xai";

export function companySource(raw = process.env.HUNTER_COMPANY_SOURCE): CompanySource {
  return raw?.trim().toLowerCase() === "xai" ? "xai" : HUNTER_COMPANY_SOURCE_DEFAULT;
}

export type CampaignSegment = {
  id: string;
  label: string;
  industries: string[];
};

/** The catalogue Hunter may choose. The active segment is the one that is searched. */
export const CAMPAIGN_SEGMENTS: CampaignSegment[] = [
  { id: "tech", label: "Technology companies, Canada and the United States, no headcount cap", industries: ["information technology & services"] },
  { id: "energy", label: "Energy companies, Canada and the United States, no headcount cap", industries: ["oil & energy"] },
  { id: "professional", label: "Professional services, Canada and the United States, no headcount cap", industries: ["management consulting"] },
  { id: "healthcare", label: "Healthcare companies, Canada and the United States, no headcount cap", industries: ["hospital & health care"] },
];

export const FIRST_SEGMENT = CAMPAIGN_SEGMENTS[0]!;

export type RankWeights = {
  headcount: number;
  distance: number;
  revenue: number;
  funding: number;
  growth: number;
  hiring: number;
  keywords: number;
  technologies: number;
  buyerTitle: number;
};

export const STARTING_WEIGHTS: RankWeights = {
  headcount: 30,
  distance: 30,
  revenue: 15,
  funding: 15,
  growth: 15,
  hiring: 15,
  keywords: 10,
  technologies: 5,
  buyerTitle: 15,
};

export type RankedCompany = {
  id: string;
  domain: string;
  name: string;
  region: "canada" | "us";
  /** Which list this company was pulled from. City rows stay region canada. */
  queue: CampaignQueue;
  score: number;
  inputs: string[];
  page: number;
  status: "queued" | "worked" | "dropped";
  organization: ApolloOrganization;
};

export type CampaignState = {
  id: string;
  weekStart: string;
  segmentId: string;
  signed: boolean;
  suggestionId: string;
  suggestionReason: string;
  split: { canada: number; us: number };
  splitReason: string;
  weights: RankWeights;
  weightNote: string;
  planNote: string;
  canadaSize: number | null;
  usSize: number | null;
  nextPage: QueueCounts;
  pagesPulled: QueueCounts;
  exhausted: QueueFlags;
  seenIds: string[];
  queued: RankedCompany[];
  drawCursor: number;
  creditsMonth: string;
  version: number;
  /** Who set the active segment. The build set the first one. Later changes are Hunter's. */
  segmentSource: "hunter" | "build";
  /** Each switch Hunter makes. The plan note is reset every run, so this list is the history. */
  switches: SegmentSwitch[];
};

export type SegmentSwitch = {
  at: string;
  on: string;
  from: string;
  to: string;
  reason: string;
  source: "hunter";
};

const BUYER_TITLE_TERMS = ["head of people", "office manager", "executive assistant", "chief of staff", "people", "culture", "events", "learning"];
const KEYWORD_TERMS = ["outdoor", "b corp", "remote", "leadership"];
const REMOTE_TOOLS = ["slack", "zoom", "notion", "asana", "figma"];

export function segmentById(id: string) {
  return CAMPAIGN_SEGMENTS.find((item) => item.id === id) ?? FIRST_SEGMENT;
}

export function weekStartMonday(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  const date = new Date(Date.UTC(year, month - 1, day));
  const weekday = date.getUTCDay();
  const back = weekday === 0 ? 6 : weekday - 1;
  date.setUTCDate(date.getUTCDate() - back);
  return date.toISOString().slice(0, 10);
}

export function isMonday(iso: string) {
  return weekStartMonday(iso) === iso;
}

/** 85/15 Canada tilt. A stored 70/30 campaign is moved here on load. Any other stored split is left as it is. */
export function splitForSegment(_segmentId: string): { split: { canada: number; us: number }; reason: string } {
  return {
    split: { canada: CAMPAIGN_SPLIT.canada, us: CAMPAIGN_SPLIT.us },
    reason: CANADA_TILT_REASON,
  };
}

/** The approved tilt replaces only the old 70/30 default. Hunter can still keep a different split. */
export function applyCanadaTilt(state: CampaignState): CampaignState {
  if (state.split.canada === 70 && state.split.us === 30) {
    return {
      ...state,
      split: { canada: CAMPAIGN_SPLIT.canada, us: CAMPAIGN_SPLIT.us },
      splitReason: CANADA_TILT_REASON,
    };
  }
  return state;
}

export function freshCampaign(today: string, segment = FIRST_SEGMENT): CampaignState {
  const split = splitForSegment(segment.id);
  const note = [
    `Signed segment: ${segment.label}.`,
    `Signed off by Christopher on 20th November 2026.`,
    `Split ${split.split.canada}/${split.split.us}. ${split.reason}`,
    "Weekly weight changes apply on their own once 30 cards have been reviewed. None yet.",
  ].join(" ");
  return {
    id: `campaign-${weekStartMonday(today)}-${segment.id}`,
    weekStart: weekStartMonday(today),
    segmentId: segment.id,
    signed: true,
    suggestionId: segment.id,
    suggestionReason: "First segment, signed with the build.",
    split: split.split,
    splitReason: split.reason,
    weights: { ...STARTING_WEIGHTS },
    weightNote: "Starting weights. No change until 30 cards are reviewed.",
    planNote: note,
    canadaSize: null,
    usSize: null,
    nextPage: { cities: 1, canada: 1, us: 1 },
    pagesPulled: { cities: 0, canada: 0, us: 0 },
    exhausted: { cities: false, canada: false, us: false },
    seenIds: [],
    queued: [],
    drawCursor: 0,
    creditsMonth: today.slice(0, 7),
    version: CAMPAIGN_STATE_VERSION,
    segmentSource: "build",
    switches: [],
  };
}

function campaignFromRaw(raw: unknown): CampaignState | null {
  const value = typeof raw === "string" ? safeCampaignJson(raw) : raw;
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<CampaignState>;
  if (!row.segmentId || !Array.isArray(row.queued) || !row.split) return null;
  const today = "2026-11-20";
  const base = freshCampaign(today);
  return {
    ...base,
    ...row,
    version: typeof row.version === "number" ? row.version : 1,
    nextPage: numberQueue(row.nextPage, base.nextPage),
    pagesPulled: numberQueue(row.pagesPulled, base.pagesPulled),
    exhausted: flagQueue(row.exhausted, base.exhausted),
    seenIds: row.seenIds ?? [],
    queued: sanitizeQueued(row.queued),
    split: row.split,
    weights: row.weights ?? base.weights,
    segmentSource: row.segmentSource === "hunter" ? "hunter" : "build",
    switches: sanitizeSwitches(row.switches),
  };
}

function numberQueue(value: unknown, fallback: QueueCounts): QueueCounts {
  const row = value && typeof value === "object" ? (value as Partial<QueueCounts>) : {};
  const pick = (key: keyof QueueCounts) => (typeof row[key] === "number" && Number.isFinite(row[key]) ? row[key]! : fallback[key]);
  return { cities: pick("cities"), canada: pick("canada"), us: pick("us") };
}

function flagQueue(value: unknown, fallback: QueueFlags): QueueFlags {
  const row = value && typeof value === "object" ? (value as Partial<QueueFlags>) : {};
  const pick = (key: keyof QueueFlags) => (typeof row[key] === "boolean" ? row[key]! : fallback[key]);
  return { cities: pick("cities"), canada: pick("canada"), us: pick("us") };
}

function sanitizeQueued(value: RankedCompany[]): RankedCompany[] {
  return value.map((row) => {
    const queue: CampaignQueue = row.queue === "cities" || row.queue === "canada" || row.queue === "us" ? row.queue : row.region === "us" ? "us" : "canada";
    return { ...row, queue, region: queue === "us" ? "us" : "canada" };
  });
}

function sanitizeSwitches(value: unknown): SegmentSwitch[] {
  if (!Array.isArray(value)) return [];
  return value
    .flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const row = item as Partial<SegmentSwitch>;
      if (row.source !== "hunter") return [];
      if (typeof row.at !== "string" || typeof row.on !== "string" || typeof row.from !== "string" || typeof row.to !== "string" || typeof row.reason !== "string") return [];
      return [{ at: row.at, on: row.on, from: row.from, to: row.to, reason: row.reason, source: "hunter" as const }];
    })
    .slice(-40);
}

function safeCampaignJson(raw: string) {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

/** Clears a stuck exhausted list from an older stored campaign so the next run pulls again. */
export function recoverStuckCampaign(state: CampaignState, today: string): CampaignState {
  return {
    ...state,
    version: CAMPAIGN_STATE_VERSION,
    exhausted: { cities: false, canada: false, us: false },
    pagesPulled: { cities: 0, canada: 0, us: 0 },
    planNote: `${state.planNote} Recovered on ${today}. Canada and the United States pull again. The stuck exhausted flags are cleared.`,
  };
}

/** The page cap is per Edmonton week. A new Monday clears exhausted flags and the week's page counts. */
export function resetCampaignWeek(state: CampaignState, today: string): CampaignState {
  const start = weekStartMonday(today);
  if (state.weekStart === start) return state;
  return {
    ...state,
    weekStart: start,
    pagesPulled: { cities: 0, canada: 0, us: 0 },
    exhausted: { cities: false, canada: false, us: false },
    suggestionReason: "",
    planNote: `${state.planNote} New week ${start}. The weekly page cap and exhausted flags are reset.`,
  };
}

export function loadCampaignState(raw: unknown, today: string): CampaignState {
  const parsed = campaignFromRaw(raw);
  if (!parsed) return freshCampaign(today);
  const current = parsed.version === CAMPAIGN_STATE_VERSION ? parsed : recoverStuckCampaign(parsed, today);
  return applyCanadaTilt(resetCampaignWeek(current, today));
}

export function suggestSegment(input: {
  weekStart: string;
  /** The segment already being worked. A tie or a thin sample stays here. */
  currentSegmentId?: string;
  reviewedBySegment: Record<string, number>;
  scoreBySegment: Record<string, number>;
  sampleFloor?: number;
}): { id: string; reason: string } {
  const current = CAMPAIGN_SEGMENTS.some((item) => item.id === input.currentSegmentId) ? input.currentSegmentId! : FIRST_SEGMENT.id;
  const floor = input.sampleFloor ?? HUNTER_SAMPLE_FLOOR;
  const weekIndex = Math.floor(Date.parse(`${input.weekStart}T00:00:00Z`) / (7 * 24 * 60 * 60 * 1000));
  const explore = Number.isFinite(weekIndex) && weekIndex % 4 === 3;
  if (explore) {
    const leastCount = Math.min(...CAMPAIGN_SEGMENTS.map((item) => input.reviewedBySegment[item.id] ?? 0));
    const least = CAMPAIGN_SEGMENTS.filter((item) => (input.reviewedBySegment[item.id] ?? 0) === leastCount);
    if (least.length === 1 && least[0]) return { id: least[0].id, reason: "Every fourth week suggests the least-tested segment." };
    return { id: current, reason: "No single least-tested segment. Hunter keeps the current segment." };
  }
  const ready = CAMPAIGN_SEGMENTS.filter((item) => (input.reviewedBySegment[item.id] ?? 0) >= floor);
  if (!ready.length) {
    return { id: current, reason: "Not enough reviewed cards for a conversion score. Hunter keeps the current segment." };
  }
  const bestScore = Math.max(...ready.map((item) => input.scoreBySegment[item.id] ?? 0));
  const best = ready.filter((item) => (input.scoreBySegment[item.id] ?? 0) === bestScore);
  if (best.length !== 1 || !best[0]) {
    return { id: current, reason: "Conversion scores are tied. Hunter keeps the current segment." };
  }
  return { id: best[0].id, reason: "Best conversion score so far." };
}

/** The segment Hunter is working. A missing sign-off does not substitute another segment. */
export function signedSegment(state: CampaignState) {
  return segmentById(state.segmentId);
}

export function withMondaySuggestion(state: CampaignState, today: string, reviewedBySegment: Record<string, number>, scoreBySegment: Record<string, number>): CampaignState {
  const start = weekStartMonday(today);
  if (!isMonday(today) || state.weekStart === start && state.suggestionReason) return { ...state, weekStart: state.weekStart || start };
  const suggestion = suggestSegment({ weekStart: start, currentSegmentId: state.segmentId, reviewedBySegment, scoreBySegment });
  const same = suggestion.id === state.segmentId;
  return {
    ...state,
    weekStart: start,
    suggestionId: suggestion.id,
    suggestionReason: suggestion.reason,
    planNote: same
      ? state.planNote
      : `${state.planNote} Monday suggestion: ${segmentById(suggestion.id).label}. ${suggestion.reason} The current segment stays until Hunter chooses a change.`,
  };
}

/** Hunter sets the active segment. The previous queue is left behind. Weights stay. */
export function applyHunterSegment(
  state: CampaignState,
  input: { segmentId: string; reason: string; today: string; at: string },
): CampaignState | { error: "invalid"; field: "segmentId" | "reason" } {
  const segment = CAMPAIGN_SEGMENTS.find((item) => item.id === input.segmentId);
  if (!segment) return { error: "invalid", field: "segmentId" };
  const reason = input.reason.replace(/\s+/g, " ").trim();
  if (reason.length < 8 || reason.length > 240) return { error: "invalid", field: "reason" };
  if (segment.id === state.segmentId) return state;
  const split = splitForSegment(segment.id);
  const from = state.segmentId;
  const record: SegmentSwitch = { at: input.at, on: input.today, from, to: segment.id, reason, source: "hunter" };
  const switches = [...state.switches, record].slice(-40);
  const note = `Active segment: ${segment.label}. Hunter's choice. Switched ${input.at} from ${from} to ${segment.id}. ${reason} Split ${split.split.canada}/${split.split.us}. ${split.reason}`;
  return {
    ...freshCampaign(input.today, segment),
    weights: state.weights,
    weightNote: state.weightNote,
    segmentSource: "hunter",
    suggestionId: segment.id,
    suggestionReason: reason,
    split: split.split,
    splitReason: split.reason,
    switches,
    planNote: note,
  };
}

export function signOffSuggestion(state: CampaignState, today: string): CampaignState {
  if (state.suggestionId === state.segmentId) return { ...state, signed: true };
  const segment = segmentById(state.suggestionId);
  const split = splitForSegment(segment.id);
  return {
    ...freshCampaign(today, segment),
    signed: true,
    suggestionId: segment.id,
    suggestionReason: "Christopher signed off this segment.",
    split: split.split,
    splitReason: split.reason,
    planNote: `Signed segment: ${segment.label}. Christopher signed off on ${today}. Split ${split.split.canada}/${split.split.us}. ${split.reason}`,
    weights: state.weights,
    weightNote: state.weightNote,
    switches: state.switches,
  };
}

function headcountPoints(employees: number | null, weight: number) {
  if (employees == null) return { points: Math.round(weight * 0.25), note: "Headcount unknown, still ranked" };
  if (employees >= 6 && employees <= 24) return { points: weight, note: "Headcount 6 to 24" };
  if (employees < 6) return { points: Math.round(weight * 0.4), note: "Headcount under 6, still ranked" };
  if (employees <= 200) return { points: Math.round(weight * 0.6), note: "Larger company, still ranked" };
  return { points: Math.round(weight * 0.3), note: "Large company, still ranked" };
}

export function rankOrganizations(orgs: ApolloOrganization[], queue: CampaignQueue, weights: RankWeights, page: number): RankedCompany[] {
  const region: "canada" | "us" = queue === "us" ? "us" : "canada";
  const ranked = orgs
    .filter((org) => phaseOneCountry(org.country, org.place, region))
    .map((org) => {
      const inputs: string[] = [];
      let score = 0;
      const head = headcountPoints(org.employees, weights.headcount);
      score += head.points;
      inputs.push(head.note);
      const distance = regionWeightForPlace(org.place, region) * (weights.distance / 10);
      score += distance;
      inputs.push(`Distance ${Math.round(distance)}`);
      if (org.revenue != null && org.revenue >= 1_000_000) {
        score += weights.revenue;
        inputs.push("Revenue band");
      }
      if (org.latestFundingOn && fundingWithin18Months(org.latestFundingOn)) {
        score += weights.funding;
        inputs.push("Funding in the last 18 months");
      }
      if (org.headcountGrowth != null && org.headcountGrowth > 0) {
        score += weights.growth;
        inputs.push("Headcount growth");
      }
      if ((org.jobCount ?? 0) > 0 || org.jobTitles.some((title) => hiringTitle(title))) {
        score += weights.hiring;
        inputs.push("Hiring");
      }
      if (org.keywords.some((tag) => KEYWORD_TERMS.some((term) => tag.toLowerCase().includes(term)))) {
        score += weights.keywords;
        inputs.push("Keyword tag");
      }
      if (org.technologies.some((tool) => REMOTE_TOOLS.some((term) => tool.toLowerCase().includes(term)))) {
        score += weights.technologies;
        inputs.push("Remote-work tool");
      }
      return { id: org.id, domain: org.domain, name: org.name, region, queue, score, inputs, page, status: "queued" as const, organization: org };
    });
  ranked.sort((a, b) => b.score - a.score || regionWeightForPlace(b.organization.place, region) - regionWeightForPlace(a.organization.place, region) || a.domain.localeCompare(b.domain));
  return ranked;
}

export function applyBuyerTitleBoost(ranked: RankedCompany[], titlesByDomain: Record<string, string[]>, weights = STARTING_WEIGHTS) {
  return ranked
    .map((row) => {
      const titles = titlesByDomain[row.domain] ?? [];
      if (!titles.some((title) => BUYER_TITLE_TERMS.some((term) => title.toLowerCase().includes(term)))) return row;
      return { ...row, score: row.score + weights.buyerTitle, inputs: [...row.inputs, "Buyer title at the company"] };
    })
    .sort((a, b) => b.score - a.score || a.domain.localeCompare(b.domain));
}

/** Blank or unknown stays when the search itself was Canada or the United States. A printed other country does not. */
export function phaseOneCountry(country: string, place: string, searched?: "canada" | "us") {
  const hay = `${country} ${place}`.toLowerCase().trim();
  const blank = hay === "" || hay === "unknown" || hay === "elsewhere";
  if (blank) return searched === "canada" || searched === "us";
  if (hay.includes("canada")) return true;
  if (hay.includes("united states") || hay.includes("usa") || hay.includes("u.s.")) return true;
  return false;
}

export type SearchDraw = {
  region: "canada" | "us";
  queue: CampaignQueue;
  tier: "three-city" | "canada" | "us";
  locations: string[];
};

/**
 * 85/15 Canada/United States by default. Canadian draws alternate, city queue first,
 * between Edmonton, Calgary, and Red Deer and a Canada-wide search.
 * No location inside either country is excluded.
 */
export function searchDraw(cursor: number, split: { canada: number; us: number } = CAMPAIGN_SPLIT): SearchDraw {
  const cycle = searchRegionCycle({ canada: split.canada, us: split.us });
  const index = cycle.length ? cursor % cycle.length : 0;
  const slot = cycle[index] ?? "canada";
  if (slot === "us") return { region: "us", queue: "us", tier: "us", locations: ["United States"] };
  const canadaIndex = cycle.slice(0, index + 1).filter((item) => item === "canada").length - 1;
  if (canadaIndex % 2 === 0) {
    return { region: "canada", queue: "cities", tier: "three-city", locations: [...THREE_CITY_LOCATIONS] };
  }
  return { region: "canada", queue: "canada", tier: "canada", locations: ["Canada"] };
}

function fundingWithin18Months(iso: string, today = "2026-11-20") {
  if (!/^\d{4}-\d{2}-\d{2}/.test(iso)) return false;
  const date = iso.slice(0, 10);
  return date >= addDays(today, -548) && date <= today;
}

function hiringTitle(title: string) {
  const hay = title.toLowerCase();
  return ["people", "culture", "events", "learning", "office manager"].some((term) => hay.includes(term));
}

export function regionForDraw(cursor: number, split: { canada: number; us: number } = CAMPAIGN_SPLIT): "canada" | "us" {
  return searchDraw(cursor, split).region;
}

export function collectRegion(state: CampaignState, queue: CampaignQueue, known: Set<string>, limit: number): { state: CampaignState; taken: RankedCompany[] } {
  const taken: RankedCompany[] = [];
  const queued = state.queued.map((row) => ({ ...row }));
  for (const row of queued) {
    if (taken.length >= limit) break;
    const rowQueue = row.queue ?? (row.region === "us" ? "us" : "canada");
    if (row.status !== "queued" || rowQueue !== queue) continue;
    if (known.has(row.domain)) {
      row.status = "dropped";
      row.inputs = [...row.inputs, "Already on file"];
      continue;
    }
    row.status = "worked";
    taken.push(row);
  }
  return { state: { ...state, queued }, taken };
}

export function takeQueued(state: CampaignState, known: Set<string>, limit: number): { state: CampaignState; taken: RankedCompany[]; region: "canada" | "us"; queue: CampaignQueue } {
  const draw = searchDraw(state.drawCursor, state.split);
  const collected = collectRegion(state, draw.queue, known, limit);
  return { state: { ...collected.state, drawCursor: state.drawCursor + 1 }, taken: collected.taken, region: draw.region, queue: draw.queue };
}

export type PageAccept = {
  state: CampaignState;
  added: number;
  returned: number;
  seen: number;
  outOfRegion: number;
  exhausted: boolean;
  /** True only when Apollo returned no rows, the last page, or the weekly cap. A page of already-seen companies is not exhausted. */
  stopPulls: boolean;
};

export function acceptPage(
  state: CampaignState,
  queue: CampaignQueue,
  organizations: ApolloOrganization[],
  today: string,
  totalPages?: number,
): PageAccept {
  const seenIds = new Set(state.seenIds);
  let seen = 0;
  let outOfRegion = 0;
  const fresh: ApolloOrganization[] = [];
  for (const org of organizations) {
    if (seenIds.has(org.id)) {
      seen += 1;
      continue;
    }
    seenIds.add(org.id);
    if (!phaseOneCountry(org.country, org.place, queue === "us" ? "us" : "canada")) {
      outOfRegion += 1;
      continue;
    }
    fresh.push(org);
  }
  const ranked = rankOrganizations(fresh, queue, state.weights, state.nextPage[queue]);
  const pagesPulled = state.pagesPulled[queue] + 1;
  const atEnd = typeof totalPages === "number" && totalPages > 0 && state.nextPage[queue] >= totalPages;
  const empty = organizations.length === 0;
  const cap = pagesPulled >= CAMPAIGN_PAGES_PER_REGION;
  const exhausted = empty || atEnd || cap;
  return {
    state: {
      ...state,
      seenIds: [...seenIds],
      queued: [...state.queued, ...ranked],
      nextPage: { ...state.nextPage, [queue]: state.nextPage[queue] + 1 },
      pagesPulled: { ...state.pagesPulled, [queue]: pagesPulled },
      exhausted: { ...state.exhausted, [queue]: exhausted },
      creditsMonth: today.slice(0, 7),
    },
    added: ranked.length,
    returned: organizations.length,
    seen,
    outOfRegion,
    exhausted,
    stopPulls: exhausted,
  };
}

export function pageDropNote(result: Pick<PageAccept, "returned" | "seen" | "outOfRegion" | "added">) {
  return `Returned ${result.returned}. Already seen ${result.seen}. Outside Canada and the United States ${result.outOfRegion}. New ${result.added}.`;
}

export function needsAnotherPage(state: CampaignState, queue: CampaignQueue) {
  if (state.exhausted[queue]) return false;
  if (state.pagesPulled[queue] >= CAMPAIGN_PAGES_PER_REGION) return false;
  return !state.queued.some((row) => (row.queue ?? (row.region === "us" ? "us" : "canada")) === queue && row.status === "queued");
}

export function creditAlarm(monthCredits: number) {
  if (monthCredits < APOLLO_CREDIT_ALARM_AT) return "";
  return `Apollo credit burn is ${monthCredits} this month. The published Basic allowance is ${APOLLO_BASIC_MONTHLY_CREDITS}. This account's allowance is not verified.`;
}

export type OutcomeRow = { segmentId: string; reviewed: boolean; approved: boolean; replied: boolean; booked: boolean; hadFunding: boolean };

export function nextWeights(weights: RankWeights, rows: OutcomeRow[], sampleFloor = HUNTER_SAMPLE_FLOOR): { weights: RankWeights; note: string } {
  const reviewed = rows.filter((row) => row.reviewed);
  if (reviewed.length < sampleFloor) {
    return { weights, note: `No weight change. ${reviewed.length} reviewed cards, and the floor is ${sampleFloor}.` };
  }
  const funded = reviewed.filter((row) => row.hadFunding);
  const rest = reviewed.filter((row) => !row.hadFunding);
  if (funded.length < 10 || rest.length < 10) {
    return { weights, note: "No weight change. A split needs at least 10 reviewed cards on each side." };
  }
  const rate = (list: OutcomeRow[]) => list.filter((row) => row.booked).length / list.length;
  if (rate(funded) > rate(rest)) {
    const funding = Math.min(30, weights.funding + 5);
    return { weights: { ...weights, funding }, note: "Funding weight raised by 5. Funded cards booked more often. Applied without a separate sign-off." };
  }
  return { weights, note: "No weight change. Funding did not book more often than the rest." };
}

export function apolloProfileSignals(org: ApolloOrganization, today: string): { id: string; sourceUrl: string; via: "Apollo"; snippet: string }[] {
  const hits: { id: string; sourceUrl: string; via: "Apollo"; snippet: string }[] = [];
  if (org.latestFundingOn && fundingWithin18Months(org.latestFundingOn, today)) {
    hits.push({ id: "growth", sourceUrl: "Apollo", via: "Apollo", snippet: `Apollo funding date ${org.latestFundingOn}. Pulled ${today}.` });
  }
  if (org.headcountGrowth != null && org.headcountGrowth > 0) {
    hits.push({ id: "growth", sourceUrl: "Apollo", via: "Apollo", snippet: `Apollo headcount growth. Pulled ${today}.` });
  }
  if (org.jobTitles.some((title) => hiringTitle(title)) || ((org.jobCount ?? 0) > 0 && org.jobTitles.length === 0)) {
    hits.push({ id: "leadership", sourceUrl: "Apollo", via: "Apollo", snippet: `Apollo hiring signal. Pulled ${today}.` });
  }
  return hits.filter((hit, index, list) => list.findIndex((item) => item.id === hit.id) === index);
}

export function keywordSignalsOnPage(keywords: string[], page: string, sourceUrl: string) {
  const hits: { id: string; sourceUrl: string }[] = [];
  const hay = page.toLowerCase();
  for (const signal of HUNTER_SIGNALS) {
    if (!keywords.some((tag) => signal.terms.some((term) => tag.toLowerCase().includes(term) && hay.includes(term)))) continue;
    hits.push({ id: signal.id, sourceUrl });
  }
  return hits;
}

export function profileSignalsOnPage(page: string, sourceUrl: string) {
  const hay = page.toLowerCase();
  return HUNTER_SIGNALS.filter((signal) => signal.terms.some((term) => hay.includes(term))).map((signal) => ({
    id: signal.id,
    sourceUrl,
  }));
}
