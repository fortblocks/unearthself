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
 * 12 hours, every 30 minutes, is 24 runs. 2 calls a run is 48 calls, the whole daily budget.
 * Each call can file up to 8 companies, so the 48-card ceiling is reachable well inside that.
 * Two 90 second searches fit under the 300 second function limit.
 * Env HUNTER_CALLS_PER_RUN.
 */
export const HUNTER_CALLS_PER_RUN_DEFAULT = 2;

/** Longer than the 300 second function limit, so a slow run cannot overlap the next one. */
export const HUNTER_LOCK_TTL_SECONDS = 360;
export const HUNTER_FUNCTION_MAX_SECONDS = 300;

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
export const HUNTER_SPEND_KEY_PREFIX = "unearth:hunter:spend-cents:v1:";
export const HUNTER_SPEND_UNKNOWN_PREFIX = "unearth:hunter:spend-unknown:v1:";

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

/** Unset until Chris names a monthly dollar amount. */
export function hunterMonthlyDollarCap(raw?: string | null): number | null {
  const text = (raw ?? process.env.HUNTER_MONTHLY_DOLLAR_CAP ?? "").trim();
  if (!text) return null;
  const n = Number(text);
  if (!Number.isFinite(n) || n <= 0) return null;
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
