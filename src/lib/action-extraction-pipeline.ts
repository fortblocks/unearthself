/**
 * Production action extraction pipeline with dependency injection
 * Extracted for testability - used by both server function and tests
 */

import type { ActionItem, ExtractionDiagnostic, ExtractionResult } from "./action-tracking";

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
export async function runExtractionPipeline(
  deps: PipelineDependencies
): Promise<ExtractionResult> {
  const errors: Array<{ stage: string; code: string }> = [];
  const extractStart = Date.now();
  let cacheHit = false;
  let durationMs: number | undefined;
  
  try {
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
      return {
        actions: [],
        diagnostic: {
          cacheHit: false,
          meetingsProcessed: 0,
          meetingsFailed: 0,
          latestMeetingDate: null,
          errors: [{ stage: 'discovery', code: 'LIST_FAILED' }],
        },
      };
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
    
    // Try cache first
    const redis = await deps.getRedisClient();
    if (redis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached && Array.isArray(cached)) {
          cacheHit = true;
          durationMs = Date.now() - extractStart;
          console.log(`[extractAllActions] Cache HIT (${meetings.length} meetings, ${durationMs}ms)`);
            return {
              actions: cached as ActionItem[],
              diagnostic: {
                cacheHit: true,
                durationMs,
                meetingsProcessed: meetings.length,
                // Cache hit: exports not attempted this request
                // meetingsFailed would require re-processing, so undefined
                meetingsFailed: undefined as any, // Not applicable on cache hit
                latestMeetingDate,
                errors: [],
              },
            };
        }
      } catch (error: any) {
        console.error("[extractAllActions] Cache read error:", error);
        errors.push({ stage: 'cache-read', code: 'REDIS_ERROR' });
      }
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
    
    // Cache for 5 minutes if we have results
    if (redis && allActions.length > 0) {
      try {
        await redis.set(cacheKey, allActions, { ex: 300 });
        console.log(`[extractAllActions] Cached ${allActions.length} actions for 5 minutes`);
      } catch (error: any) {
        console.error("[extractAllActions] Cache write error:", error);
        errors.push({ stage: 'cache-write', code: 'REDIS_ERROR' });
      }
    }
    
    durationMs = Date.now() - extractStart;
    return {
      actions: allActions,
      diagnostic: {
        cacheHit: false,
        durationMs,
        meetingsProcessed: meetings.length,
        meetingsFailed,
        latestMeetingDate,
        errors,
      },
    };
  } catch (error: any) {
    console.error("[extractAllActions] Fatal extraction error:", error);
    return {
      actions: [],
      diagnostic: {
        cacheHit: false,
        meetingsProcessed: 0,
        meetingsFailed: 0,
        latestMeetingDate: null,
        errors: [{ stage: 'extraction', code: 'FATAL_ERROR' }],
      },
    };
  }
}
