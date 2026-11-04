/**
 * Action tracking for meeting minutes
 * Extracts action items from explicit action sections only
 * Uses xAI to rewrite into short imperatives
 * Caches rewrites in Upstash Redis
 */

import { createServerFn } from "@tanstack/react-start";
import { formatDateOrdinal, normalizeBasecamp, shortenPartnerNames } from "./minutes-archive";
import { createHash } from "crypto";

const XAI_MODEL = "grok-beta";

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
 * Extract partner name from action line
 * Returns null if no partner is named or if non-partner is named
 */
function extractOwner(line: string): PartnerName | null {
  // Pattern: "[Lisa Hamilton]" or "Lisa:" or "Lisa will" or "Lisa -"
  const patterns = [
    /\[([^\]]+)\]/,  // [Name]
    /^[-•*]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*[:–-]/,  // Name: or Name -
    /^[-•*]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(will|should|needs? to|must|to)\s+/i,  // Name will
  ];
  
  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match) {
      const name = match[1].trim();
      // Extract first name
      const firstName = name.split(/\s+/)[0];
      // Check if it matches a partner
      if (PARTNER_NAMES.includes(firstName as PartnerName)) {
        return firstName as PartnerName;
      }
    }
  }
  
  return null;
}

/**
 * Rewrite action line into short imperative using xAI
 * Cached by doc id + line hash
 */
async function rewriteAction(
  meetingId: string,
  sourceLine: string,
  owner: PartnerName
): Promise<string> {
  const redis = await getRedisClient();
  const lineHash = hashString(sourceLine);
  const cacheKey = `action-rewrite:${meetingId}:${lineHash}`;
  
  // Check cache first
  if (redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached && typeof cached === "string") {
        return cached;
      }
    } catch (error) {
      console.error("[rewriteAction] Cache read error:", error);
    }
  }
  
  // Rewrite with xAI
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    // Fallback: just clean up the source line
    return sourceLine
      .replace(/^\[?[^\]]*\]?\s*[:–-]?\s*/i, '')  // Remove owner prefix
      .replace(/^[-•*]\s*/, '')  // Remove bullet
      .trim()
      .substring(0, 100);  // Cap at 100 chars
  }
  
  const prompt = `Rewrite this action item into a clear, short imperative sentence of 12 words maximum.

Source: "${sourceLine}"
Owner: ${owner}

Rules:
1. Start with a verb (e.g., "Ask", "Review", "Complete", "Schedule", "Send")
2. Maximum 12 words
3. Keep all facts from the source - don't add new information
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
            content: "You rewrite action items into short, clear imperatives. Be concise and specific."
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
    const rewritten = result.choices?.[0]?.message?.content?.trim() || sourceLine;
    
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
    // Fallback to cleaned source
    return sourceLine
      .replace(/^\[?[^\]]*\]?\s*[:–-]?\s*/i, '')
      .replace(/^[-•*]\s*/, '')
      .trim()
      .substring(0, 100);
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
  
  let inActionSection = false;
  const actionSectionPattern = /^#{1,3}\s*(suggested next steps?|action items?|next steps?|follow[- ]?ups?|tasks?)/i;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Detect action section start
    if (actionSectionPattern.test(trimmed)) {
      inActionSection = true;
      continue;
    }
    
    // Exit action section on new header
    if (/^#{1,3}\s/.test(trimmed) && inActionSection) {
      inActionSection = false;
      continue;
    }
    
    // Only process lines within action sections
    if (!inActionSection) continue;
    
    // Skip empty or very short lines
    if (trimmed.length < 10) continue;
    
    // Skip lines that don't look like action items (no bullet/number)
    if (!/^[-•*\d]/.test(trimmed)) continue;
    
    // Extract owner
    const owner = extractOwner(trimmed);
    if (!owner) continue;  // Skip if no partner is named
    
    // Generate stable ID from doc id + line hash
    const lineHash = hashString(trimmed);
    const actionId = `${meetingId}:${lineHash}`;
    
    // Rewrite the action into short imperative
    const rewrittenText = await rewriteAction(meetingId, trimmed, owner);
    
    // Apply formatting
    let formattedText = rewrittenText;
    formattedText = formattedText.replace(/\b(\d{4}-\d{2}-\d{2})\b/g, (match) => formatDateOrdinal(match));
    formattedText = shortenPartnerNames(formattedText);
    formattedText = normalizeBasecamp(formattedText);
    
    // Keep verbatim source as excerpt
    let formattedExcerpt = trimmed;
    formattedExcerpt = formattedExcerpt.replace(/\b(\d{4}-\d{2}-\d{2})\b/g, (match) => formatDateOrdinal(match));
    formattedExcerpt = shortenPartnerNames(formattedExcerpt);
    formattedExcerpt = normalizeBasecamp(formattedExcerpt);
    
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
  
  return actions;
}

/**
 * Extract all actions from all meetings
 */
export const extractAllActions = createServerFn({ method: "GET" }).handler(
  async (): Promise<ActionItem[]> => {
    const { listMeetings, getMeetingMinutes } = await import("./minutes");
    
    try {
      const meetings = await listMeetings();
      const allActions: ActionItem[] = [];
      
      // Process meetings in batches
      const BATCH_SIZE = 5;  // Smaller batch due to xAI calls
      for (let i = 0; i < meetings.length; i += BATCH_SIZE) {
        const batch = meetings.slice(i, i + BATCH_SIZE);
        const batchPromises = batch.map(async (meeting) => {
          try {
            const minutes = await getMeetingMinutes({ data: { meetingId: meeting.id } });
            if (!minutes) return [];
            
            return await extractExplicitActions(
              meeting.id,
              meeting.date,
              meeting.title,
              minutes.fullText
            );
          } catch (error) {
            console.error(`[extractAllActions] Failed to process meeting ${meeting.id}:`, error);
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
      
      return allActions;
    } catch (error) {
      console.error("[extractAllActions] Error:", error);
      return [];
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
