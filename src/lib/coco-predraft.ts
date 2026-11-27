/**
 * After the day's leads are filed and scored, draft a few of them.
 * Queued, rate-limited, and skipped once the monthly cap is spent.
 * Nothing here sends mail. Approve still belongs to Christopher.
 */

import { HUNTER_DAILY_CARD_TARGET } from "../data/hunter-profile.ts";
import { cocoLetter, NEEDS_RESEARCH_REASON } from "./coco-letter.ts";
import { isContactReady } from "./hunter-cap.ts";
import {
  COCO_PREDRAFT_BY,
  clearLeakedDrafts,
  cocoBlockReasons,
  markNeedsResearch,
  readOutreachMap,
  storeBackgroundDraft,
  wakeCocoDraft,
  type OutreachRecord,
  type WakeFetch,
} from "./hunter-outreach.ts";
import {
  capSpend,
  monthlyCapState,
  monthSpendFromCounts,
  reserveCounter,
  spendCounterKey,
  spendEstimateKey,
  spendTicksKey,
  type DncEntry,
} from "./hunter-phase.ts";
import { leadOnDesk } from "./lead-card-view.ts";
import { getRedisClient, loadBook, type LeadsRedis } from "./leads-book.ts";
import { loadDoNotContact } from "./leads-hunter.ts";
import { edmontonToday, type Company } from "./lead-score.ts";

/** How many cards one pass may draft. The hunter cron is every half hour, so a full day stays inside the file ceiling. */
export const COCO_PREDRAFT_BURST = 4;

export function predraftCounterKey(today: string) {
  return `unearth:coco:predraft:v1:${today}`;
}

function predraftCandidate(
  company: Company,
  records: ReadonlyMap<string, OutreachRecord>,
  dnc: DncEntry[],
  today: string,
) {
  if (company.filedOn !== today) return false;
  if (typeof company.hunterScore !== "number") return false;
  if (company.review === "skipped" || company.review === "expired-unreviewed") return false;
  if (!isContactReady(company) || !leadOnDesk(company)) return false;
  const record = records.get(company.id) ?? null;
  if (record?.draftSkipped?.reason === NEEDS_RESEARCH_REASON) return false;
  if (cocoBlockReasons(company, record, dnc, today).length > 0) return false;
  if (record?.draftRejected?.check) return false;
  if (record?.firstSentAt || record?.sendApproved || (record?.touches ?? 0) > 0) return false;
  const draft = record?.drafts?.["1"];
  if (draft?.subject || draft?.body || draft?.editedBody) return false;
  return true;
}

export function selectPredraftCompanies(
  companies: readonly Company[],
  records: ReadonlyMap<string, OutreachRecord>,
  dnc: DncEntry[],
  today: string,
) {
  return companies
    .filter((company) => predraftCandidate(company, records, dnc, today) && cocoLetter(company))
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** Contact-ready cards with nothing specific to quote. They are marked, not drafted. */
export function selectNeedsResearchCompanies(
  companies: readonly Company[],
  records: ReadonlyMap<string, OutreachRecord>,
  dnc: DncEntry[],
  today: string,
) {
  return companies
    .filter((company) => predraftCandidate(company, records, dnc, today) && !cocoLetter(company))
    .sort((a, b) => a.id.localeCompare(b.id));
}

async function spentDollars(redis: LeadsRedis, month: string) {
  const cents = Number(await redis.get<string>(spendCounterKey(month)));
  const ticks = Number(await redis.get<string>(spendTicksKey(month)));
  const estimate = Number(await redis.get<string>(spendEstimateKey(month)));
  return capSpend(
    monthSpendFromCounts(
      Number.isFinite(cents) ? cents : 0,
      Number.isFinite(ticks) ? ticks : 0,
      Number.isFinite(estimate) ? estimate : 0,
    ),
  );
}

export type PredraftResult = {
  drafted: string[];
  flagged: string[];
  needsResearch: string[];
  stopped: "" | "spend" | "cap";
};

/**
 * Drafts up to one burst of today's scored leads.
 * Stops when the monthly cap is spent or the daily draft count is full.
 * Wakes Coco only for a letter that passed the check, and only through the existing webhook.
 */
export async function predraftFiledLeads(options?: { today?: string; fetchImpl?: WakeFetch }): Promise<PredraftResult> {
  const empty: PredraftResult = { drafted: [], flagged: [], needsResearch: [], stopped: "" };
  const redis = await getRedisClient();
  if (!redis) return empty;
  const today = options?.today ?? edmontonToday();
  await clearLeakedDrafts();
  let spent: number | null = null;
  try {
    spent = await spentDollars(redis, today.slice(0, 7));
  } catch {
    spent = null;
  }
  const cap = monthlyCapState(spent);
  if (cap === "stop" || cap === "unknown") return { ...empty, stopped: "spend" };
  const loaded = await loadBook();
  if (loaded.storage !== "redis") return empty;
  const dnc = await loadDoNotContact(redis);
  const refreshed = await loadBook();
  const book = refreshed.storage === "redis" ? refreshed.book : loaded.book;
  const freshRecords = await readOutreachMap(redis);
  const needsResearch: string[] = [];
  for (const company of selectNeedsResearchCompanies(book.companies, freshRecords, dnc, today)) {
    const marked = await markNeedsResearch(company.id);
    if (marked) needsResearch.push(company.id);
  }
  const afterMarks = await readOutreachMap(redis);
  const waiting = selectPredraftCompanies(book.companies, afterMarks, dnc, today).slice(0, COCO_PREDRAFT_BURST);
  const drafted: string[] = [];
  const flagged: string[] = [];
  for (const company of waiting) {
    const reserved = await reserveCounter(redis, predraftCounterKey(today), HUNTER_DAILY_CARD_TARGET);
    if (!reserved.allowed) return { drafted, flagged, needsResearch, stopped: "cap" };
    const letter = cocoLetter(company);
    if (!letter) {
      await redis.decr(predraftCounterKey(today));
      const marked = await markNeedsResearch(company.id);
      if (marked) needsResearch.push(company.id);
      continue;
    }
    const outcome = await storeBackgroundDraft({ company, subject: letter.subject, body: letter.body });
    if (outcome === "skipped" || outcome === "unavailable") {
      await redis.decr(predraftCounterKey(today));
      if (outcome === "unavailable") break;
      continue;
    }
    if (outcome === "flagged") {
      flagged.push(company.id);
      continue;
    }
    drafted.push(company.id);
    try {
      await wakeCocoDraft(company.id, options?.fetchImpl);
    } catch {
      // The letter is already filed. A missed wake does not mark the draft failed.
    }
  }
  console.info(JSON.stringify({ coco: "predraft", by: COCO_PREDRAFT_BY, drafted: drafted.length, flagged: flagged.length, needsResearch: needsResearch.length }));
  return { drafted, flagged, needsResearch, stopped: "" };
}
