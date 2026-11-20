/**
 * Lead book in Upstash Redis.
 * Env names match the unearth-actions store already used by this project:
 * UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN, or KV_REST_API_URL + KV_REST_API_TOKEN.
 * Secrets stay in the environment. Nothing here is a credential.
 */

import { isTestCompany } from "../data/desk.ts";
import { isSeedCompany } from "../data/leads.ts";
import { asLeadCompany, edmontonToday, timingFromSignals, type Company } from "./lead-score.ts";

export const LEADS_KEY = "unearth:leads:v1";
export const DESK_STORAGE_KEY = "unearthself-desk-v3";
export const MORNING_MIN = 10;
export const MORNING_MAX = 20;
export const MORNING_DEFAULT = 10;

export type MorningBatch = {
  date: string;
  ids: string[];
};

export type LeadsBook = {
  companies: Company[];
  morningCount: number;
  morning: MorningBatch | null;
  /** 2 after unsent drafts dropped the department-label opener. */
  draftRevision: number;
};

export const DRAFT_REVISION = 2;

export function clampMorningCount(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return MORNING_DEFAULT;
  return Math.max(MORNING_MIN, Math.min(MORNING_MAX, Math.round(n)));
}

export function emptyBook(): LeadsBook {
  return { companies: [], morningCount: MORNING_DEFAULT, morning: null, draftRevision: 0 };
}

export function seedBook(): LeadsBook {
  return emptyBook();
}

export function liveCompanies(companies: Company[]) {
  return companies
    .filter((company) => !isSeedCompany(company) && !isTestCompany(company.org, company.domain))
    .map(asLeadCompany);
}

function isCompany(row: unknown): row is Company {
  if (!row || typeof row !== "object") return false;
  const company = row as Partial<Company>;
  return typeof company.id === "string" && typeof company.domain === "string" && typeof company.org === "string";
}

function parseMorning(raw: unknown): MorningBatch | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Partial<MorningBatch>;
  if (typeof row.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) return null;
  const ids = Array.isArray(row.ids) ? row.ids.filter((id): id is string => typeof id === "string" && id.length > 0) : [];
  return { date: row.date, ids };
}

export function parseBook(raw: unknown): LeadsBook {
  if (!raw || typeof raw !== "object") return emptyBook();
  const row = raw as Partial<LeadsBook>;
  const revision = (row as { draftRevision?: unknown }).draftRevision;
  const companies = liveCompanies(Array.isArray(row.companies) ? row.companies.filter(isCompany) : []);
  const kept = new Set(companies.map((company) => company.id));
  const morning = parseMorning(row.morning);
  return {
    companies,
    morningCount: clampMorningCount(row.morningCount),
    morning: morning ? { ...morning, ids: morning.ids.filter((id) => kept.has(id)) } : null,
    draftRevision: revision === DRAFT_REVISION ? DRAFT_REVISION : 0,
  };
}

/** zustand persist blob: { state: { companies }, version }. */
export function readLocalCompanies(raw: string | null): Company[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as { state?: { companies?: unknown } };
    const companies = parsed?.state?.companies;
    if (!Array.isArray(companies)) return [];
    return liveCompanies(companies.filter(isCompany));
  } catch {
    return [];
  }
}

export function morningCompanies(book: LeadsBook, today = edmontonToday()): Company[] {
  if (!book.morning || book.morning.date !== today) return [];
  const byId = new Map(book.companies.map((company) => [company.id, company]));
  const picked: Company[] = [];
  for (const id of book.morning.ids) {
    const company = byId.get(id);
    if (!company) continue;
    picked.push(company);
    if (picked.length >= book.morningCount) break;
  }
  return picked;
}

export function withTimingCache(company: Company, today = edmontonToday()): Company {
  if (!Array.isArray(company.signals)) return company;
  const timing = timingFromSignals({
    signals: company.signals,
    lastTouch: company.lastTouch,
    today,
  }).timing;
  return { ...company, timingScore: timing };
}

export function upsertCompany(book: LeadsBook, company: Company, today = edmontonToday()): LeadsBook {
  const next = withTimingCache(company, today);
  const exists = book.companies.some((row) => row.id === next.id);
  return {
    ...book,
    companies: exists ? book.companies.map((row) => (row.id === next.id ? next : row)) : [next, ...book.companies],
  };
}

export type LeadsRedis = {
  get: <T>(key: string) => Promise<T | null>;
  set: (key: string, value: unknown, opts?: { nx?: true; ex?: number }) => Promise<string | null>;
  del?: (key: string) => Promise<unknown>;
  incr: (key: string) => Promise<number>;
  decr: (key: string) => Promise<number>;
  incrby: (key: string, amount: number) => Promise<number>;
  expire: (key: string, seconds: number) => Promise<unknown>;
  eval: (script: string, keys: string[], args: string[]) => Promise<unknown>;
  hset?: (key: string, field: string, value: string) => Promise<unknown>;
  hget?: (key: string, field: string) => Promise<unknown>;
  hgetall?: (key: string) => Promise<Record<string, unknown> | null>;
  lpush: (key: string, value: unknown) => Promise<unknown>;
  ltrim: (key: string, start: number, stop: number) => Promise<unknown>;
  lrange: (key: string, start: number, stop: number) => Promise<unknown[]>;
};

let testRedis: LeadsRedis | null = null;

/** Tests pass a fake client. Production never sets this. */
export function useRedisClientForTests(client: LeadsRedis | null) {
  testRedis = client;
}

export async function getRedisClient(): Promise<LeadsRedis | null> {
  if (testRedis) return testRedis;
  const hasKv = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;
  const hasUpstash = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!hasKv && !hasUpstash) return null;
  try {
    const { Redis } = await import("@upstash/redis");
    return Redis.fromEnv() as unknown as LeadsRedis;
  } catch (error) {
    console.error("[leads] Redis client failed:", error);
    return null;
  }
}

export async function loadBook(): Promise<{ book: LeadsBook; storage: "redis" | "browser" }> {
  const redis = await getRedisClient();
  if (!redis) return { book: seedBook(), storage: "browser" };
  const raw = await redis.get<unknown>(LEADS_KEY);
  if (!raw) return { book: emptyBook(), storage: "redis" };
  return { book: parseBook(raw), storage: "redis" };
}

let outreachHealLogged = false;

/** Lift marks from the outreach hash. A failed read must not stop the save. */
async function withOutreachMarks(redis: LeadsRedis, companies: Company[]): Promise<Company[]> {
  try {
    if (!redis.hgetall) return companies;
    const { applyOutreachMarks, readOutreachMap } = await import("./hunter-outreach.ts");
    const records = await readOutreachMap(redis);
    return applyOutreachMarks(companies, records);
  } catch {
    if (!outreachHealLogged) {
      outreachHealLogged = true;
      console.error("[leads] outreach marks were not applied on this save");
    }
    return companies;
  }
}

export async function saveBook(book: LeadsBook): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) throw new Error("Redis is not configured");
  const today = edmontonToday();
  const companies = await withOutreachMarks(redis, liveCompanies(book.companies));
  const kept = new Set(companies.map((company) => company.id));
  const next: LeadsBook = {
    companies: companies.map((company) => withTimingCache(company, today)),
    morningCount: clampMorningCount(book.morningCount),
    morning: book.morning
      ? { ...book.morning, ids: book.morning.ids.filter((id) => kept.has(id)) }
      : null,
    draftRevision: book.draftRevision === DRAFT_REVISION ? DRAFT_REVISION : 0,
  };
  await redis.set(LEADS_KEY, next);
}
