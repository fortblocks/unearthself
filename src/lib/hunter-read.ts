/**
 * Read-only view for the Hunter bot in Grok Bot.
 * GET /api/hunter/read with Authorization: Bearer $HUNTER_READ_TOKEN.
 * The token is not logged. The response has no secrets and writes nothing.
 */

import { createHash, timingSafeEqual } from "node:crypto";
import { getRedisClient, loadBook } from "./leads-book.ts";
import { edmontonToday } from "./lead-score.ts";
import { countsForToday } from "./hunter-cap.ts";
import { readHunterRuns } from "./hunter-runs.ts";
import { capSpend, monthSpendFromCounts, spendCounterKey, spendEstimateKey, spendTicksKey } from "./hunter-phase.ts";
import { loadHunterState } from "./leads-hunter.ts";

const NO_STORE = { "cache-control": "no-store" };

/** New routes refuse a token that is missing or shorter than this. The read snapshot does not. */
export const TOKEN_MIN_LENGTH = 32;

const CARD_VIEWS = new Set(["qualifying", "in-sequence", "outreach", "card"]);

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
  if (!view || view === "snapshot") {
    const token = process.env.HUNTER_READ_TOKEN ?? "";
    if (!hunterReadAuthorized(request.headers.get("authorization"), token)) {
      return Response.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
    }
    try {
      const body = await readHunterSnapshot();
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
