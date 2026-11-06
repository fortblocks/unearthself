/**
 * Production action extraction pipeline with dependency injection
 * Extracted for testability - used by both server function and tests
 */

import type { ActionItem, ExtractionDiagnostic, ExtractionOutcome, ExtractionResult } from "./action-tracking";

/** Successful non-empty extracts. */
export const SUCCESS_CACHE_SECONDS = 300;
/** Empty, unknown, and failed extracts. Short on purpose so a miss is not recomputed on every request. */
export const SHORT_CACHE_SECONDS = 60;

const LIST_FAILED_CACHE_KEY = "actions-cache:v3-status:list-failed";

export type CacheEnvelope = {
  v: 3;
  actions: ActionItem[];
  outcome: ExtractionOutcome;
  meetingsProcessed: number;
  meetingsFailed: number;
  latestMeetingDate: string | null;
  errors: ExtractionDiagnostic["errors"];
};

/**
 * Trust the action list only when discovery and export both succeeded.
 * Cache read/write trouble is bookkeeping, not an empty action list.
 * Zero meetings stays unknown: listMeetings swallows Drive failures as [].
 */
export function deriveExtractionOutcome(input: {
  meetingsProcessed: number;
  meetingsFailed: number;
  errors: ExtractionDiagnostic["errors"];
}): ExtractionOutcome {
  const substantive = input.errors.filter((e) => e.stage !== "cache-read" && e.stage !== "cache-write");
  if (substantive.some((e) => e.stage === "discovery" || e.stage === "extraction")) return "error";
  if (input.meetingsProcessed === 0) return "unknown";
  if (input.meetingsFailed > 0) return "error";
  return "ok";
}

export function cachePlan(outcome: ExtractionOutcome, actionsLength: number): { ttl: number; asArray: boolean } {
  if (outcome === "ok" && actionsLength > 0) {
    return { ttl: SUCCESS_CACHE_SECONDS, asArray: true };
  }
  return { ttl: SHORT_CACHE_SECONDS, asArray: false };
}

/**
 * Dependencies that can be mocked in tests
 */
export type PipelineDependencies = {
  listMeetings: () => Promise<Array<{
    id: string;
    title: string;
    date: string;
    time: string;
    createdTime: string;
    modifiedTime: string;
  }>>;
  getMeetingMinutes: (meetingId: string) => Promise<{
    meeting: any;
    fullText: string;
    actions: any[];
  } | null>;
  extractExplicitActions: (
    meetingId: string,
    date: string,
    title: string,
    fullText: string
  ) => Promise<ActionItem[]>;
  getRedisClient: () => Promise<{
    get: (key: string) => Promise<any>;
    set: (key: string, value: any, options: { ex: number }) => Promise<void>;
  } | null>;
  hashString: (str: string) => string;
};

/**
 * Core extraction pipeline - dependency injected for testing
 * This is the ACTUAL production logic, not a copy
 */
function resultOf(
  actions: ActionItem[],
  diagnostic: ExtractionDiagnostic,
  outcome: ExtractionOutcome,
): ExtractionResult {
  return { actions, diagnostic, outcome };
}

function envelopeFrom(result: ExtractionResult): CacheEnvelope {
  return {
    v: 3,
    actions: result.actions,
    outcome: result.outcome ?? "error",
    meetingsProcessed: result.diagnostic.meetingsProcessed,
    meetingsFailed: result.diagnostic.meetingsFailed ?? 0,
    latestMeetingDate: result.diagnostic.latestMeetingDate,
    errors: result.diagnostic.errors,
  };
}

function readCached(cached: unknown): ExtractionResult | null {
  if (Array.isArray(cached)) {
    return null;
  }
  if (!cached || typeof cached !== "object") return null;
  const env = cached as Partial<CacheEnvelope>;
  if (env.v !== 3 || !Array.isArray(env.actions) || !env.outcome) return null;
  return resultOf(env.actions, {
    cacheHit: true,
    meetingsProcessed: env.meetingsProcessed ?? 0,
    meetingsFailed: env.meetingsFailed ?? 0,
    latestMeetingDate: env.latestMeetingDate ?? null,
    errors: Array.isArray(env.errors) ? env.errors : [],
  }, env.outcome);
}

function withDuration(result: ExtractionResult, started: number): ExtractionResult {
  return {
    ...result,
    diagnostic: { ...result.diagnostic, durationMs: Date.now() - started },
  };
}

async function readRedis(redis: Awaited<ReturnType<PipelineDependencies["getRedisClient"]>>, key: string, errors: ExtractionDiagnostic["errors"]) {
  if (!redis) return null;
  try {
    return await redis.get(key);
  } catch (error: any) {
    console.error("[extractAllActions] Cache read error:", error);
    errors.push({ stage: "cache-read", code: "REDIS_ERROR" });
    return null;
  }
}

async function writeRedis(
  redis: Awaited<ReturnType<PipelineDependencies["getRedisClient"]>>,
  key: string,
  value: unknown,
  ttl: number,
  errors: ExtractionDiagnostic["errors"],
) {
  if (!redis) return;
  try {
    await redis.set(key, value, { ex: ttl });
  } catch (error: any) {
    console.error("[extractAllActions] Cache write error:", error);
    errors.push({ stage: "cache-write", code: "REDIS_ERROR" });
  }
}

export async function runExtractionPipeline(
  deps: PipelineDependencies
): Promise<ExtractionResult> {
  const errors: Array<{ stage: string; code: string }> = [];
  const extractStart = Date.now();
  
  try {
    const redis = await deps.getRedisClient().catch((error: any) => {
      console.error("[extractAllActions] Cache client error:", error);
      errors.push({ stage: "cache-read", code: "REDIS_ERROR" });
      return null;
    });

    const failedCached = readCached(await readRedis(redis, LIST_FAILED_CACHE_KEY, errors));
    if (failedCached) {
      console.log("[extractAllActions] Cache HIT (recent discovery failure)");
      return withDuration(failedCached, extractStart);
    }

    // Get list of meetings (fast metadata fetch)
    // Note: listMeetings catches all errors internally and returns []
    // Empty array is ambiguous (valid empty OR discovery failed)
    // We track discovery attempt but cannot distinguish without structured errors
    let meetings: Awaited<ReturnType<typeof deps.listMeetings>>;
    try {
      meetings = await deps.listMeetings();
    } catch (error: any) {
      // Only reached if auth fails before listMeetings
      console.error("[extractAllActions] Discovery failed:", error);
      const failed = resultOf([], {
        cacheHit: false,
        meetingsProcessed: 0,
        meetingsFailed: 0,
        latestMeetingDate: null,
        errors: [{ stage: "discovery", code: "LIST_FAILED" }],
      }, "error");
      await writeRedis(redis, LIST_FAILED_CACHE_KEY, envelopeFrom(failed), SHORT_CACHE_SECONDS, errors);
      if (errors.some((e) => e.stage === "cache-write")) {
        failed.diagnostic = { ...failed.diagnostic, errors: [...failed.diagnostic.errors, ...errors.filter((e) => e.stage === "cache-write")] };
      }
      return withDuration(failed, extractStart);
    }
    
    // If meetings is empty, we cannot distinguish:
    // - Valid empty (no meetings exist)
    // - Discovery failure (Drive API error, swallowed by listMeetings)
    // Mark status as unknown when zero meetings and no cache
    const discoveryStatus = meetings.length === 0 ? 'UNKNOWN' : 'SUCCESS';
    if (discoveryStatus === 'UNKNOWN') {
      console.warn("[extractAllActions] Zero meetings discovered - could be empty or discovery failed (check Drive API logs)");
    }
    
    // Find actual latest date, don't assume sort order
    const latestMeetingDate = meetings.length > 0 
      ? meetings.reduce((max, m) => m.date > max ? m.date : max, meetings[0].date)
      : null;
    
    // Create cache key based on meeting IDs and modified times
    const CACHE_VERSION = 'v2-plaintext';
    const meetingFingerprint = meetings
      .map((m) => `${m.id}:${m.modifiedTime || ''}`)
      .join('|');
    const cacheKey = `actions-cache:${CACHE_VERSION}:${deps.hashString(meetingFingerprint)}`;
    
    // Try cache first. A bare array is a previous successful extract.
    // An envelope carries empty, unknown, and failed results (short TTL).
    const cached = await readRedis(redis, cacheKey, errors);
    if (Array.isArray(cached)) {
      const durationMs = Date.now() - extractStart;
      console.log(`[extractAllActions] Cache HIT (${meetings.length} meetings, ${durationMs}ms)`);
      return resultOf(cached as ActionItem[], {
        cacheHit: true,
        durationMs,
        meetingsProcessed: meetings.length,
        // Cache hit: exports not attempted this request
        meetingsFailed: undefined as any,
        latestMeetingDate,
        errors: [],
      }, "ok");
    }
    const cachedEnvelope = readCached(cached);
    if (cachedEnvelope) {
      console.log(`[extractAllActions] Cache HIT envelope (${cachedEnvelope.outcome}, ${meetings.length} meetings)`);
      return withDuration({
        ...cachedEnvelope,
        diagnostic: {
          ...cachedEnvelope.diagnostic,
          meetingsProcessed: meetings.length,
          latestMeetingDate,
        },
      }, extractStart);
    }
    
    // Cache miss - fetch and process all meetings
    console.log(`[extractAllActions] Cache MISS - processing ${meetings.length} meetings`);
    const allActions: ActionItem[] = [];
    let meetingsFailed = 0;
    
    // Process meetings in batches
    const BATCH_SIZE = 5;
    for (let i = 0; i < meetings.length; i += BATCH_SIZE) {
      const batch = meetings.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(async (meeting) => {
        try {
          const minutes = await deps.getMeetingMinutes(meeting.id);
          if (!minutes) {
            meetingsFailed++;
            console.error(`[extractAllActions] Export null for meeting ${meeting.id}`);
            errors.push({ stage: 'export', code: 'NULL_RESULT' });
            return [];
          }
          
          return await deps.extractExplicitActions(
            meeting.id,
            meeting.date,
            meeting.title,
            minutes.fullText
          );
        } catch (error: any) {
          meetingsFailed++;
          console.error(`[extractAllActions] Failed meeting ${meeting.id}:`, error);
          errors.push({ stage: 'export', code: 'EXPORT_FAILED' });
          return [];
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      for (const actions of batchResults) {
        allActions.push(...actions);
      }
    }
    
    // Sort by date descending
    allActions.sort((a, b) => b.meetingDate.localeCompare(a.meetingDate));

    const outcome = deriveExtractionOutcome({
      meetingsProcessed: meetings.length,
      meetingsFailed,
      errors,
    });
    const plan = cachePlan(outcome, allActions.length);
    const payload = plan.asArray ? allActions : envelopeFrom(resultOf(allActions, {
      cacheHit: false,
      meetingsProcessed: meetings.length,
      meetingsFailed,
      latestMeetingDate,
      errors,
    }, outcome));
    await writeRedis(redis, cacheKey, payload, plan.ttl, errors);
    if (plan.asArray) {
      console.log(`[extractAllActions] Cached ${allActions.length} actions for ${plan.ttl} seconds`);
    } else {
      console.log(`[extractAllActions] Cached ${outcome} result for ${plan.ttl} seconds`);
    }
    
    return withDuration(resultOf(allActions, {
      cacheHit: false,
      meetingsProcessed: meetings.length,
      meetingsFailed,
      latestMeetingDate,
      errors,
    }, outcome), extractStart);
  } catch (error: any) {
    console.error("[extractAllActions] Fatal extraction error:", error);
    const fatal = resultOf([], {
      cacheHit: false,
      meetingsProcessed: 0,
      meetingsFailed: 0,
      latestMeetingDate: null,
      errors: [{ stage: "extraction", code: "FATAL_ERROR" }],
    }, "error");
    try {
      const redis = await deps.getRedisClient();
      await writeRedis(redis, "actions-cache:v3-status:fatal", envelopeFrom(fatal), SHORT_CACHE_SECONDS, fatal.diagnostic.errors);
    } catch (cacheError: any) {
      console.error("[extractAllActions] Fatal cache write error:", cacheError);
    }
    return withDuration(fatal, extractStart);
  }
}
