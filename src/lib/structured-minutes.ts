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
 * Caching: In-memory per documentId + modifiedTime
 * Cost: ~$0.03-0.10 per meeting (depends on length)
 */

import { createServerFn } from "@tanstack/react-start";

// xAI model for structured extraction
export const XAI_MODEL = "grok-2-1212";

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
 * Generate structured minutes from raw meeting text
 */
export const generateStructuredMinutes = createServerFn({ method: "GET" })
  .validator((d: { meetingId: string; modifiedTime: string; fullText: string }) => d)
  .handler(async ({ data }): Promise<StructuredMinutes | { error: string }> => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return { error: "XAI_API_KEY not configured" };
    }

    // Check cache first
    const cacheKey = getCacheKey(data.meetingId, data.modifiedTime);
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Check if we need to chunk the text
      const chunks = chunkText(data.fullText);
      const chunkResults: StructuredMinutes[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const chunkLabel = chunks.length > 1 ? ` (part ${i + 1}/${chunks.length})` : "";

        // Generate structured minutes with xAI using structured outputs
        const prompt = `Parse this meeting transcript${chunkLabel} into structured minutes. Extract only what is explicitly stated - never invent information.${chunks.length > 1 ? "\n\nThis is part of a larger document; extract from this section only." : ""}

Meeting transcript:
${chunk}`;

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
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorDetail = "Failed to generate structured minutes";
          try {
            const errorJson = JSON.parse(errorText);
            if (errorJson.error?.message) {
              errorDetail = errorJson.error.message;
            }
          } catch {
            errorDetail = errorText.substring(0, 200);
          }
          console.error("xAI error:", errorText);
          return { error: `xAI API error: ${errorDetail}` };
        }

        const result = await response.json();
        const content = result.choices?.[0]?.message?.content;

        if (!content) {
          return { error: "No response from xAI" };
        }

        // Parse JSON response (structured output guarantees valid JSON)
        try {
          const parsed = JSON.parse(content);

          const chunkResult: StructuredMinutes = {
            meetingId: data.meetingId,
            attendees: parsed.attendees || [],
            keyDecisions: parsed.keyDecisions || [],
            actionItems: parsed.actionItems || [],
            openQuestions: parsed.openQuestions || [],
            summary: parsed.summary || "",
            generatedAt: new Date().toISOString(),
          };

          chunkResults.push(chunkResult);
        } catch (error) {
          console.error("Parse error:", error, content);
          return { error: "Failed to parse structured minutes" };
        }
      }

      // Merge results from all chunks
      const merged = mergeStructuredResults(chunkResults);

      // Cache final result
      cache.set(cacheKey, merged);

      return merged;
    } catch (error: any) {
      console.error("Generation error:", error);
      return { error: error.message || "Failed to generate structured minutes" };
    }
  });

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
