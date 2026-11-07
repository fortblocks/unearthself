/**
 * Structured Minutes Generation
 * 
 * Generates AI-parsed structured view from raw meeting notes:
 * - Attendees
 * - Key decisions (with citations)
 * - Action items (owner + item + due date if stated)
 * - Open questions
 * - Short summary
 * 
 * Handles full documents (no truncation):
 * - Sends entire text to model
 * - If exceeds context window (~128K tokens), chunks and merges
 * - Preserves all content for extraction
 * 
 * Caching: Redis keyed by meeting id + content hash (30 days), plus a
 * per-instance memory cache. A content change misses. Errors are not cached.
 * Cost: ~$0.03-0.10 per meeting on a cache miss (depends on length)
 */

import { createServerFn } from "@tanstack/react-start";

// xAI model for structured extraction
// Current models: https://docs.x.ai/docs/models
// Using grok-4.20-0309-non-reasoning: non-reasoning variant for speed
// - No reasoning overhead (fast inference, <10s typical)
// - 1M context window
// - Supports json_schema structured outputs
// - $1.25 input / $2.50 output per million tokens
// Previous grok-4.7 had 60s+ timeouts on 18KB docs (likely reasoning-enabled)
export const XAI_MODEL = "grok-4.20-0309-non-reasoning";

export type ActionItem = {
  owner: string | null;
  item: string;
  dueDate: string | null; // Only if explicitly stated in notes
};

export type StructuredMinutes = {
  meetingId: string;
  attendees: string[]; // Names only
  keyDecisions: Array<{
    decision: string;
    source?: string; // Quote or citation from notes
  }>;
  actionItems: ActionItem[];
  openQuestions: string[];
  summary: string; // 2-3 sentences max
  generatedAt: string;
};

// In-memory cache: documentId + modifiedTime -> StructuredMinutes
const cache = new Map<string, StructuredMinutes>();

function getCacheKey(documentId: string, modifiedTime: string): string {
  return `${documentId}:${modifiedTime}`;
}

/** Successful structured views. Content hash changes the key, so this can be long. */
export const STRUCTURED_CACHE_TTL_SECONDS = 60 * 60 * 24 * 30;

const SUMMARY_END =
  /^(details|transcript|discussion|next steps|suggested next steps|action items|attendees|participants)$/i;

function hashText(text: string): string {
  const builtin =
    typeof process.getBuiltinModule === "function" ? process.getBuiltinModule("crypto") : undefined;
  const crypto = builtin ?? (Function("return require('crypto')")() as typeof import("crypto"));
  return crypto.createHash("sha256").update(text).digest("hex").slice(0, 32);
}

/** Redis key. Same notes reuse the structured view; an edit does not. */
export function structuredMinutesCacheKey(meetingId: string, fullText: string): string {
  return `structured-minutes:v1:${meetingId}:${hashText(fullText)}`;
}

function headingLabel(line: string): string {
  return line.replace(/^#+\s*/, "").replace(/\*\*/g, "").trim();
}

/**
 * The notes' own Summary section, verbatim. Null when the export has no Summary heading.
 */
export function plainMeetingSummary(fullText: string): string | null {
  const lines = fullText.split("\n");
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^summary$/i.test(headingLabel(lines[i]))) {
      start = i + 1;
      break;
    }
  }
  if (start < 0) return null;
  const body: string[] = [];
  for (let i = start; i < lines.length; i++) {
    const raw = lines[i];
    const label = headingLabel(raw);
    const markdownHeading = /^#+\s+\S/.test(raw.trim()) || /^\*\*[^*]+\*\*$/.test(raw.trim());
    if (label && (markdownHeading || SUMMARY_END.test(label)) && !/^summary$/i.test(label)) break;
    body.push(raw);
  }
  const text = body.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  return text || null;
}

/** Structured sections replace the raw notes only after a real structured result exists. */
export function minutesDetailMode(
  structured: StructuredMinutes | { error: string } | null,
): "structured" | "raw" {
  if (structured && !("error" in structured)) return "structured";
  return "raw";
}

export function readStructuredMinutes(value: unknown): StructuredMinutes | null {
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const row = parsed as Partial<StructuredMinutes>;
  if (typeof row.meetingId !== "string" || typeof row.summary !== "string") return null;
  if (!Array.isArray(row.attendees) || !Array.isArray(row.keyDecisions)) return null;
  if (!Array.isArray(row.actionItems) || !Array.isArray(row.openQuestions)) return null;
  return row as StructuredMinutes;
}

async function structuredRedis() {
  try {
    const { Redis } = await import("@upstash/redis");
    const hasKv = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;
    const hasUpstash = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!hasKv && !hasUpstash) return null;
    return Redis.fromEnv();
  } catch (error) {
    console.error("[structured-minutes] Redis client failed:", error);
    return null;
  }
}

// Rough estimate: 1 token ≈ 4 characters
// Max context: 128K tokens ≈ 512K chars
// Leave room for prompt and output: use 400K chars per chunk
const MAX_CHUNK_SIZE = 400000;

function chunkText(text: string, maxSize: number = MAX_CHUNK_SIZE): string[] {
  if (text.length <= maxSize) {
    return [text];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + maxSize;
    
    // Try to break at paragraph boundary
    if (end < text.length) {
      const lastNewline = text.lastIndexOf("\n\n", end);
      if (lastNewline > start + maxSize * 0.8) {
        end = lastNewline;
      }
    }

    chunks.push(text.slice(start, end));
    start = end;
  }

  return chunks;
}

function mergeStructuredResults(results: StructuredMinutes[]): StructuredMinutes {
  if (results.length === 0) {
    return {
      meetingId: "",
      attendees: [],
      keyDecisions: [],
      actionItems: [],
      openQuestions: [],
      summary: "",
      generatedAt: new Date().toISOString(),
    };
  }

  if (results.length === 1) {
    return results[0];
  }

  // Merge attendees (dedupe)
  const allAttendees = new Set<string>();
  results.forEach((r) => r.attendees.forEach((a) => allAttendees.add(a)));

  // Merge decisions
  const allDecisions = results.flatMap((r) => r.keyDecisions);

  // Merge action items (dedupe by text)
  const actionMap = new Map<string, ActionItem>();
  results.forEach((r) =>
    r.actionItems.forEach((item) => {
      if (!actionMap.has(item.item)) {
        actionMap.set(item.item, item);
      }
    })
  );

  // Merge questions (dedupe)
  const questionSet = new Set<string>();
  results.forEach((r) => r.openQuestions.forEach((q) => questionSet.add(q)));

  // Use first summary or combine
  const summary = results[0].summary || results.map((r) => r.summary).filter(Boolean).join(" ");

  return {
    meetingId: results[0].meetingId,
    attendees: Array.from(allAttendees),
    keyDecisions: allDecisions,
    actionItems: Array.from(actionMap.values()),
    openQuestions: Array.from(questionSet),
    summary,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * GET endpoint for CDN-cached structured view
 * Cache key: meetingId + modifiedTime (invalidates when doc changes)
 * CDN caches with 1-year max-age since keyed by modifiedTime
 */
export const getStructuredMinutesViaCDN = createServerFn({ method: "GET" })
  .validator((d: { meetingId: string; modifiedTime: string }) => d)
  .handler(async ({ data }): Promise<StructuredMinutes | { error: string }> => {
    const startTime = Date.now();
    const cacheKey = getCacheKey(data.meetingId, data.modifiedTime);
    console.log(`[getStructuredMinutes] Request for ${data.meetingId}`);
    
    // Check in-memory cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log(`[getStructuredMinutes] Cache HIT (${Date.now() - startTime}ms)`);
      // TODO: Set CDN cache headers when TanStack Start supports response header modification
      return cached;
    }
    
    console.log(`[getStructuredMinutes] Cache MISS - fetching and generating`);
    
    // Fetch meeting text
    const { getMeetingMinutes } = await import("./minutes");
    const minutes = await getMeetingMinutes({ data: { meetingId: data.meetingId } });
    
    if (!minutes) {
      return { error: "Meeting not found" };
    }
    
    // Generate using the existing POST handler logic
    const result = await generateStructuredMinutesAsync({
      data: {
        meetingId: data.meetingId,
        modifiedTime: data.modifiedTime,
        fullText: minutes.fullText,
      },
    });
    
    // TODO: Set CDN cache headers when TanStack Start supports response header modification
    
    console.log(`[getStructuredMinutes] TOTAL time: ${Date.now() - startTime}ms`);
    return result;
  });

/**
 * Generate structured minutes from raw meeting text (async, client-called)
 * Uses AbortSignal timeout and parallel chunk processing for long transcripts
 */
export const generateStructuredMinutesAsync = createServerFn({ method: "POST" })
  .validator((d: { meetingId: string; modifiedTime: string; fullText: string }) => d)
  .handler(async ({ data }): Promise<StructuredMinutes | { error: string }> => {
    const startTime = Date.now();
    console.log(`[generateStructuredMinutes] Starting for ${data.meetingId}`);
    const cacheKey = structuredMinutesCacheKey(data.meetingId, data.fullText);
    const memoryKey = getCacheKey(data.meetingId, data.modifiedTime);
    const cached = cache.get(cacheKey) ?? cache.get(memoryKey);
    if (cached) {
      console.log(`[generateStructuredMinutes] Memory HIT (${Date.now() - startTime}ms)`);
      return cached;
    }

    const redis = await structuredRedis();
    if (redis) {
      try {
        const stored = readStructuredMinutes(await redis.get(cacheKey));
        if (stored) {
          cache.set(cacheKey, stored);
          cache.set(memoryKey, stored);
          console.log(`[generateStructuredMinutes] Redis HIT (${Date.now() - startTime}ms)`);
          return stored;
        }
      } catch (error) {
        console.error("[generateStructuredMinutes] Redis read error:", error);
      }
    }

    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return { error: "XAI_API_KEY not configured" };
    }

    try {
      // Check if we need to chunk the text
      const chunks = chunkText(data.fullText);
      
      // Process chunks with concurrency limit to avoid xAI rate limits
      // Max 3 concurrent chunk calls to prevent 429 errors
      const chunkResults: Array<StructuredMinutes | { error: string }> = [];
      const MAX_CONCURRENT = 3;
      
      for (let i = 0; i < chunks.length; i += MAX_CONCURRENT) {
        const batch = chunks.slice(i, i + MAX_CONCURRENT);
        const batchPromises = batch.map((chunk, batchIndex) =>
          processChunkWithTimeout(chunk, i + batchIndex, chunks.length, data.meetingId, apiKey)
        );
        const batchResults = await Promise.all(batchPromises);
        chunkResults.push(...batchResults);
      }
      
      // Check if any chunk failed
      const failed = chunkResults.find(r => "error" in r);
      if (failed && "error" in failed) {
        return failed;
      }

      // Merge results from all chunks
      const validResults = chunkResults.filter((r): r is StructuredMinutes => !("error" in r));
      const merged = mergeStructuredResults(validResults);

      cache.set(cacheKey, merged);
      cache.set(memoryKey, merged);
      if (redis) {
        try {
          await redis.set(cacheKey, merged, { ex: STRUCTURED_CACHE_TTL_SECONDS });
        } catch (error) {
          console.error("[generateStructuredMinutes] Redis write error:", error);
        }
      }
      
      console.log(`[generateStructuredMinutes] TOTAL time: ${Date.now() - startTime}ms`);
      return merged;
    } catch (error: any) {
      console.error("Generation error:", error);
      return { error: error.message || "Failed to generate structured minutes" };
    }
  });

/**
 * Process a single chunk with timeout protection
 */
async function processChunkWithTimeout(
  chunk: string,
  index: number,
  totalChunks: number,
  meetingId: string,
  apiKey: string
): Promise<StructuredMinutes | { error: string }> {
  const chunkLabel = totalChunks > 1 ? ` (part ${index + 1}/${totalChunks})` : "";
  
  try {
    // Generate structured minutes with xAI using structured outputs
    const prompt = `Parse this meeting transcript${chunkLabel} into structured minutes. Extract only what is explicitly stated - never invent information.${totalChunks > 1 ? "\n\nThis is part of a larger document; extract from this section only." : ""}

Meeting transcript:
${chunk}`;

    // Use AbortSignal.timeout for fetch timeout (50 seconds per chunk)
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: XAI_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You extract structured information from meeting notes. Never invent details. Only include what is explicitly stated.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 2000,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "meeting_minutes",
            strict: true,
            schema: {
              type: "object",
              properties: {
                attendees: {
                  type: "array",
                  items: { type: "string" },
                  description: "Names explicitly mentioned as attendees",
                },
                keyDecisions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      decision: { type: "string" },
                      source: { type: "string" },
                    },
                    required: ["decision", "source"],
                    additionalProperties: false,
                  },
                },
                actionItems: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      owner: { type: ["string", "null"] },
                      item: { type: "string" },
                      dueDate: { type: ["string", "null"] },
                    },
                    required: ["owner", "item", "dueDate"],
                    additionalProperties: false,
                  },
                },
                openQuestions: {
                  type: "array",
                  items: { type: "string" },
                },
                summary: {
                  type: "string",
                  description: "2-3 sentence summary of the meeting",
                },
              },
              required: ["attendees", "keyDecisions", "actionItems", "openQuestions", "summary"],
              additionalProperties: false,
            },
          },
        },
      }),
      signal: AbortSignal.timeout(100000), // 100-second timeout per chunk (below 120s function limit)
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorDetail = `HTTP ${response.status}: Failed to generate structured minutes`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message) {
          errorDetail = `HTTP ${response.status}: ${errorJson.error.message}`;
        }
      } catch {
        errorDetail = `HTTP ${response.status}: ${errorText.substring(0, 200)}`;
      }
      console.error("xAI error:", errorText);
      return { error: errorDetail };
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;

    if (!content) {
      return { error: "No response from xAI" };
    }

    // Parse JSON response (structured output guarantees valid JSON)
    const parsed = JSON.parse(content);

    const chunkResult: StructuredMinutes = {
      meetingId,
      attendees: parsed.attendees || [],
      keyDecisions: parsed.keyDecisions || [],
      actionItems: parsed.actionItems || [],
      openQuestions: parsed.openQuestions || [],
      summary: parsed.summary || "",
      generatedAt: new Date().toISOString(),
    };

    return chunkResult;
  } catch (error: any) {
    console.error(`Chunk ${index + 1} error:`, error);
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      return { error: `Chunk ${index + 1} timed out after 100 seconds` };
    }
    return { error: `Chunk ${index + 1} failed: ${error.message}` };
  }
}

/**
 * Clear cache for a specific document (useful when document is updated)
 */
export function clearCache(documentId: string) {
  const keysToDelete: string[] = [];
  for (const key of cache.keys()) {
    if (key.startsWith(documentId + ":")) {
      keysToDelete.push(key);
    }
  }
  keysToDelete.forEach((key) => cache.delete(key));
}

/**
 * Get cache statistics (for monitoring)
 */
export function getCacheStats() {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  };
}
