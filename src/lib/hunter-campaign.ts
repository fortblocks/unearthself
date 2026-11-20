/**
 * Weekly Apollo campaigns. Apollo finds the companies. xAI only reads pages we already fetched.
 * Phase two, an xAI web search on strong-rated companies only, is not built.
 * Headcount is a ranking input. It never drops a company.
 */

import { HUNTER_REGION_SPLIT, HUNTER_SIGNALS, regionWeightForPlace, searchRegionCycle } from "../data/hunter-profile.ts";
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
export const CAMPAIGN_COMPANIES_PER_PASS = 4;

export type CompanySource = "campaign" | "xai";

export function companySource(raw = process.env.HUNTER_COMPANY_SOURCE): CompanySource {
  return raw?.trim().toLowerCase() === "xai" ? "xai" : HUNTER_COMPANY_SOURCE_DEFAULT;
}

export type CampaignSegment = {
  id: string;
  label: string;
  industries: string[];
};

/** The catalogue Hunter may suggest. Only a signed segment is searched. */
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
  nextPage: { canada: number; us: number };
  pagesPulled: { canada: number; us: number };
  exhausted: { canada: boolean; us: boolean };
  seenIds: string[];
  queued: RankedCompany[];
  drawCursor: number;
  creditsMonth: string;
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

/** 70/30 unless a segment has a logged lean. Tech does not. */
export function splitForSegment(segmentId: string): { split: { canada: number; us: number }; reason: string } {
  if (segmentId === "tech" || segmentId === "energy" || segmentId === "professional" || segmentId === "healthcare") {
    return {
      split: { canada: HUNTER_REGION_SPLIT.canada, us: HUNTER_REGION_SPLIT.us },
      reason: "No clear lean. The default is 70 percent Canada and 30 percent the United States.",
    };
  }
  return {
    split: { canada: HUNTER_REGION_SPLIT.canada, us: HUNTER_REGION_SPLIT.us },
    reason: "Unknown segment. The default is 70 percent Canada and 30 percent the United States.",
  };
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
    nextPage: { canada: 1, us: 1 },
    pagesPulled: { canada: 0, us: 0 },
    exhausted: { canada: false, us: false },
    seenIds: [],
    queued: [],
    drawCursor: 0,
    creditsMonth: today.slice(0, 7),
  };
}

export function suggestSegment(input: {
  weekStart: string;
  reviewedBySegment: Record<string, number>;
  scoreBySegment: Record<string, number>;
  sampleFloor?: number;
}): { id: string; reason: string } {
  const floor = input.sampleFloor ?? HUNTER_SAMPLE_FLOOR;
  const weekIndex = Math.floor(Date.parse(`${input.weekStart}T00:00:00Z`) / (7 * 24 * 60 * 60 * 1000));
  const explore = Number.isFinite(weekIndex) && weekIndex % 4 === 3;
  if (explore) {
    const least = [...CAMPAIGN_SEGMENTS].sort(
      (a, b) => (input.reviewedBySegment[a.id] ?? 0) - (input.reviewedBySegment[b.id] ?? 0) || a.id.localeCompare(b.id),
    )[0];
    return { id: least?.id ?? FIRST_SEGMENT.id, reason: "Every fourth week suggests the least-tested segment." };
  }
  const ready = CAMPAIGN_SEGMENTS.filter((item) => (input.reviewedBySegment[item.id] ?? 0) >= floor);
  const best = [...(ready.length ? ready : CAMPAIGN_SEGMENTS)].sort(
    (a, b) => (input.scoreBySegment[b.id] ?? 0) - (input.scoreBySegment[a.id] ?? 0) || a.id.localeCompare(b.id),
  )[0];
  return {
    id: best?.id ?? FIRST_SEGMENT.id,
    reason: ready.length ? "Best outcome score so far." : "Not enough reviewed cards for an outcome score. Stay with the signed segment until Christopher signs a change.",
  };
}

/** A suggestion does not replace the signed segment. */
export function signedSegment(state: CampaignState) {
  return segmentById(state.signed ? state.segmentId : FIRST_SEGMENT.id);
}

export function withMondaySuggestion(state: CampaignState, today: string, reviewedBySegment: Record<string, number>, scoreBySegment: Record<string, number>): CampaignState {
  const start = weekStartMonday(today);
  if (!isMonday(today) || state.weekStart === start && state.suggestionReason) return { ...state, weekStart: state.weekStart || start };
  const suggestion = suggestSegment({ weekStart: start, reviewedBySegment, scoreBySegment });
  const same = suggestion.id === state.segmentId;
  return {
    ...state,
    weekStart: start,
    suggestionId: suggestion.id,
    suggestionReason: suggestion.reason,
    planNote: same
      ? state.planNote
      : `${state.planNote} Monday suggestion: ${segmentById(suggestion.id).label}. ${suggestion.reason} Still working the signed segment until Christopher signs off.`,
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
  };
}

function headcountPoints(employees: number | null, weight: number) {
  if (employees == null) return { points: Math.round(weight * 0.25), note: "Headcount unknown, still ranked" };
  if (employees >= 6 && employees <= 24) return { points: weight, note: "Headcount 6 to 24" };
  if (employees < 6) return { points: Math.round(weight * 0.4), note: "Headcount under 6, still ranked" };
  if (employees <= 200) return { points: Math.round(weight * 0.6), note: "Larger company, still ranked" };
  return { points: Math.round(weight * 0.3), note: "Large company, still ranked" };
}

export function rankOrganizations(orgs: ApolloOrganization[], region: "canada" | "us", weights: RankWeights, page: number): RankedCompany[] {
  const ranked = orgs
    .filter((org) => phaseOneCountry(org.country, org.place))
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
      return { id: org.id, domain: org.domain, name: org.name, region, score, inputs, page, status: "queued" as const, organization: org };
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

function phaseOneCountry(country: string, place: string) {
  const hay = `${country} ${place}`.toLowerCase();
  if (hay.includes("canada")) return true;
  if (hay.includes("united states") || hay.includes("usa") || hay.includes("u.s.")) return true;
  return false;
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

export function regionForDraw(cursor: number, split: { canada: number; us: number } = HUNTER_REGION_SPLIT): "canada" | "us" {
  const cycle = searchRegionCycle({ canada: split.canada, us: split.us } as typeof HUNTER_REGION_SPLIT);
  const slot = cycle[cursor % cycle.length] ?? "canada";
  return slot === "us" ? "us" : "canada";
}

export function collectRegion(state: CampaignState, region: "canada" | "us", known: Set<string>, limit: number): { state: CampaignState; taken: RankedCompany[] } {
  const taken: RankedCompany[] = [];
  const queued = state.queued.map((row) => ({ ...row }));
  for (const row of queued) {
    if (taken.length >= limit) break;
    if (row.status !== "queued" || row.region !== region) continue;
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

export function takeQueued(state: CampaignState, known: Set<string>, limit: number): { state: CampaignState; taken: RankedCompany[]; region: "canada" | "us" } {
  const region = regionForDraw(state.drawCursor, state.split);
  const collected = collectRegion(state, region, known, limit);
  return { state: { ...collected.state, drawCursor: state.drawCursor + 1 }, taken: collected.taken, region };
}

export function acceptPage(state: CampaignState, region: "canada" | "us", organizations: ApolloOrganization[], today: string): { state: CampaignState; added: number; stopPulls: boolean } {
  const fresh = organizations.filter((org) => !state.seenIds.includes(org.id) && phaseOneCountry(org.country, org.place));
  const stopPulls = organizations.length > 0 && fresh.length === 0;
  if (stopPulls) {
    return { state: { ...state, exhausted: { ...state.exhausted, [region]: true } }, added: 0, stopPulls: true };
  }
  const ranked = rankOrganizations(fresh, region, state.weights, state.nextPage[region]);
  const knownIds = new Set(state.seenIds);
  for (const row of ranked) knownIds.add(row.id);
  return {
    state: {
      ...state,
      seenIds: [...knownIds],
      queued: [...state.queued, ...ranked],
      nextPage: { ...state.nextPage, [region]: state.nextPage[region] + 1 },
      pagesPulled: { ...state.pagesPulled, [region]: state.pagesPulled[region] + 1 },
      exhausted: { ...state.exhausted, [region]: organizations.length === 0 },
      creditsMonth: today.slice(0, 7),
    },
    added: ranked.length,
    stopPulls: false,
  };
}

export function needsAnotherPage(state: CampaignState, region: "canada" | "us") {
  if (state.exhausted[region]) return false;
  if (state.pagesPulled[region] >= CAMPAIGN_PAGES_PER_REGION) return false;
  return !state.queued.some((row) => row.region === region && row.status === "queued");
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
