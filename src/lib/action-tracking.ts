/**
 * Action tracking for meeting minutes
 * Extracts explicit action items assigned to named partners
 * Persists completion state in Upstash Redis via Vercel Marketplace
 */

import { createServerFn } from "@tanstack/react-start";
import { formatDateOrdinal, normalizeBasecamp, shortenPartnerNames } from "./minutes-archive";

// Known partner first names
const PARTNER_NAMES = ["Lisa", "Tess", "Norah", "Christopher"] as const;
type PartnerName = (typeof PARTNER_NAMES)[number];

export type ActionItem = {
  id: string; // Unique identifier: `${meetingId}:${index}`
  meetingId: string;
  meetingDate: string; // YYYY-MM-DD
  meetingTitle: string;
  text: string; // Action text with formatting applied
  owner: PartnerName; // Assigned partner (first name only)
  excerpt: string; // Short verbatim excerpt from source
};

export type ActionCompletion = {
  actionId: string;
  completedBy: PartnerName; // Who marked it done (first name)
  completedAt: string; // ISO timestamp
  undone?: boolean; // True if completion was undone
};

/**
 * Extract explicit action items from meeting text
 * Only returns actions that are:
 * - Clearly stated (not vague or inferred)
 * - Assigned to a specific named partner
 * - Never guessed
 */
export function extractExplicitActions(
  meetingId: string,
  meetingDate: string,
  meetingTitle: string,
  fullText: string
): ActionItem[] {
  const actions: ActionItem[] = [];
  const lines = fullText.split("\n");
  
  let inActionSection = false;
  let actionIndex = 0;
  
  // Patterns for action section headers
  const actionHeaderPattern = /^#{1,3}\s*(action items?|next steps?|follow[- ]?ups?|tasks?|todos?)/i;
  
  // Pattern for explicit assignment: "Lisa will..." or "Tess to..." or "- Christopher: do X"
  const explicitAssignmentPatterns = [
    // "- Lisa: do X" or "• Tess: finish Y" (must start with bullet)
    /^[-•*]\s*(Lisa|Tess|Norah|Christopher)\s*:\s*(.+)$/i,
    // "Lisa will do X" or "Lisa should X" or "Lisa needs to X" (can be anywhere)
    /\b(Lisa|Tess|Norah|Christopher)\s+(will|should|needs? to|must|has to)\s+(.+)$/i,
    // "Lisa - complete Y" (can be anywhere)
    /\b(Lisa|Tess|Norah|Christopher)\s*[-–—]\s*(.+)$/i,
  ];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Detect action section headers
    if (actionHeaderPattern.test(trimmed)) {
      inActionSection = true;
      continue;
    }
    
    // Exit action section on new header
    if (/^#{1,3}\s/.test(trimmed) && inActionSection && !actionHeaderPattern.test(trimmed)) {
      inActionSection = false;
      continue;
    }
    
    // Skip empty lines and very short lines
    if (trimmed.length < 10) continue;
    
    // Only process lines in action sections or lines with explicit assignment markers
    const hasExplicitMarker = explicitAssignmentPatterns.some(p => p.test(trimmed));
    if (!inActionSection && !hasExplicitMarker) continue;
    
    // Try to match explicit assignment patterns
    let owner: PartnerName | null = null;
    let actionText: string | null = null;
    let excerpt = trimmed;
    
    // First, try to strip leading bullet if present
    const strippedLine = trimmed.replace(/^[-•*]\s*/, '');
    
    for (const pattern of explicitAssignmentPatterns) {
      // Try both trimmed (with bullet) and stripped (without bullet)
      let match = trimmed.match(pattern);
      if (!match && strippedLine !== trimmed) {
        match = strippedLine.match(pattern);
      }
      
      if (match) {
        // Different patterns have owner/text at different positions
        if (pattern.source.includes('^[-•*]')) {
          // Pattern 1: "- OWNER: TEXT" (bullet with colon)
          owner = match[1] as PartnerName;
          actionText = match[2]?.trim();
        } else if (pattern.source.includes('will|should|needs')) {
          // Pattern 2: "OWNER will/should TEXT"
          owner = match[1] as PartnerName;
          actionText = match[3]?.trim();
        } else {
          // Pattern 3: "OWNER - TEXT" (dash)
          owner = match[1] as PartnerName;
          actionText = match[2]?.trim();
        }
        break;
      }
    }
    
    // Skip if no explicit owner found
    if (!owner || !actionText) continue;
    
    // Validate owner is a known partner
    if (!PARTNER_NAMES.includes(owner)) continue;
    
    // Filter out vague actions
    const vaguePhrases = [
      /\b(might|maybe|could|possibly|consider|think about|look into)\b/i,
      /\b(tbd|to be determined|unclear|unsure|when clarity|pending)\b/i,
      /\(tbd[^)]*\)/i, // (TBD on something)
    ];
    const isVague = vaguePhrases.some(p => p.test(actionText));
    if (isVague) continue;
    
    // Skip if action text is too short or generic
    if (actionText.length < 15) continue;
    if (/^(do|complete|finish|work on|handle)\s*$/i.test(actionText)) continue;
    
    // Apply formatting rules: first names, ordinal dates, Basecamp normalization
    let formattedText = actionText;
    formattedText = formattedText.replace(/\b(\d{4}-\d{2}-\d{2})\b/g, (match) => formatDateOrdinal(match));
    formattedText = shortenPartnerNames(formattedText);
    formattedText = normalizeBasecamp(formattedText);
    
    // Format excerpt similarly
    let formattedExcerpt = excerpt.substring(0, 200); // Max 200 chars
    formattedExcerpt = formattedExcerpt.replace(/\b(\d{4}-\d{2}-\d{2})\b/g, (match) => formatDateOrdinal(match));
    formattedExcerpt = shortenPartnerNames(formattedExcerpt);
    formattedExcerpt = normalizeBasecamp(formattedExcerpt);
    
    actions.push({
      id: `${meetingId}:${actionIndex}`,
      meetingId,
      meetingDate,
      meetingTitle,
      text: formattedText,
      owner,
      excerpt: formattedExcerpt,
    });
    
    actionIndex++;
  }
  
  return actions;
}

/**
 * Get Redis client if env vars are configured
 * Reads KV_REST_API_URL/KV_REST_API_TOKEN or UPSTASH_REDIS_REST_URL/TOKEN
 */
async function getRedisClient() {
  try {
    const { Redis } = await import("@upstash/redis");
    
    // Check for either set of env vars
    const hasKvVars = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;
    const hasUpstashVars = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;
    
    if (!hasKvVars && !hasUpstashVars) {
      console.log("[action-tracking] Redis env vars not configured (KV_REST_API_URL/TOKEN or UPSTASH_REDIS_REST_URL/TOKEN)");
      return null;
    }
    
    // Redis.fromEnv() reads both sets automatically
    const redis = Redis.fromEnv();
    return redis;
  } catch (error) {
    console.error("[action-tracking] Failed to create Redis client:", error);
    return null;
  }
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
      
      // Process meetings in batches to avoid overwhelming the API
      const BATCH_SIZE = 10;
      for (let i = 0; i < meetings.length; i += BATCH_SIZE) {
        const batch = meetings.slice(i, i + BATCH_SIZE);
        const batchPromises = batch.map(async (meeting) => {
          try {
            const minutes = await getMeetingMinutes({ data: { meetingId: meeting.id } });
            if (!minutes) return [];
            
            return extractExplicitActions(
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
      
      // Sort by date descending (most recent first)
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
 * Returns empty array if Redis is not configured
 */
export const getActionCompletions = createServerFn({ method: "GET" }).handler(
  async (): Promise<ActionCompletion[]> => {
    const redis = await getRedisClient();
    if (!redis) {
      return [];
    }
    
    try {
      // Get all completion keys
      const keys = await redis.keys("action:*");
      if (keys.length === 0) {
        return [];
      }
      
      // Fetch all completions
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
        // If no completion exists, just delete the key
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
