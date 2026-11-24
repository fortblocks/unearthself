/**
 * Read-only view for the Hunter bot in Grok Bot.
 * GET /api/hunter/read with Authorization: Bearer $HUNTER_READ_TOKEN.
 * The token is not logged. The response has no secrets and writes nothing.
 */

import { createHash, timingSafeEqual } from "node:crypto";
import { getRedisClient, loadBook } from "./leads-book.ts";
import { edmontonToday, type Company } from "./lead-score.ts";
import { countsForToday } from "./hunter-cap.ts";
import { readHunterRuns, type HunterRunEntry } from "./hunter-runs.ts";
import { addDays, capSpend, methodStats, monthSpendFromCounts, spendCounterKey, spendEstimateKey, spendTicksKey } from "./hunter-phase.ts";
import { HUNTER_CAMPAIGN_KEY, loadCampaignState, segmentById, weekStartMonday } from "./hunter-campaign.ts";
import { loadHunterState } from "./leads-hunter.ts";

const NO_STORE = { "cache-control": "no-store" };

/** New routes refuse a token that is missing or shorter than this. The read snapshot does not. */
export const TOKEN_MIN_LENGTH = 32;

const CARD_VIEWS = new Set(["qualifying", "in-sequence", "outreach", "card", "queued"]);

/** Constant-time compare for a token that is long enough to be configured. Shorter tokens never match. */
export function bearerConfigured(header: string | null, raw: string | undefined) {
  const token = (raw ?? "").trim();
  if (token.length < TOKEN_MIN_LENGTH) return false;
  return hunterReadAuthorized(header, token);
}

/** Constant-time compare. A missing token never matches. */
export function hunterReadAuthorized(header: string | null, token: string) {
  const expected = token.trim();
  if (!expected) return false;
  const presented = (header ?? "").trim();
  const value = /^bearer\s+/i.test(presented) ? presented.replace(/^bearer\s+/i, "").trim() : "";
  const left = createHash("sha256").update(value).digest();
  const right = createHash("sha256").update(expected).digest();
  return timingSafeEqual(left, right);
}

export async function handleHunterRead(request: Request) {
  if (request.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: NO_STORE });
  }
  let view = "";
  try {
    view = new URL(request.url).searchParams.get("view")?.trim() ?? "";
  } catch {
    view = "";
  }
  if (!view || view === "snapshot" || view === "weekly") {
    const token = process.env.HUNTER_READ_TOKEN ?? "";
    if (!hunterReadAuthorized(request.headers.get("authorization"), token)) {
      return Response.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
    }
    try {
      const body = view === "weekly" ? await readHunterWeekly() : await readHunterSnapshot();
      return Response.json(body, { status: 200, headers: NO_STORE });
    } catch {
      return Response.json({ error: "Unavailable", retryable: true }, { status: 503, headers: NO_STORE });
    }
  }
  if (!CARD_VIEWS.has(view)) {
    return Response.json({ error: "invalid", field: "view" }, { status: 400, headers: NO_STORE });
  }
  if (!bearerConfigured(request.headers.get("authorization"), process.env.HUNTER_CARDS_TOKEN)) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
  }
  try {
    const { handleCardRead } = await import("./hunter-outreach.ts");
    return await handleCardRead(new URL(request.url));
  } catch {
    return Response.json({ error: "Unavailable", retryable: true }, { status: 503, headers: NO_STORE });
  }
}

export async function readHunterSnapshot(now = new Date()) {
  const today = edmontonToday(now);
  const state = await loadHunterState();
  const counts = countsForToday(state, today);
  const redis = await getRedisClient();
  const month = today.slice(0, 7);
  const cents = Number(redis ? await redis.get<string>(spendCounterKey(month)) : 0);
  const ticks = Number(redis ? await redis.get<string>(spendTicksKey(month)) : 0);
  const estimate = Number(redis ? await redis.get<string>(spendEstimateKey(month)) : 0);
  const spend = monthSpendFromCounts(
    Number.isFinite(cents) ? cents : 0,
    Number.isFinite(ticks) ? ticks : 0,
    Number.isFinite(estimate) ? estimate : 0,
  );
  const runs = (await readHunterRuns(20)).map((entry) => ({
    at: entry.at,
    run: entry.run,
    outcome: entry.outcome,
    calls: entry.modelCalls,
    candidates: entry.candidates,
    cardsFiled: entry.cardsFiled,
    contactReady: entry.contactReady,
    alarms: entry.alarms,
    outcomeNote: entry.error.replace(/https?:\/\/\S+/gi, "").slice(0, 180),
    dollars: entry.dollars,
    estimatedDollars: entry.estimatedDollars,
    funnel: entry.funnel,
  }));
  const book = redis ? await loadBook() : null;
  const cards = (book?.book.companies ?? [])
    .filter((company) => company.source === "hunter" || company.source === "scout" || company.hunterScore != null)
    .slice(0, 40)
    .map((company) => ({
      org: company.org,
      domain: company.domain,
      status: company.review ?? "unreviewed",
      score: company.hunterScore ?? null,
      filedOn: company.filedOn ?? company.scoutBatch ?? "",
      pipeline: company.pipeline ?? "",
    }));
  return {
    paused: state.paused,
    today: {
      date: today,
      calls: counts.callsToday,
      cardsFiled: counts.filedToday,
      spendActual: spend.actual,
      spendEstimated: spend.estimated,
      spendTowardCap: capSpend(spend),
    },
    runs,
    cards,
  };
}

export type ReviewedCounts = {
  approved: number;
  skipped: number;
  expired: number;
  unreviewed: number;
};

export type OutcomeCounts = {
  cardsFiled: number;
  contactReady: number;
  reviewed: ReviewedCounts;
  sent: number;
  replied: number;
  booked: number;
  won: number;
  lost: number;
};

export type WeekWindow = { start: string; end: string };

/** Monday-Sunday weeks in America/Edmonton, using the same Monday the campaign uses. */
export function edmontonWeekRanges(today: string): { weekStart: string; weekToDate: WeekWindow; lastWeek: WeekWindow } {
  const weekStart = weekStartMonday(today);
  return {
    weekStart,
    weekToDate: { start: weekStart, end: today },
    lastWeek: { start: addDays(weekStart, -7), end: addDays(weekStart, -1) },
  };
}

export function dateInRange(iso: string, start: string, end: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) && iso >= start && iso <= end;
}

export function hasNamedContact(card: { buyerName?: string; buyerTitle?: string; email?: string }) {
  return Boolean(card.buyerName?.trim() && card.buyerTitle?.trim() && card.email?.trim());
}

export function segmentIdFromQuery(query: string) {
  const match = /(?:^|\|)campaign:(tech|energy|professional|healthcare)(?:\||$)/.exec(query);
  return match?.[1] ?? "";
}

function emptyCounts(): OutcomeCounts {
  return {
    cardsFiled: 0,
    contactReady: 0,
    reviewed: { approved: 0, skipped: 0, expired: 0, unreviewed: 0 },
    sent: 0,
    replied: 0,
    booked: 0,
    won: 0,
    lost: 0,
  };
}

function addOutcome(counts: OutcomeCounts, card: Company) {
  counts.cardsFiled += 1;
  if (hasNamedContact(card)) counts.contactReady += 1;
  const review = card.review ?? "unreviewed";
  if (review === "approved") counts.reviewed.approved += 1;
  else if (review === "skipped") counts.reviewed.skipped += 1;
  else if (review === "expired-unreviewed") counts.reviewed.expired += 1;
  else counts.reviewed.unreviewed += 1;
  const pipeline = card.pipeline ?? "";
  if (pipeline === "sent" || pipeline === "replied" || pipeline === "booked" || pipeline === "won") counts.sent += 1;
  if (pipeline === "replied" || pipeline === "booked" || pipeline === "won") counts.replied += 1;
  if (pipeline === "booked" || pipeline === "won") counts.booked += 1;
  if (pipeline === "won") counts.won += 1;
  if (pipeline === "lost") counts.lost += 1;
}

function breakdown(rows: Map<string, OutcomeCounts>, labelFor: (id: string) => string) {
  return [...rows.entries()].map(([id, counts]) => ({ id, label: labelFor(id), ...counts }));
}

/** Card outcomes inside one Edmonton date window. Lookups and spend are not split here. */
export function tallyOutcomeCards(cards: Company[], start: string, end: string) {
  const counts = emptyCounts();
  const bySegment = new Map<string, OutcomeCounts>();
  const bySector = new Map<string, OutcomeCounts>();
  const listed: {
    org: string;
    domain: string;
    segment: string;
    industry: string;
    contactReady: boolean;
    filedOn: string;
    review: string;
    pipeline: string;
  }[] = [];
  for (const card of cards) {
    const filed = card.filedOn ?? "";
    const batch = card.scoutBatch ?? "";
    const on = /^\d{4}-\d{2}-\d{2}$/.test(filed) ? filed : /^\d{4}-\d{2}-\d{2}$/.test(batch) ? batch : "";
    if (!dateInRange(on, start, end)) continue;
    addOutcome(counts, card);
    const segment = segmentIdFromQuery(card.lineage?.query ?? "") || "unassigned";
    const industry = card.industry?.trim() || "unknown";
    const segmentRow = bySegment.get(segment) ?? emptyCounts();
    addOutcome(segmentRow, card);
    bySegment.set(segment, segmentRow);
    const sectorRow = bySector.get(industry) ?? emptyCounts();
    addOutcome(sectorRow, card);
    bySector.set(industry, sectorRow);
    listed.push({
      org: card.org,
      domain: card.domain,
      segment,
      industry,
      contactReady: hasNamedContact(card),
      filedOn: on,
      review: card.review ?? "unreviewed",
      pipeline: card.pipeline ?? "",
    });
  }
  return {
    counts,
    bySegment: breakdown(bySegment, (id) => (id === "unassigned" ? "Unassigned" : segmentById(id).label)),
    bySector: breakdown(bySector, (id) => id),
    cards: listed,
  };
}

export function tallyRunWindow(runs: Pick<HunterRunEntry, "at" | "apolloReveals" | "dollars">[], start: string, end: string) {
  let apolloEmailLookups = 0;
  let xaiSpend = 0;
  for (const run of runs) {
    const stamp = Date.parse(run.at);
    if (!Number.isFinite(stamp)) continue;
    const day = edmontonToday(new Date(stamp));
    if (!dateInRange(day, start, end)) continue;
    if (Number.isFinite(run.apolloReveals) && run.apolloReveals > 0) apolloEmailLookups += run.apolloReveals;
    if (typeof run.dollars === "number" && Number.isFinite(run.dollars)) xaiSpend += run.dollars;
  }
  return { apolloEmailLookups, xaiSpend: Math.round(xaiSpend * 10000) / 10000 };
}

function withSpend(counts: OutcomeCounts, runs: Pick<HunterRunEntry, "at" | "apolloReveals" | "dollars">[], window: WeekWindow) {
  return { ...counts, window, ...tallyRunWindow(runs, window.start, window.end) };
}

/** Enough recent runs to cover the previous Edmonton week and the week so far. */
const WEEKLY_RUN_READ = 800;

/** Read-only Monday plan. The snapshot route stays the short view. */
export async function readHunterWeekly(now = new Date()) {
  const today = edmontonToday(now);
  const ranges = edmontonWeekRanges(today);
  const redis = await getRedisClient();
  const book = redis ? await loadBook() : null;
  const companies = book?.book.companies ?? [];
  const runs = await readHunterRuns(WEEKLY_RUN_READ);
  const last = tallyOutcomeCards(companies, ranges.lastWeek.start, ranges.lastWeek.end);
  const current = tallyOutcomeCards(companies, ranges.weekToDate.start, ranges.weekToDate.end);
  const campaign = loadCampaignState(redis ? await redis.get(HUNTER_CAMPAIGN_KEY) : null, today);
  const segment = segmentById(campaign.segmentId);
  const suggestion = segmentById(campaign.suggestionId || campaign.segmentId);
  const state = await loadHunterState();
  const month = today.slice(0, 7);
  const cents = Number(redis ? await redis.get<string>(spendCounterKey(month)) : 0);
  const ticks = Number(redis ? await redis.get<string>(spendTicksKey(month)) : 0);
  const estimate = Number(redis ? await redis.get<string>(spendEstimateKey(month)) : 0);
  const spend = monthSpendFromCounts(
    Number.isFinite(cents) ? cents : 0,
    Number.isFinite(ticks) ? ticks : 0,
    Number.isFinite(estimate) ? estimate : 0,
  );
  return {
    today,
    weekStart: ranges.weekStart,
    previousWeek: ranges.lastWeek,
    campaign: {
      segmentId: segment.id,
      segment: segment.label,
      source: campaign.segmentSource === "hunter" ? "Hunter's choice" : "Build",
      suggestionId: suggestion.id,
      suggestion: suggestion.label,
      suggestionReason: campaign.suggestionReason,
      planNote: campaign.planNote,
      split: { canada: campaign.split.canada, us: campaign.split.us },
      splitReason: campaign.splitReason,
      weights: campaign.weights,
      weightNote: campaign.weightNote,
      canadaSize: campaign.canadaSize,
      usSize: campaign.usSize,
      nextPage: campaign.nextPage,
      pagesPulled: campaign.pagesPulled,
      exhausted: campaign.exhausted,
      seenCount: campaign.seenIds.length,
      switches: campaign.switches,
    },
    lastWeek: withSpend(last.counts, runs, ranges.lastWeek),
    weekToDate: withSpend(current.counts, runs, ranges.weekToDate),
    bySegment: { lastWeek: last.bySegment, weekToDate: current.bySegment },
    bySector: { lastWeek: last.bySector, weekToDate: current.bySector },
    methods: methodStats(companies, spend.actual),
    paused: state.paused,
    cards: [...last.cards, ...current.cards],
  };
}
