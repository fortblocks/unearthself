/**
 * Buyer fit is a judgement, not a title list.
 * Hunter asks the same Grok model it already uses whether this contact
 * would buy a hotel spa team retreat in Drumheller. The model sees the
 * company and the role. It does not see a checklist of job titles.
 */

import { edmontonToday } from "./lead-score.ts";
import { callXaiJson, HUNTER_SEARCH_MODEL, type XaiUsage } from "./xai-search.ts";

export const BUYER_JUDGMENT_MODEL = HUNTER_SEARCH_MODEL;

export const BUYER_JUDGMENT_SYSTEM = [
  "You decide whether this contact is a clear prospective buyer for a hotel spa team retreat in Drumheller, Alberta.",
  "Reason from the company and from the person's role.",
  "Use the company's size, industry, location, how the team is set up, and any signals you are given.",
  "There is no fixed list of job titles. A title is one clue, not a rule.",
  'Return JSON only: {"buyer": true or false, "confidence": "low" or "medium" or "high", "reason": "one or two sentences", "fit": {"band": "strong" or "maybe" or "weak", "reason": "one line"}}.',
  "Rate how well the company fits the Drumheller team-retreat customer against the profile signals you are given.",
  "Set buyer to true only when you are clear this person would buy the retreat for their team.",
  "A staffing firm, a recruiter, a job board, an outsourcing shop, or an IT consultancy is not a buyer.",
  "A company of several thousand people, with no stated local team, is not a buyer.",
  "A missing homepage is not, by itself, a reason for confidence low when place, industry, or headcount is stated.",
  "When headcount is not stated, a company in Canada can still be a clear buyer at medium confidence if it is not one of those excluded company types.",
  "A company in the United States with no stated headcount and no stated Canadian team is not a clear buyer.",
  "Use confidence low when the company type or the role is a poor fit.",
  "The reason must not include a person's name, an email address, or a phone number.",
  "Do not invent facts that were not given.",
].join(" ");

export type BuyerConfidence = "low" | "medium" | "high";

export type BuyerJudgment = {
  buyer: boolean;
  confidence: BuyerConfidence;
  reason: string;
  model: string;
};

export type FitBand = "strong" | "maybe" | "weak";

/** Shadow rating. It does not decide filing, the desk, or Coco's qualifying order. */
export type FitRating = {
  band: FitBand;
  reason: string;
  ratedOn: string;
  model: string;
};

export type BuyerJudgmentInput = {
  org: string;
  domain: string;
  place: string;
  city: string;
  industry: string;
  /** Apollo headcount when the company row includes one. Blank stays unstated. */
  headcount?: string;
  /** Employee range, such as 1-49. The stored size band is this value. */
  sizeBand: string;
  signals: string;
  role: string;
  /** Short excerpt already fetched. Blank when the homepage was not read. */
  pageText?: string;
};

export type BuyerJudgmentResult =
  | { ok: true; judgment: BuyerJudgment; fit?: FitRating | null; usage: XaiUsage }
  | { ok: false; usage: XaiUsage };

const EMPTY_USAGE: XaiUsage = { inputTokens: 0, outputTokens: 0, dollars: null };

type TestJudge = (input: BuyerJudgmentInput) => Promise<BuyerJudgmentResult>;

let testJudge: TestJudge | null = null;

/** Tests pass a fake judgement so a run does not call xAI. Production leaves this unset. */
export function useBuyerJudgeForTests(judge: TestJudge | null) {
  testJudge = judge;
}

function stated(value: string | undefined) {
  const text = (value ?? "").trim();
  return text || "not stated";
}

export function buyerJudgmentPrompt(input: BuyerJudgmentInput) {
  return [
    `Company: ${stated(input.org)}`,
    `Domain: ${stated(input.domain)}`,
    `Place: ${stated(input.place)}`,
    `City: ${stated(input.city)}`,
    `Industry: ${stated(input.industry)}`,
    `Headcount: ${stated(input.headcount)}`,
    `Employee range: ${stated(input.sizeBand)}`,
    `Signals: ${(input.signals ?? "").trim() || "none"}`,
    `Role: ${stated(input.role)}`,
    `Page text: ${stated(input.pageText)}`,
    "",
    "Is this contact a clear prospective buyer for a hotel spa team retreat in Drumheller, Alberta?",
    "Judge from the company context and the role. Do not use a fixed title list.",
  ].join("\n");
}

/** Drop an email address or a phone number if the model put one in the reason. Keep two sentences. */
export function publicJudgmentReason(reason: string) {
  const cleaned = reason
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "";
  const sentences = cleaned.split(/(?<=[.!?])\s+/).slice(0, 2).join(" ");
  return sentences.slice(0, 320);
}

export function parseBuyerJudgment(payload: unknown): BuyerJudgment | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const record = payload as Record<string, unknown>;
  if (typeof record.buyer !== "boolean") return null;
  const confidence = record.confidence;
  if (confidence !== "low" && confidence !== "medium" && confidence !== "high") return null;
  if (typeof record.reason !== "string") return null;
  const reason = publicJudgmentReason(record.reason);
  if (!reason) return null;
  return { buyer: record.buyer, confidence, reason, model: BUYER_JUDGMENT_MODEL };
}

/** A missing or malformed band is ignored. The buyer judgement still stands. */
export function parseFitRating(payload: unknown, ratedOn: string): FitRating | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ratedOn)) return null;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const fit = (payload as { fit?: unknown }).fit;
  if (!fit || typeof fit !== "object" || Array.isArray(fit)) return null;
  const band = (fit as { band?: unknown }).band;
  if (band !== "strong" && band !== "maybe" && band !== "weak") return null;
  const raw = (fit as { reason?: unknown }).reason;
  if (typeof raw !== "string") return null;
  const reason = publicJudgmentReason(raw);
  if (!reason) return null;
  return { band, reason, ratedOn, model: BUYER_JUDGMENT_MODEL };
}

/** A clear buyer is a yes the model is not unsure about. Low confidence is not filed. */
export function isClearBuyer(judgment: { buyer: boolean; confidence: string }) {
  return judgment.buyer === true && (judgment.confidence === "medium" || judgment.confidence === "high");
}

export function isStoredJudgment(value: unknown): value is BuyerJudgment {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<BuyerJudgment>;
  return (
    typeof record.buyer === "boolean" &&
    (record.confidence === "low" || record.confidence === "medium" || record.confidence === "high") &&
    typeof record.reason === "string" &&
    record.reason.trim().length > 0
  );
}

export async function judgeBuyerFit(input: BuyerJudgmentInput, opts?: { timeoutMs?: number }): Promise<BuyerJudgmentResult> {
  if (testJudge) {
    try {
      return await testJudge(input);
    } catch {
      return { ok: false, usage: EMPTY_USAGE };
    }
  }
  const timeoutMs = Math.max(1_000, Math.min(20_000, opts?.timeoutMs ?? 20_000));
  const called = await callXaiJson(BUYER_JUDGMENT_SYSTEM, buyerJudgmentPrompt(input), timeoutMs);
  if ("error" in called) return { ok: false, usage: EMPTY_USAGE };
  await rememberSpend(called.usage);
  const judgment = parseBuyerJudgment(called.json);
  if (!judgment) return { ok: false, usage: called.usage };
  return { ok: true, judgment, fit: parseFitRating(called.json, edmontonToday()), usage: called.usage };
}

async function rememberSpend(usage: XaiUsage) {
  if (!usage.inputTokens && !usage.outputTokens && usage.dollars == null) return;
  try {
    const { noteModelSpend } = await import("./hunter-phase.ts");
    const { getRedisClient } = await import("./leads-book.ts");
    const { edmontonToday } = await import("./lead-score.ts");
    const redis = await getRedisClient();
    if (!redis) return;
    const month = edmontonToday().slice(0, 7);
    await noteModelSpend(redis, month, usage.dollars);
  } catch {
    // A spend note must not turn a real judgement into a guess, and it must not throw into the run.
  }
}
