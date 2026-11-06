/**
 * Action tracking for meeting minutes
 * Extracts action items from explicit action sections only
 * Uses xAI to rewrite into short imperatives
 * Caches rewrites in Upstash Redis
 */

import { createServerFn } from "@tanstack/react-start";
import { formatDateOrdinal, normalizeBasecamp, shortenPartnerNames } from "./minutes-archive";
import { XAI_MODEL } from "./structured-minutes";
import { createHash } from "crypto";

// Known partner first names
const PARTNER_NAMES = ["Lisa", "Tess", "Norah", "Christopher"] as const;
type PartnerName = (typeof PARTNER_NAMES)[number];

export type ActionItem = {
  id: string; // Stable ID: `${meetingId}:${lineHash}`
  meetingId: string;
  meetingDate: string; // YYYY-MM-DD
  meetingTitle: string;
  text: string; // Short imperative rewrite (12 words max)
  owner: PartnerName; // Assigned partner (first name only)
  excerpt: string; // Verbatim source line
};

export type ActionCompletion = {
  actionId: string;
  completedBy: PartnerName;
  completedAt: string;
  undone?: boolean;
};

/**
 * Get Redis client if env vars are configured
 */
async function getRedisClient() {
  try {
    const { Redis } = await import("@upstash/redis");
    
    const hasKvVars = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;
    const hasUpstashVars = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;
    
    if (!hasKvVars && !hasUpstashVars) {
      console.log("[action-tracking] Redis env vars not configured");
      return null;
    }
    
    const redis = Redis.fromEnv();
    return redis;
  } catch (error) {
    console.error("[action-tracking] Failed to create Redis client:", error);
    return null;
  }
}

/**
 * Hash a string to create stable IDs
 */
function hashString(text: string): string {
  return createHash("sha256").update(text).digest("hex").substring(0, 12);
}

/**
 * Normalize line: remove leading markers, backslashes, ** markers, and checkboxes
 * Real format: - [ ] \[Lisa Hamilton\] Email Proposal: <description>
 * Becomes: [Lisa Hamilton] Email Proposal: <description>
 */
function normalizeLine(line: string): string {
  let normalized = line;
  
  // Remove leading bullet markers: - * •
  normalized = normalized.replace(/^[-*•]\s*/, '');
  
  // Remove checkbox markers: [ ], [x], ☐, ☑
  normalized = normalized.replace(/\[\s*[xX]?\s*\]/, '').trim();
  normalized = normalized.replace(/[☐☑]/, '').trim();
  
  // Remove backslashes (escape characters from markdown)
  normalized = normalized.replace(/\\/g, '');
  
  // Remove ** markers (bold)
  normalized = normalized.replace(/\*\*/g, '');
  
  return normalized.trim();
}

/**
 * Extract partner names from action line
 * Real format after normalization: [Lisa Hamilton] Email Proposal: <description>
 * Returns array of partner names, empty if none found or all non-partners
 */
function extractOwners(line: string): PartnerName[] {
  const normalized = normalizeLine(line);
  
  // Require leading bracket group: ^\[([^\]]+)\]
  const bracketMatch = normalized.match(/^\[([^\]]+)\]/);
  if (!bracketMatch) {
    return [];
  }
  
  const ownerText = bracketMatch[1].trim();
  
  // Split by comma for multiple owners: "Tess, Christopher Mair" or "Tess Hamilton, Chris"
  const nameParts = ownerText.split(/\s*,\s*/);
  const owners: PartnerName[] = [];
  
  for (const namePart of nameParts) {
    // Take first token of each name: "Lisa Hamilton" -> "Lisa", "Christopher Mair" -> "Christopher"
    const firstName = namePart.trim().split(/\s+/)[0];
    
    // Map "Chris" to "Christopher"
    const mappedName = firstName === "Chris" ? "Christopher" : firstName;
    
    // Keep only partners
    if (PARTNER_NAMES.includes(mappedName as PartnerName)) {
      owners.push(mappedName as PartnerName);
    }
  }
  
  return owners;
}

/**
 * Extract title from action line (text before first colon, with braces stripped)
 * Real format: [Lisa Hamilton] Email Proposal: Send proposal to client by Friday
 * Returns: "Email Proposal"
 */
function extractTitle(line: string): string {
  const normalized = normalizeLine(line);
  
  // Remove bracket group
  const withoutBracket = normalized.replace(/^\[([^\]]+)\]\s*/, '');
  
  // Get text before first colon
  const colonIndex = withoutBracket.indexOf(':');
  if (colonIndex === -1) {
    return withoutBracket.trim();
  }
  
  const title = withoutBracket.substring(0, colonIndex).trim();
  
  // Strip braces: {Perform Moisture Test} -> Perform Moisture Test
  return title.replace(/[{}]/g, '').trim();
}

/**
 * Rewrite a short action title into a short imperative using xAI.
 * Only the title (text before the first colon) is rewritten.
 * On any failure, return the clean title unchanged — never post-bracket prose.
 * Cached by doc id + title hash.
 */
async function rewriteAction(
  meetingId: string,
  title: string,
  owner: PartnerName
): Promise<string> {
  const cleanTitle = title.trim();
  if (!cleanTitle) return cleanTitle;

  const redis = await getRedisClient();
  const lineHash = hashString(cleanTitle);
  const cacheKey = `action-rewrite:${meetingId}:${lineHash}`;
  
  // Check cache first
  if (redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached && typeof cached === "string" && cached.trim()) {
        return cached;
      }
    } catch (error) {
      console.error("[rewriteAction] Cache read error:", error);
    }
  }
  
  // Rewrite with xAI
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    return cleanTitle;
  }
  
  const prompt = `Rewrite this action title into a clear, short imperative of 12 words maximum.

Title: "${cleanTitle}"
Owner: ${owner}

Rules:
1. Start with a verb when the title is not already imperative (e.g., "Ask", "Review", "Complete", "Schedule", "Send")
2. Maximum 12 words
3. Keep all facts from the title - don't add new information
4. Remove the owner's name from the text (it's stored separately)
5. Be specific and actionable

Return ONLY the rewritten action as plain text, no quotes, no explanation.`;

  try {
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
            content: "You rewrite action titles into short, clear imperatives. Be concise and specific."
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 50,
      }),
      signal: AbortSignal.timeout(5000),
    });
    
    if (!response.ok) {
      throw new Error(`xAI error: ${response.status}`);
    }
    
    const result = await response.json();
    const rewritten = result.choices?.[0]?.message?.content?.trim();
    if (!rewritten) {
      return cleanTitle;
    }
    
    // Validate: max 12 words
    const wordCount = rewritten.split(/\s+/).length;
    const finalRewrite = wordCount <= 12 ? rewritten : rewritten.split(/\s+/).slice(0, 12).join(' ');
    
    // Cache the rewrite
    if (redis) {
      try {
        await redis.set(cacheKey, finalRewrite, { ex: 60 * 60 * 24 * 30 }); // 30 days
      } catch (error) {
        console.error("[rewriteAction] Cache write error:", error);
      }
    }
    
    return finalRewrite;
  } catch (error) {
    console.error("[rewriteAction] xAI error:", error);
    return cleanTitle;
  }
}

/**
 * Clean meeting title: "Development meeting" without timestamps or "Notes by Gemini"
 */
function cleanMeetingTitle(title: string): string {
  // Remove timestamp patterns: "2026/10/29 17:00 MDT"
  let cleaned = title.replace(/\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}(\s+[A-Z]{2,4})?/g, '');
  // Remove "Notes by Gemini"
  cleaned = cleaned.replace(/\s*[-–—]\s*Notes by Gemini\s*/gi, '');
  // Remove extra dashes and spaces
  cleaned = cleaned.replace(/\s*[-–—]\s*$/, '').trim();
  // Default to "Development meeting" if empty
  if (!cleaned) cleaned = "Development meeting";
  return cleaned;
}

/**
 * Normalize heading: strip #, *, and whitespace
 * Real format: ## **Next steps** -> Next steps
 * Plaintext: Details -> Details
 */
function normalizeHeading(line: string): string {
  return line
    .replace(/^#+\s*/, '')  // Remove leading #
    .replace(/\*\*/g, '')   // Remove **
    .trim();
}

/**
 * True when a normalized heading ends the Next steps section.
 * Covers markdown (### **Details**) and bare plaintext (Details).
 */
function isActionSectionEndHeading(normalizedHeading: string): boolean {
  return /^(details|transcript|discussion|summary)$/i.test(normalizedHeading);
}

/**
 * True for real Gemini checklist/action lines only.
 * Markdown: "- [ ] \[Owner\] …", "☐ [Owner] …"
 * Plaintext: "* [Owner] …" (NO checkbox in text/plain exports)
 * Rejects bare transcript speaker lines: "[Lisa Hamilton] spoken words…"
 */
function isChecklistActionLine(line: string): boolean {
  const trimmed = line.trim();
  // Unicode checkbox at start (plaintext Quick notes)
  if (/^[☐☑]/.test(trimmed)) return true;
  // Bullet + checkbox: "- [ ] [Owner]" or "* [ ] [Owner]" (markdown with checkbox)
  if (/^[-*•]\s*\[\s*[xX]?\s*\]/.test(trimmed)) return true;
  // Checkbox alone at start: "[ ] [Owner]" (markdown without bullet)
  if (/^\[\s*[xX]?\s*\]\s+/.test(trimmed)) return true;
  // Bullet + bracket (NO checkbox): "* [Owner]" (text/plain export format)
  if (/^[-*•]\s+\[/.test(trimmed)) return true;
  return false;
}

/**
 * Extract action items from ONLY the explicit action sections
 */
export async function extractExplicitActions(
  meetingId: string,
  meetingDate: string,
  meetingTitle: string,
  fullText: string
): Promise<ActionItem[]> {
  const actions: ActionItem[] = [];
  const lines = fullText.split("\n");
  const seenLineHashes = new Set<string>();  // Dedupe per doc by normalized line
  
  let inActionSection = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Normalize heading to check if it's a section header
    const normalizedHeading = normalizeHeading(trimmed);
    
    // Detect action section start: (Suggested) Next steps
    if (/^(suggested )?next steps$/i.test(normalizedHeading)) {
      inActionSection = true;
      continue;
    }
    
    // Exit action section on Details / Transcript / Discussion / Summary
    // (same normalizeHeading path as Next steps — works for bare plaintext and markdown)
    if (inActionSection && isActionSectionEndHeading(normalizedHeading)) {
      inActionSection = false;
      continue;
    }

    // Exit on any other markdown heading (## / **Title**) that is not Next steps
    if (inActionSection) {
      const isMarkdownHeading = /^#+\s/.test(trimmed) || /^\*\*[^*]+\*\*$/.test(trimmed);
      if (isMarkdownHeading && !/^(suggested )?next steps$/i.test(normalizedHeading)) {
        inActionSection = false;
        continue;
      }
    }
    
    // Only process lines within action sections
    if (!inActionSection) continue;
    
    // Skip empty lines
    if (!trimmed) continue;

    // Only real checklist/action lines — never bare transcript speaker labels
    if (!isChecklistActionLine(trimmed)) continue;
    
    // Normalize line: remove leading markers, backslashes, ** markers, and checkboxes
    const normalized = normalizeLine(trimmed);
    if (!normalized) continue;
    
    // Extract owners (requires bracket group)
    const owners = extractOwners(trimmed);
    if (owners.length === 0) continue;  // Skip if no partners named
    
    // Dedupe per doc by normalized line
    const lineHash = hashString(normalized);
    if (seenLineHashes.has(lineHash)) continue;
    seenLineHashes.add(lineHash);
    
    // Extract title (text before first colon, braces stripped) — this is the UI text source
    const title = extractTitle(trimmed);
    if (!title) continue;
    
    // Rewrite only the short title (never post-bracket prose). On failure, keep the title.
    const rewrittenText = await rewriteAction(meetingId, title, owners[0]);
    
    // Apply formatting
    let formattedText = rewrittenText || title;
    formattedText = formattedText.replace(/\b(\d{4}-\d{2}-\d{2})\b/g, (match) => formatDateOrdinal(match));
    formattedText = shortenPartnerNames(formattedText);
    formattedText = normalizeBasecamp(formattedText);
    
    // Keep title as excerpt (already cleaned)
    let formattedExcerpt = title;
    formattedExcerpt = formattedExcerpt.replace(/\b(\d{4}-\d{2}-\d{2})\b/g, (match) => formatDateOrdinal(match));
    formattedExcerpt = shortenPartnerNames(formattedExcerpt);
    formattedExcerpt = normalizeBasecamp(formattedExcerpt);
    
    // Create one action per owner (for shared actions)
    for (const owner of owners) {
      const actionId = `${meetingId}:${lineHash}:${owner}`;
      
      actions.push({
        id: actionId,
        meetingId,
        meetingDate,
        meetingTitle: cleanMeetingTitle(meetingTitle),
        text: formattedText,
        owner,
        excerpt: formattedExcerpt,
      });
    }
  }
  
  return actions;
}

export type ExtractionDiagnostic = {
  cacheHit: boolean;
  durationMs?: number;
  meetingsProcessed: number;
  meetingsFailed: number;
  latestMeetingDate: string | null;
  errors: Array<{ stage: string; code: string }>;
};

export type ExtractionResult = {
  actions: ActionItem[];
  diagnostic: ExtractionDiagnostic;
};

/**
 * Extract all actions from all meetings with Redis caching
 * Returns actions + diagnostic metadata from actual extraction pipeline
 */
export const extractAllActions = createServerFn({ method: "GET" }).handler(
  async (): Promise<ExtractionResult> => {
    const { listMeetings, getMeetingMinutes } = await import("./minutes");
    const redis = await getRedisClient();
    
    const errors: Array<{ stage: string; code: string }> = [];
    const extractStart = Date.now();
    let cacheHit = false;
    let durationMs: number | undefined;
    
    try {
      // Get list of meetings (fast metadata fetch)
      const meetings = await listMeetings();
      // Find actual latest date, don't assume sort order
      const latestMeetingDate = meetings.length > 0 
        ? meetings.reduce((max, m) => m.date > max ? m.date : max, meetings[0].date)
        : null;
      
      // Create cache key based on meeting IDs and modified times
      // This automatically invalidates when meetings are added/modified
      // Version namespace: bump when extraction logic changes
      const CACHE_VERSION = 'v2-plaintext';
      const meetingFingerprint = meetings
        .map((m) => `${m.id}:${m.modifiedTime || ''}`)
        .join('|');
      const cacheKey = `actions-cache:${CACHE_VERSION}:${hashString(meetingFingerprint)}`;
      
      // Try cache first
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
                meetingsFailed: 0,
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
      const BATCH_SIZE = 5;  // Smaller batch due to xAI calls
      for (let i = 0; i < meetings.length; i += BATCH_SIZE) {
        const batch = meetings.slice(i, i + BATCH_SIZE);
        const batchPromises = batch.map(async (meeting) => {
          try {
            const minutes = await getMeetingMinutes({ data: { meetingId: meeting.id } });
            if (!minutes) {
              meetingsFailed++;
              console.error(`[extractAllActions] Export null for meeting ${meeting.id}`);
              errors.push({ stage: 'export', code: 'NULL_RESULT' });
              return [];
            }
            
            return await extractExplicitActions(
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
      
      // Cache for 5 minutes (300 seconds) - only cache actions, not diagnostic
      // Short TTL ensures fresh data while preventing slow loads
      if (redis && meetingsFailed === 0) {
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
);

/**
 * Get all action completions from Redis
 */
export const getActionCompletions = createServerFn({ method: "GET" }).handler(
  async (): Promise<ActionCompletion[]> => {
    const redis = await getRedisClient();
    if (!redis) {
      return [];
    }
    
    try {
      const keys = await redis.keys("action:*");
      if (keys.length === 0) {
        return [];
      }
      
      const completions: ActionCompletion[] = [];
      for (const key of keys) {
        const data = await redis.get(key);
        if (data && typeof data === "object") {
          completions.push(data as ActionCompletion);
        }
      }
      
      return completions;
    } catch (error) {
      console.error("[getActionCompletions] Redis error:", error);
      return [];
    }
  }
);

/**
 * Mark an action as complete
 */
export const markActionComplete = createServerFn({ method: "POST" })
  .validator((d: { actionId: string; completedBy: PartnerName }) => d)
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const redis = await getRedisClient();
    if (!redis) {
      return { ok: false, error: "Redis not configured" };
    }
    
    try {
      const completion: ActionCompletion = {
        actionId: data.actionId,
        completedBy: data.completedBy,
        completedAt: new Date().toISOString(),
      };
      
      await redis.set(`action:${data.actionId}`, completion);
      return { ok: true };
    } catch (error: any) {
      console.error("[markActionComplete] Redis error:", error);
      return { ok: false, error: error.message || "Failed to save completion" };
    }
  });

/**
 * Undo action completion
 */
export const undoActionComplete = createServerFn({ method: "POST" })
  .validator((d: { actionId: string; completedBy: PartnerName }) => d)
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const redis = await getRedisClient();
    if (!redis) {
      return { ok: false, error: "Redis not configured" };
    }
    
    try {
      const key = `action:${data.actionId}`;
      const existing = await redis.get(key);
      
      if (existing && typeof existing === "object") {
        const completion: ActionCompletion = {
          ...(existing as ActionCompletion),
          undone: true,
        };
        await redis.set(key, completion);
      } else {
        await redis.del(key);
      }
      
      return { ok: true };
    } catch (error: any) {
      console.error("[undoActionComplete] Redis error:", error);
      return { ok: false, error: error.message || "Failed to undo completion" };
    }
  });

/**
 * Check if Redis is configured
 */
export const isRedisConfigured = createServerFn({ method: "GET" }).handler(async (): Promise<boolean> => {
  const redis = await getRedisClient();
  return redis !== null;
});
