/**
 * Named settings for Hunter. A value Chris has not set stays unset or uses the labelled default.
 * Nothing here is a price. Dollar amounts come from the model response, or they stay unknown.
 */

import { HUNTER_DAILY_CALL_BUDGET_DEFAULT, HUNTER_DAILY_CARD_TARGET } from "../data/hunter-profile.ts";
import { HUNTER_SEARCH_MODEL } from "./xai-search.ts";

/** Pinned model for Hunter web search. Minutes keep their own model id. */
export const HUNTER_MODEL_ID = HUNTER_SEARCH_MODEL;

export const HUNTER_PROMPT_VERSION = "2026-11-19.1";
export const HUNTER_SCORE_VERSION = "hunter-profile-v1";
export const HUNTER_METHOD_ID = "xai-web-search";

/** 48 is a ceiling. Hunter does not pad the day up to this number. */
export const HUNTER_CARD_CEILING = HUNTER_DAILY_CARD_TARGET;

/**
 * Every card filed in an Edmonton day, research cards included.
 * 48 matches the contact-ready ceiling so a day never asks for more reviews than that number.
 * Env HUNTER_DAILY_FILED_CAP.
 */
export const HUNTER_DAILY_FILED_CAP_DEFAULT = 48;

/**
 * Do not start another pass once this much of the 300 second function limit is gone.
 * The whole-run deadline below is the hard stop. This one still skips a later pass.
 */
export const HUNTER_PASS_BUDGET_MS = 200_000;

/**
 * Time kept at the end of the 300 second function limit for the book save, the run log, and alarms.
 * Work (search, pages, MX, Apollo) stops when this reserve is all that is left.
 */
export const HUNTER_RUN_RESERVE_MS = 40_000;

/** Alarm posts use a short timeout so a hung receiver cannot use the rest of the run. */
export const HUNTER_ALARM_TIMEOUT_MS = 8_000;

/**
 * Published rates for grok-4.20-0309-non-reasoning.
 * Source: https://docs.x.ai/docs/pricing, read 19th November 2026.
 * Below XAI_LONG_PROMPT_TOKENS, input is XAI_INPUT_USD_PER_MILLION and output is XAI_OUTPUT_USD_PER_MILLION.
 * At that prompt size or above, both rates double for every token in the request, not only the tokens past the line.
 * Each web_search tool call is XAI_WEB_SEARCH_USD, which is 5 US dollars per 1,000 calls.
 * Cached prompt tokens are billed at the input rate, not the lower published cache rate, so the estimate stays high.
 */
export const XAI_LONG_PROMPT_TOKENS = 200_000;
export const XAI_INPUT_USD_PER_MILLION = 1.25;
export const XAI_OUTPUT_USD_PER_MILLION = 2.5;
export const XAI_LONG_INPUT_USD_PER_MILLION = 2.5;
export const XAI_LONG_OUTPUT_USD_PER_MILLION = 5;
export const XAI_WEB_SEARCH_USD = 0.005;

/**
 * Last-resort US dollars for one model call that has no cost field and no token or search counts to price.
 * This is not an xAI price and is never stored as an actual cost.
 * It is counted toward the monthly cap so one missing cost cannot leave the cap open.
 * The run log marks these dollars as estimated.
 */
export const HUNTER_ESTIMATED_CALL_DOLLARS = 0.25;

/** Skip-list in the prompt. Domains past this are still filtered after the search. */
export const HUNTER_PROMPT_DOMAIN_CHARS = 12_000;

/** Default daily model-call budget. Env HUNTER_DAILY_CALL_BUDGET overrides it. */
export const HUNTER_CALL_BUDGET_DEFAULT = HUNTER_DAILY_CALL_BUDGET_DEFAULT;

/**
 * Working window in America/Edmonton, inclusive start, exclusive end.
 * 7 and 19 means 7:00am through 6:59pm. Env HUNTER_WORK_START_HOUR and HUNTER_WORK_END_HOUR.
 */
export const HUNTER_WORK_START_HOUR_DEFAULT = 7;
export const HUNTER_WORK_END_HOUR_DEFAULT = 19;

/**
 * Calls inside one always-on run.
 * 12 hours, every 30 minutes, is 24 runs. 3 calls a run is 72 calls, so the 55-call budget can be reached.
 * The budget counter is still the hard stop. The cron schedule is unchanged.
 * Env HUNTER_CALLS_PER_RUN.
 */
export const HUNTER_CALLS_PER_RUN_DEFAULT = 3;

/** Longer than the 300 second function limit, so a slow run cannot overlap the next one. */
export const HUNTER_LOCK_TTL_SECONDS = 360;
export const HUNTER_FUNCTION_MAX_SECONDS = 300;

/** Work stops here. The function limit minus the reserve kept for the save, the log, and alarms. */
export const HUNTER_RUN_DEADLINE_MS = HUNTER_FUNCTION_MAX_SECONDS * 1000 - HUNTER_RUN_RESERVE_MS;

/** Last moment for an alarm post, still inside the function limit. */
export const HUNTER_RUN_WALL_MS = HUNTER_FUNCTION_MAX_SECONDS * 1000 - 5_000;

/** Extra attempts after the first. 2 means 3 tries, then the run stops. Env HUNTER_MAX_RETRIES. */
export const HUNTER_MAX_RETRIES_DEFAULT = 2;

/** Do-not-contact cooldown. Env HUNTER_DNC_COOLDOWN_DAYS. */
export const HUNTER_DNC_COOLDOWN_DAYS_DEFAULT = 90;

/** Unreviewed cards become expired unreviewed after this many Edmonton days. Env HUNTER_REVIEW_DAYS. */
export const HUNTER_REVIEW_DAYS_DEFAULT = 5;

/**
 * Share of effort reserved for a trial method, once one exists.
 * Only the existing web search method exists, and it is on, so this share is unassigned.
 * Env HUNTER_TRIAL_SHARE, clamped to 0.20 through 0.30.
 */
export const HUNTER_TRIAL_SHARE_DEFAULT = 0.2;

/**
 * Hunter score floor. Profile is up to 50, access up to 25, timing up to 15, travel 1 to 10.
 * A card with no verified profile signal lands near travel plus a bare source, about 5.
 * 20 asks for real profile evidence (about two signals, or one signal plus a named contact)
 * so the ceiling is not filled with empty research cards.
 * Env HUNTER_QUALITY_FLOOR.
 */
export const HUNTER_QUALITY_FLOOR_DEFAULT = 20;

/** Rates stay "not enough data" until a method has this many reviewed cards. */
export const HUNTER_SAMPLE_FLOOR = 30;

/** During working hours, a missing run line older than this is a late heartbeat. */
export const HUNTER_HEARTBEAT_GAP_MS = 45 * 60 * 1000;

/** Overnight plus one missed slot. Outside working hours the heartbeat uses this gap. */
export const HUNTER_HEARTBEAT_OFF_HOURS_MS = 13 * 60 * 60 * 1000;

export const HUNTER_DNC_KEY = "unearth:hunter:dnc:v1";
export const HUNTER_LOCK_KEY = "unearth:hunter:lock:v1";
export const HUNTER_CALLS_KEY_PREFIX = "unearth:hunter:calls:v1:";
export const HUNTER_APOLLO_KEY_PREFIX = "unearth:hunter:apollo:v1:";
/** Older runs stored whole cents here. New runs add ticks in the key below. Both are read. */
export const HUNTER_SPEND_KEY_PREFIX = "unearth:hunter:spend-cents:v1:";
/** xAI cost ticks. 10^10 ticks is one US dollar. Sub-cent costs stay intact. */
export const HUNTER_SPEND_TICKS_PREFIX = "unearth:hunter:spend-ticks:v1:";
/** Ticks added only because a response had no cost field. Not actual spend. */
export const HUNTER_SPEND_ESTIMATE_PREFIX = "unearth:hunter:spend-estimate-ticks:v1:";
export const HUNTER_SPEND_UNKNOWN_PREFIX = "unearth:hunter:spend-unknown:v1:";
export const HUNTER_ALARM_KEY = "unearth:hunter:alarms:v1";
/** A run writes this when it starts and removes it when it finishes. A kill leaves it behind. */
export const HUNTER_RUN_OPEN_KEY = "unearth:hunter:run-open:v1";

/** Alarm delivery order. Webhook URLs stay unset until deploy. */
export const HUNTER_ALARM_PRIMARY = "Rex";
export const HUNTER_ALARM_COPIES = ["Bo", "Derek"] as const;

/** Known xAI dollars in a calendar month. Apollo credits are not included. Env HUNTER_MONTHLY_DOLLAR_CAP. */
export const HUNTER_MONTHLY_DOLLAR_CAP_DEFAULT = 60;

/** Keys a book reset is allowed to replace. The do-not-contact list is not one of them. */
export const HUNTER_RESET_KEYS = ["unearth:leads:v1", "unearth:hunter:v1"] as const;

function intEnv(name: string, fallback: number, min: number, max: number) {
  const text = (process.env[name] ?? "").trim();
  if (!text) return fallback;
  const n = Number(text);
  if (!Number.isInteger(n) || n < min || n > max) return fallback;
  return n;
}

export function hunterWorkHours(rawStart?: string | null, rawEnd?: string | null) {
  const start = rawStart == null ? intEnv("HUNTER_WORK_START_HOUR", HUNTER_WORK_START_HOUR_DEFAULT, 0, 23) : bounded(rawStart, HUNTER_WORK_START_HOUR_DEFAULT, 0, 23);
  const end = rawEnd == null ? intEnv("HUNTER_WORK_END_HOUR", HUNTER_WORK_END_HOUR_DEFAULT, 1, 24) : bounded(rawEnd, HUNTER_WORK_END_HOUR_DEFAULT, 1, 24);
  if (start >= end) return { start: HUNTER_WORK_START_HOUR_DEFAULT, end: HUNTER_WORK_END_HOUR_DEFAULT };
  return { start, end };
}

function bounded(raw: string, fallback: number, min: number, max: number) {
  const text = raw.trim();
  if (!text) return fallback;
  const n = Number(text);
  if (!Number.isInteger(n) || n < min || n > max) return fallback;
  return n;
}

export function hunterCallsPerRun(raw?: string | null) {
  return raw == null ? intEnv("HUNTER_CALLS_PER_RUN", HUNTER_CALLS_PER_RUN_DEFAULT, 1, 8) : bounded(raw, HUNTER_CALLS_PER_RUN_DEFAULT, 1, 8);
}

export function hunterMaxRetries(raw?: string | null) {
  return raw == null ? intEnv("HUNTER_MAX_RETRIES", HUNTER_MAX_RETRIES_DEFAULT, 0, 3) : bounded(raw, HUNTER_MAX_RETRIES_DEFAULT, 0, 3);
}

export function hunterDncCooldownDays(raw?: string | null) {
  return raw == null
    ? intEnv("HUNTER_DNC_COOLDOWN_DAYS", HUNTER_DNC_COOLDOWN_DAYS_DEFAULT, 1, 3650)
    : bounded(raw, HUNTER_DNC_COOLDOWN_DAYS_DEFAULT, 1, 3650);
}

export function hunterReviewDays(raw?: string | null) {
  return raw == null ? intEnv("HUNTER_REVIEW_DAYS", HUNTER_REVIEW_DAYS_DEFAULT, 1, 90) : bounded(raw, HUNTER_REVIEW_DAYS_DEFAULT, 1, 90);
}

export function hunterDailyFiledCap(raw?: string | null) {
  return raw == null
    ? intEnv("HUNTER_DAILY_FILED_CAP", HUNTER_DAILY_FILED_CAP_DEFAULT, 1, 500)
    : bounded(raw, HUNTER_DAILY_FILED_CAP_DEFAULT, 1, 500);
}

export function hunterQualityFloor(raw?: string | null) {
  return raw == null ? intEnv("HUNTER_QUALITY_FLOOR", HUNTER_QUALITY_FLOOR_DEFAULT, 0, 100) : bounded(raw, HUNTER_QUALITY_FLOOR_DEFAULT, 0, 100);
}

/** Trial share stays inside 20% to 30%. An empty or bad value uses 20%. */
export function hunterTrialShare(raw?: string | null) {
  const text = (raw ?? process.env.HUNTER_TRIAL_SHARE ?? "").trim();
  if (!text) return HUNTER_TRIAL_SHARE_DEFAULT;
  const n = Number(text);
  if (!Number.isFinite(n)) return HUNTER_TRIAL_SHARE_DEFAULT;
  return Math.min(0.3, Math.max(0.2, n));
}

/** US dollars. Chris set 60 on 19th November 2026. An env value replaces the default. */
export function hunterMonthlyDollarCap(raw?: string | null): number | null {
  const text = (raw ?? process.env.HUNTER_MONTHLY_DOLLAR_CAP ?? "").trim();
  if (!text) return HUNTER_MONTHLY_DOLLAR_CAP_DEFAULT;
  const n = Number(text);
  if (!Number.isFinite(n) || n <= 0) return HUNTER_MONTHLY_DOLLAR_CAP_DEFAULT;
  return n;
}

/** Stops both runs. Unset means the kill switch is off. The paused flag is separate. */
export function hunterKilled(raw?: string | null) {
  const text = (raw ?? process.env.HUNTER_KILL_SWITCH ?? "").trim().toLowerCase();
  return text === "1" || text === "true" || text === "on";
}

export function runsPerWorkingDay(start = HUNTER_WORK_START_HOUR_DEFAULT, end = HUNTER_WORK_END_HOUR_DEFAULT) {
  const hours = Math.max(0, end - start);
  return hours * 2;
}

export function callsAvailablePerDay(callsPerRun = HUNTER_CALLS_PER_RUN_DEFAULT, start?: number, end?: number) {
  return runsPerWorkingDay(start, end) * callsPerRun;
}
