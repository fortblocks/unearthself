/**
 * One line per Hunter run. Newest first. The list is capped at about 90 days of the minute cron.
 * Read only on the Bots page. Nothing here stores a secret.
 */

import type { HunterFunnel } from "./hunter-phase.ts";
import { getRedisClient } from "./leads-book.ts";

export const HUNTER_RUNS_KEY = "unearth:hunter:runs:v1";
/** Kept at the old one-a-minute size, so the 30 minute cadence still has a long window. */
export const HUNTER_RUN_KEEP = 90 * 24 * 60;

export type HunterRunName = "always-on" | "nightly";

export type HunterRunOutcome =
  | "fired"
  | "skipped-paused"
  | "skipped-killed"
  | "skipped-hours"
  | "skipped-not-4am"
  | "skipped-already-swept"
  | "skipped-target-met"
  | "capped-budget"
  | "capped-spend"
  | "skipped-busy"
  | "error";

export type HunterRunEntry = {
  at: string;
  run: HunterRunName;
  outcome: HunterRunOutcome;
  modelCalls: number;
  candidates: number;
  cardsFiled: number;
  contactReady: number;
  apolloSearches: number;
  apolloReveals: number;
  error: string;
  model: string;
  alarms: string[];
  inputTokens: number;
  outputTokens: number;
  dollars: number | null;
  funnel: HunterFunnel | null;
};

const OUTCOMES = new Set<HunterRunOutcome>([
  "fired",
  "skipped-paused",
  "skipped-killed",
  "skipped-hours",
  "skipped-not-4am",
  "skipped-already-swept",
  "skipped-target-met",
  "capped-budget",
  "capped-spend",
  "skipped-busy",
  "error",
]);

function count(value: number) {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.round(value);
}

export function hunterRunEntry(input: Omit<HunterRunEntry, "at" | "model" | "alarms" | "inputTokens" | "outputTokens" | "dollars" | "funnel"> & Partial<Pick<HunterRunEntry, "at" | "model" | "alarms" | "inputTokens" | "outputTokens" | "dollars" | "funnel">>): HunterRunEntry {
  return {
    at: input.at?.trim() || new Date().toISOString(),
    run: input.run,
    outcome: input.outcome,
    modelCalls: count(input.modelCalls),
    candidates: count(input.candidates),
    cardsFiled: count(input.cardsFiled),
    contactReady: count(input.contactReady),
    apolloSearches: count(input.apolloSearches),
    apolloReveals: count(input.apolloReveals),
    error: input.error.trim(),
    model: input.model?.trim() || "",
    alarms: Array.isArray(input.alarms) ? input.alarms.filter((item) => item.trim()).map((item) => item.trim()) : [],
    inputTokens: count(input.inputTokens ?? 0),
    outputTokens: count(input.outputTokens ?? 0),
    dollars: typeof input.dollars === "number" && Number.isFinite(input.dollars) ? input.dollars : null,
    funnel: input.funnel ?? null,
  };
}

export function parseHunterRun(raw: unknown): HunterRunEntry | null {
  const row = typeof raw === "string" ? safeJson(raw) : raw;
  if (!row || typeof row !== "object") return null;
  const record = row as Partial<HunterRunEntry>;
  if (record.run !== "always-on" && record.run !== "nightly") return null;
  if (!record.outcome || !OUTCOMES.has(record.outcome)) return null;
  return hunterRunEntry({
    at: typeof record.at === "string" ? record.at : "",
    run: record.run,
    outcome: record.outcome,
    modelCalls: Number(record.modelCalls ?? 0),
    candidates: Number(record.candidates ?? 0),
    cardsFiled: Number(record.cardsFiled ?? 0),
    contactReady: Number(record.contactReady ?? 0),
    apolloSearches: Number(record.apolloSearches ?? 0),
    apolloReveals: Number(record.apolloReveals ?? 0),
    error: typeof record.error === "string" ? record.error : "",
    model: typeof record.model === "string" ? record.model : "",
    alarms: Array.isArray(record.alarms) ? record.alarms.filter((item) => typeof item === "string") : [],
    inputTokens: Number(record.inputTokens ?? 0),
    outputTokens: Number(record.outputTokens ?? 0),
    dollars: typeof record.dollars === "number" ? record.dollars : null,
    funnel: record.funnel ?? null,
  });
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

type RunList = {
  lpush: (key: string, value: unknown) => Promise<unknown>;
  ltrim: (key: string, start: number, stop: number) => Promise<unknown>;
  lrange: (key: string, start: number, stop: number) => Promise<unknown[]>;
};

export async function appendHunterRun(entry: HunterRunEntry, client?: RunList | null) {
  try {
    const redis = client === undefined ? await getRedisClient() : client;
    if (!redis) return;
    await redis.lpush(HUNTER_RUNS_KEY, entry);
    await redis.ltrim(HUNTER_RUNS_KEY, 0, HUNTER_RUN_KEEP - 1);
  } catch {
    console.error("[hunter] run log failed");
  }
}

export async function readHunterRuns(limit = 20, client?: RunList | null): Promise<HunterRunEntry[]> {
  const redis = client === undefined ? await getRedisClient() : client;
  if (!redis) return [];
  const rows = await redis.lrange(HUNTER_RUNS_KEY, 0, Math.max(0, limit - 1));
  return rows.flatMap((row) => {
    const entry = parseHunterRun(row);
    return entry ? [entry] : [];
  });
}
