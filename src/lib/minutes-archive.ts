/**
 * Minutes Archive - Answer-first decision search
 * 
 * Approach:
 * 1. Extract and index DECISIONS and ACTION ITEMS heavily weighted
 * 2. Full transcript text is secondary supporting context
 * 3. For questions like "what colour paint?", return direct answer:
 *    "You decided on red for that room, from the February 19th meeting"
 * 4. If no decision found, say so plainly - never guess
 * 
 * Architecture:
 * 1. Backfill: Extract decisions/actions from all docs, embed separately
 * 2. Incremental: Re-index only changed documents
 * 3. Storage: Decisions + embeddings in Vercel Postgres/KV (design, not provisioned)
 * 4. Search: Answer questions by searching decision index first, full text second
 * 5. Cost: ~$10/month by caching embeddings for unchanged content
 * 
 * Storage Schema (design - not provisioned):
 * 
 * Table: meeting_decisions
 * - id: uuid
 * - document_id: string (Google Drive file ID)
 * - document_title: string
 * - meeting_date: string (YYYY-MM-DD)
 * - series: string
 * - decision_text: text (the actual decision or action)
 * - context: text (surrounding sentences)
 * - decision_type: enum (decision | action_item | agreement | commitment)
 * - embedding: vector (1536 dims, weighted heavily in search)
 * - indexed_at: timestamp
 * 
 * Table: meeting_documents
 * - id: string (Google Drive file ID)
 * - title: string
 * - series: string
 * - date: string
 * - modified_time: string
 * - full_text: text (secondary search corpus)
 * - full_text_embedding: vector (1536 dims, lower weight in search)
 * - indexed_at: timestamp
 * 
 * Search Strategy:
 * 1. Embed the question
 * 2. Search meeting_decisions first (high weight)
 * 3. If no strong match, search meeting_documents.full_text (low weight)
 * 4. Return answer: "[Direct answer], from the [Meeting Title] on [Date]"
 * 5. If nothing relevant: "I don't have a record of a decision about that"
 */

import { createServerFn } from "@tanstack/react-start";
import { XAI_MODEL } from "./structured-minutes.ts";

export type MeetingSeries = "badlanders" | "business_dev" | "partner_marketing" | "other";

export const SERIES_BADGES: Record<MeetingSeries, string> = {
  badlanders: "BDM",
  business_dev: "BD",
  partner_marketing: "PM",
  other: "Other",
};

export type DecisionType = "decision" | "action_item" | "agreement" | "commitment";

export type IndexedDecision = {
  id: string; // UUID
  documentId: string; // Google Drive file ID
  documentTitle: string;
  meetingDate: string;
  series: MeetingSeries;
  decisionText: string;
  context: string; // Surrounding sentences
  decisionType: DecisionType;
  embedding?: number[]; // Stored in DB
  indexedAt: string;
};

export type IndexedDocument = {
  id: string;
  title: string;
  series: MeetingSeries;
  date: string;
  time: string;
  createdTime: string;
  modifiedTime: string;
  fullText: string;
  decisions: IndexedDecision[]; // Extracted decisions
  fullTextEmbedding?: number[]; // Lower weight
  indexedAt: string;
  score?: number; // Relevance score for search ranking
};

export type AnswerResult = {
  answer: string; // Direct answer to the question
  confidence: "high" | "medium" | "low";
  sources: Array<{
    documentId: string;
    documentTitle: string;
    meetingDate: string;
    excerpt: string; // Verbatim supporting text
    isDecision: boolean; // True if from decisions index
  }>;
  notFound?: boolean; // True if no relevant information
};

export type IndexStats = {
  totalDocuments: number;
  bySeriesCount: Record<MeetingSeries, number>;
  lastIndexedAt: string | null;
  oldestDocument: string | null;
  newestDocument: string | null;
};

const FOLDER_ID = "1xehL5chPhYNNqtXm5jTIu7bOVV77fpXL";
const PAGE_SIZE = 100; // Google Drive API page size

/**
 * Detect meeting series from title
 */
export function detectSeries(title: string): MeetingSeries {
  const lower = title.toLowerCase();
  if (lower.includes("badlander")) return "badlanders";
  if (lower.includes("business development") || lower.includes("bizdev")) return "business_dev";
  if (lower.includes("partner marketing") || lower.includes("marketing")) return "partner_marketing";
  return "other";
}

/**
 * Extract decisions and action items from meeting text
 * Prioritizes: decisions, agreements, commitments, action items
 */
function extractDecisions(text: string): Array<{ text: string; context: string; type: DecisionType }> {
  const decisions: Array<{ text: string; context: string; type: DecisionType }> = [];
  const lines = text.split("\n");

  // Decision markers
  const decisionMarkers = [
    /\b(decided|agreed|determined|resolved|concluded)\b/i,
    /\b(decision|agreement|commitment)\b/i,
  ];

  const actionMarkers = [
    /\b(action|next step|todo|task|follow[- ]?up)\b/i,
    /^[\s-*•]*(action|next step|todo)/i,
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Check for decision markers
    const isDecision = decisionMarkers.some((marker) => marker.test(line));
    const isAction = actionMarkers.some((marker) => marker.test(line));

    if (isDecision || isAction) {
      // Capture context (previous and next lines)
      const contextStart = Math.max(0, i - 1);
      const contextEnd = Math.min(lines.length - 1, i + 1);
      const context = lines.slice(contextStart, contextEnd + 1).join(" ").trim();

      decisions.push({
        text: line,
        context,
        type: isDecision ? "decision" : "action_item",
      });
    }
  }

  return decisions;
}

/**
 * Parse date/time from Gemini notes content
 */
function parseDateTime(text: string): { date: string; time: string } | null {
  const patterns = [
    /(?:started|held|occurred)\s+(?:at|on)\s+(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)\s+(?:on\s+)?(\w+\s+\d{1,2},?\s+\d{4})/i,
    /(\w+\s+\d{1,2},?\s+\d{4})\s+at\s+(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        const dateStr = match[2] || match[1];
        const timeStr = match[1]?.includes(":") ? match[1] : match[2];
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          return {
            date: date.toISOString().split("T")[0],
            time: timeStr || "00:00",
          };
        }
      } catch {
        continue;
      }
    }
  }
  return null;
}

async function getGoogleDriveClient() {
  const keyJson = process.env.GOOGLE_SA_KEY;
  if (!keyJson) return null;

  try {
    const key = JSON.parse(keyJson);
    const { google } = await import("googleapis");
    const auth = new google.auth.GoogleAuth({
      credentials: key,
      scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    });
    return google.drive({ version: "v3", auth });
  } catch (error) {
    console.error("Failed to initialize Google Drive client:", error);
    return null;
  }
}

/**
 * Test folder access and count visible files
 */
export const testFolderAccess = createServerFn({ method: "GET" }).handler(async () => {
  const drive = await getGoogleDriveClient();
  if (!drive) {
    return { error: "Drive client not configured", count: 0 };
  }

  try {
    let totalFiles = 0;
    let pageToken: string | undefined;

    do {
      const response = await drive.files.list({
        q: `'${FOLDER_ID}' in parents and trashed=false`,
        fields: "nextPageToken, files(id, name, mimeType)",
        pageSize: PAGE_SIZE,
        pageToken,
      });

      const files = response.data.files || [];
      totalFiles += files.length;
      pageToken = response.data.nextPageToken || undefined;
    } while (pageToken);

    return { success: true, count: totalFiles };
  } catch (error: any) {
    return { error: error.message || "Access denied", count: 0 };
  }
});

/**
 * Backfill: Index all documents in folder
 * 
 * Storage requirement: This needs Vercel Postgres/KV to persist
 * Currently returns in-memory for demonstration
 */
export const backfillDocuments = createServerFn({ method: "POST" }).handler(async () => {
  const drive = await getGoogleDriveClient();
  if (!drive) {
    return { error: "Drive client not configured" };
  }

  const documents: IndexedDocument[] = [];
  let pageToken: string | undefined;
  let totalProcessed = 0;

  try {
    do {
      const response = await drive.files.list({
        q: `'${FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.document' and trashed=false`,
        fields: "nextPageToken, files(id, name, createdTime, modifiedTime)",
        pageSize: PAGE_SIZE,
        pageToken,
        orderBy: "createdTime desc",
      });

      const files = response.data.files || [];

      for (const file of files) {
        if (!file.id || !file.name) continue;

        try {
          // Export document as text
          const exportResponse = await drive.files.export(
            {
              fileId: file.id,
              mimeType: "text/plain",
            },
            { responseType: "text" }
          );

          const fullText = String(exportResponse.data);
          const parsedDateTime = parseDateTime(fullText);
          const createdDate = new Date(file.createdTime || "");

          const doc: IndexedDocument = {
            id: file.id,
            title: file.name,
            series: detectSeries(file.name),
            date: parsedDateTime?.date || createdDate.toISOString().split("T")[0],
            time: parsedDateTime?.time || "00:00",
            createdTime: file.createdTime || "",
            modifiedTime: file.modifiedTime || "",
            fullText,
            decisions: [],
            indexedAt: new Date().toISOString(),
          };

          documents.push(doc);
          totalProcessed++;
        } catch (error) {
          console.error(`Failed to process file ${file.id}:`, error);
        }
      }

      pageToken = response.data.nextPageToken || undefined;
    } while (pageToken);

    // TODO: Store in Vercel Postgres/KV
    // await storeDocuments(documents);

    const stats: IndexStats = {
      totalDocuments: documents.length,
      bySeriesCount: {
        badlanders: documents.filter((d) => d.series === "badlanders").length,
        business_dev: documents.filter((d) => d.series === "business_dev").length,
        partner_marketing: documents.filter((d) => d.series === "partner_marketing").length,
        other: documents.filter((d) => d.series === "other").length,
      },
      lastIndexedAt: new Date().toISOString(),
      oldestDocument: documents.length > 0 ? documents[documents.length - 1].date : null,
      newestDocument: documents.length > 0 ? documents[0].date : null,
    };

    return { success: true, stats, totalProcessed };
  } catch (error: any) {
    console.error("Backfill error:", error);
    return { error: error.message || "Backfill failed" };
  }
});

/**
 * Incremental indexing: Re-index only changed documents
 * 
 * Storage requirement: Compare modifiedTime with stored indexed_at
 */
export const incrementalIndex = createServerFn({ method: "POST" }).handler(async () => {
  const drive = await getGoogleDriveClient();
  if (!drive) {
    return { error: "Drive client not configured" };
  }

  // TODO: Get last indexed time from storage
  const lastIndexedAt = "2026-01-01T00:00:00Z"; // Stub

  try {
    // Query only files modified after last index
    const response = await drive.files.list({
      q: `'${FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.document' and trashed=false and modifiedTime > '${lastIndexedAt}'`,
      fields: "files(id, name, createdTime, modifiedTime)",
      pageSize: PAGE_SIZE,
    });

    const changedFiles = response.data.files || [];
    const updated: IndexedDocument[] = [];

    for (const file of changedFiles) {
      if (!file.id || !file.name) continue;

      try {
        const exportResponse = await drive.files.export(
          {
            fileId: file.id,
            mimeType: "text/plain",
          },
          { responseType: "text" }
        );

        const fullText = String(exportResponse.data);
        const parsedDateTime = parseDateTime(fullText);
        const createdDate = new Date(file.createdTime || "");

        const doc: IndexedDocument = {
          id: file.id,
          title: file.name,
          series: detectSeries(file.name),
          date: parsedDateTime?.date || createdDate.toISOString().split("T")[0],
          time: parsedDateTime?.time || "00:00",
          createdTime: file.createdTime || "",
          modifiedTime: file.modifiedTime || "",
          fullText,
          decisions: [],
          indexedAt: new Date().toISOString(),
        };

        updated.push(doc);
      } catch (error) {
        console.error(`Failed to process file ${file.id}:`, error);
      }
    }

    // TODO: Update embeddings only for changed docs
    // await updateEmbeddings(updated);

    return {
      success: true,
      updatedCount: updated.length,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error("Incremental index error:", error);
    return { error: error.message || "Incremental indexing failed" };
  }
});

/**
 * Answer questions by searching decisions first, full text second
 * Returns direct answer with citations, never guesses
 * 
 * Example:
 * Q: "what colour paint were we using for that room?"
 * A: "You decided on red for that room, from the Badlander's Development Meeting on February 19th"
 */
// Simple keyword scoring for relevance
function scoreDocRelevance(text: string, query: string): number {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const stopWords = new Set(['what', 'was', 'is', 'the', 'a', 'an', 'for', 'to', 'of', 'in', 'on', 'at', 'from', 'with', 'about']);
  const queryWords = lowerQuery.split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));
  
  if (queryWords.length === 0) return 0;
  
  let score = 0;
  for (const word of queryWords) {
    const matches = (lowerText.match(new RegExp(word, 'g')) || []).length;
    score += Math.log(1 + matches) * 2;
  }
  
  return score;
}

// Extract relevant passages around query terms with surrounding context
function extractRelevantPassages(text: string, query: string, maxPassages: number = 3, contextChars: number = 1000): string {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const stopWords = new Set(['what', 'was', 'is', 'the', 'a', 'an', 'for', 'to', 'of', 'in', 'on', 'at', 'from', 'with', 'about']);
  const queryWords = lowerQuery.split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));
  
  if (queryWords.length === 0) {
    // No specific keywords, return start of doc
    return text.slice(0, contextChars * 2);
  }
  
  const passages: Array<{ start: number; score: number }> = [];
  
  // Find all positions where query words appear
  for (const word of queryWords) {
    const regex = new RegExp(word, 'gi');
    let match;
    while ((match = regex.exec(lowerText)) !== null) {
      const pos = match.index;
      passages.push({ start: pos, score: 1 });
    }
  }
  
  if (passages.length === 0) {
    // No matches, return start of doc
    return text.slice(0, contextChars * 2);
  }
  
  // Sort by position and merge overlapping regions
  passages.sort((a, b) => a.start - b.start);
  
  const merged: Array<{ start: number; end: number }> = [];
  for (const p of passages) {
    const start = Math.max(0, p.start - contextChars);
    const end = Math.min(text.length, p.start + contextChars);
    
    if (merged.length === 0 || start > merged[merged.length - 1].end) {
      merged.push({ start, end });
    } else {
      merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, end);
    }
  }
  
  // Take top N passages and join with separator
  return merged
    .slice(0, maxPassages)
    .map(({ start, end }) => text.slice(start, end))
    .join('\n\n[...]\n\n');
}

// Server-side keyword search that returns snippets without fetching all meetings
export const searchMeetingsKeywords = createServerFn({ method: "POST" })
  .validator((d: { query: string }) => d)
  .handler(async ({ data }): Promise<Array<{ meeting: { id: string; title: string; date: string; time: string }; excerpt?: string }>> => {
    const drive = await getGoogleDriveClient();
    if (!drive) return [];

    try {
      const { listMeetings } = await import("./minutes");
      const allMeetings = await listMeetings();
      const lowerQ = data.query.toLowerCase();
      
      // Quick metadata search first
      const metadataMatches = allMeetings.filter(m => 
        m.title.toLowerCase().includes(lowerQ) || m.date.includes(lowerQ)
      ).map(m => ({ meeting: { id: m.id, title: m.title, date: m.date, time: m.time } }));
      
      if (metadataMatches.length > 0) return metadataMatches.slice(0, 10);
      
      // Use Drive full-text search with the query
      const searchQuery = `mimeType='application/vnd.google-apps.document' and trashed=false and fullText contains '${lowerQ.replace(/'/g, "\\'")}'`;
      const searchResponse = await drive.files.list({
        q: searchQuery,
        fields: "files(id)",
        pageSize: 20,
      });
      
      const matchedIds = new Set((searchResponse.data.files || []).map(f => f.id).filter(Boolean) as string[]);
      const matched = allMeetings.filter(m => matchedIds.has(m.id)).slice(0, 10);
      
      return matched.map(m => ({ meeting: { id: m.id, title: m.title, date: m.date, time: m.time } }));
    } catch {
      return [];
    }
  });

// Core search logic that can be tested independently
export async function searchAndAnswer(
  question: string,
  series?: MeetingSeries
): Promise<AnswerResult | { error: string }> {
  const startTime = Date.now();
  console.log(`[answerQuestion] Starting query: "${question}"`);
    
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return { error: "XAI_API_KEY not configured" };
    }

    const driveStart = Date.now();
    const drive = await getGoogleDriveClient();
    if (!drive) {
      return { error: "Drive client not configured" };
    }
    console.log(`[answerQuestion] Drive client init: ${Date.now() - driveStart}ms`);

    try {
      const { listMeetings } = await import("./minutes");
      const allMeetings = await listMeetings();
      console.log(`[answerQuestion] Retrieved ${allMeetings.length} total meetings from listMeetings`);
      
      if (allMeetings.length === 0) {
        return {
          answer: "No meeting records are available yet.",
          confidence: "high",
          sources: [],
          notFound: true,
        };
      }
      
      const allDocIds = new Set(allMeetings.map(m => m.id));
      
      // Broaden search with synonyms and key terms
      const searchStart = Date.now();
      const queryLower = question.toLowerCase();
      const baseWords = queryLower.split(/\s+/).filter(w => w.length > 3);
      
      // Add synonyms for common terms
      const synonymMap: Record<string, string[]> = {
        'spa': ['spa', 'wellness', 'retreat'],
        'headquarters': ['headquarters', 'office', 'location', 'base'],
        'name': ['name', 'named', 'call', 'called', 'naming'],
        'decided': ['decided', 'decision', 'agreed', 'agreement'],
      };
      
      const expandedTerms = new Set<string>();
      baseWords.forEach(word => {
        expandedTerms.add(word);
        if (synonymMap[word]) {
          synonymMap[word].forEach(syn => expandedTerms.add(syn));
        }
      });
      
      const searchTerms = Array.from(expandedTerms).slice(0, 15);
      let candidateIds: Set<string>;
      
      if (searchTerms.length > 0) {
        const searchQuery = `mimeType='application/vnd.google-apps.document' and trashed=false and (${searchTerms.map(w => `fullText contains '${w}'`).join(' or ')})`;
        
        const searchResponse = await drive.files.list({
          q: searchQuery,
          fields: "files(id)",
          pageSize: 100,
        });
        
        const driveResults = searchResponse.data.files || [];
        console.log(`[answerQuestion] Drive full-text search: ${Date.now() - searchStart}ms (${driveResults.length} raw results)`);
        
        candidateIds = new Set(driveResults.map(f => f.id).filter(id => id && allDocIds.has(id)) as string[]);
        console.log(`[answerQuestion] Filtered to ${candidateIds.size} candidates in our doc set`);
        
        if (candidateIds.size === 0) {
          console.log(`[answerQuestion] Drive returned 0 results, falling back to all meetings`);
          candidateIds = allDocIds;
        }
      } else {
        candidateIds = allDocIds;
      }
      
      // Get top 15 candidates for better recall
      const files = allMeetings.filter(m => candidateIds.has(m.id)).slice(0, 15).map(m => ({
        id: m.id,
        name: m.title,
        createdTime: m.createdTime,
        modifiedTime: m.modifiedTime,
      }));

      // Export top 15 candidates in parallel
      const exportStart = Date.now();
      const documents: IndexedDocument[] = [];
      
      const exportResults = await Promise.all(
        files.map(async (file) => {
          if (!file.id || !file.name) return null;
          if (series && detectSeries(file.name) !== series) return null;
          
          try {
            const exportResponse = await drive.files.export(
              { fileId: file.id, mimeType: "text/plain" },
              { responseType: "text" }
            );
            const fullText = String(exportResponse.data);
            const parsedDateTime = parseDateTime(fullText);
            const createdDate = new Date(file.createdTime || "");
            const extractedDecisions = extractDecisions(fullText);
            
            return {
              id: file.id,
              title: file.name,
              series: detectSeries(file.name),
              date: parsedDateTime?.date || createdDate.toISOString().split("T")[0],
              time: parsedDateTime?.time || "00:00",
              createdTime: file.createdTime || "",
              modifiedTime: file.modifiedTime || "",
              fullText,
              decisions: extractedDecisions.map((d, idx) => ({
                id: `${file.id}-d${idx}`,
                documentId: file.id || "",
                documentTitle: file.name || "",
                meetingDate: parsedDateTime?.date || createdDate.toISOString().split("T")[0],
                series: detectSeries(file.name || ""),
                decisionText: d.text,
                context: d.context,
                decisionType: d.type,
                indexedAt: new Date().toISOString(),
              })),
              indexedAt: new Date().toISOString(),
              score: scoreDocRelevance(fullText + extractedDecisions.map(d => d.text).join(' '), question),
            };
          } catch (error) {
            console.error(`Failed to process ${file.id}:`, error);
            return null;
          }
        })
      );
      
      documents.push(...exportResults.filter((d): d is IndexedDocument & { score: number } => d !== null));
      console.log(`[answerQuestion] Exported ${documents.length} docs: ${Date.now() - exportStart}ms`);
      
      if (documents.length === 0) {
        return {
          answer: "No meeting records are available yet.",
          confidence: "high",
          sources: [],
          notFound: true,
        };
      }

      // Pick top docs by relevance score
      const sortedDocs = documents.sort((a, b) => (b.score || 0) - (a.score || 0));
      console.log(`[answerQuestion] Top ${sortedDocs.length} scores: ${sortedDocs.map(d => (d.score || 0).toFixed(1)).join(', ')}`);
      console.log(`[answerQuestion] Top docs: ${sortedDocs.map(d => `${d.title} (${d.id.slice(0,8)}...)`).join(', ')}`);

      // Build context with decisions and relevant passages, cap at 150KB
      const MAX_CONTEXT_CHARS = 150000;
      const decisionsText = sortedDocs
        .flatMap((d) =>
          d.decisions.map(
            (dec) =>
              `[DECISION from ${d.title} on ${d.date}]\n${dec.decisionText}\nContext: ${dec.context}\n`
          )
        )
        .join("\n\n");

      // Extract passages with more context per doc for better recall
      const passagesPerDoc = Math.floor((MAX_CONTEXT_CHARS - decisionsText.length) / sortedDocs.length);
      
      const passagesText = sortedDocs
        .map((d) => {
          const passages = extractRelevantPassages(d.fullText, question, 5, Math.min(2000, passagesPerDoc));
          return `[MEETING: ${d.title} on ${d.date}]\n${passages}\n===\n`;
        })
        .join("\n");

      const fullContextText = (decisionsText + '\n\n' + passagesText).slice(0, MAX_CONTEXT_CHARS);
      console.log(`[answerQuestion] Context size: ${fullContextText.length} chars (decisions: ${decisionsText.length}, passages: ${passagesText.length})`);

      const prompt = `You are answering questions about Unearth Self meeting decisions and discussions.

PRIORITIZE DECISIONS AND ACTION ITEMS:
${decisionsText}

RELEVANT PASSAGES (Top ${sortedDocs.length} meetings):
${passagesText}

Question: ${question}

Instructions:
1. Answer the question DIRECTLY and CONCISELY
2. If there's a decision recorded, start with the answer, then cite: "from the [Meeting Title] on [Date]"
3. Include a short verbatim excerpt to support your answer
4. If NO relevant decision or discussion found, respond EXACTLY: "I don't have a record of a decision about that"
5. NEVER guess or make up information
6. Prefer decisions/actions over general discussion

Format as JSON:
{
  "answer": "Direct concise answer here, from the Meeting Title on Date",
  "confidence": "high" | "medium" | "low",
  "sources": [
    {
      "documentTitle": "Meeting Title",
      "meetingDate": "YYYY-MM-DD",
      "excerpt": "verbatim quote supporting the answer",
      "isDecision": true
    }
  ],
  "notFound": false
}

If nothing found after thorough search:
{
  "answer": "I don't have a clear record of a decision about that in the available meeting notes",
  "confidence": "low",
  "sources": [],
  "notFound": true
}

IMPORTANT: 
- If you find ANY related information, include it even if it's not a perfect match
- Use "notFound: true" ONLY when absolutely no relevant information exists
- Set confidence to "low" or "medium" when uncertain, NEVER "high" for notFound
- Check for alternative spellings and phrasings (e.g., "Basecamp" vs "Base Camp")`;

      const xaiStart = Date.now();
      console.log(`[answerQuestion] Starting xAI request (context: ${fullContextText.length} chars)...`);
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
                "You answer questions using meeting decisions and discussions. Search thoroughly for related information. If you find anything relevant, include it even if it's not an exact match. Never use high confidence with notFound. Only return notFound when absolutely no relevant information exists.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.1,
        }),
        signal: AbortSignal.timeout(10000), // 10-second timeout for xAI
      });
      console.log(`[answerQuestion] xAI response: ${Date.now() - xaiStart}ms (status: ${response.status})`);

      if (!response.ok) {
        const errorText = await response.text();
        let errorDetail = `HTTP ${response.status}: Failed to generate answer`;
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

      try {
        let jsonStr = content;
        const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
        if (jsonMatch) jsonStr = jsonMatch[1];

        const parsed = JSON.parse(jsonStr);
        
        // Add documentId to sources
        const sourcesWithIds = (parsed.sources || []).map((s: any) => {
          const doc = documents.find((d) => d.title === s.documentTitle);
          return {
            ...s,
            documentId: doc?.id || "",
          };
        });

        console.log(`[answerQuestion] TOTAL time: ${Date.now() - startTime}ms`);
        return {
          answer: parsed.answer,
          confidence: parsed.confidence || "medium",
          sources: sourcesWithIds,
          notFound: parsed.notFound || false,
        };
      } catch (error) {
        console.error("[answerQuestion] Parse error:", error, content);
        return { error: "Failed to parse answer" };
      }
    } catch (error: any) {
      const elapsed = Date.now() - startTime;
      console.error(`[answerQuestion] Error after ${elapsed}ms:`, error);
      
      // On timeout, return fallback with keyword matches
      if (error.name === 'TimeoutError' || error.name === 'AbortError' || elapsed > 10000) {
        console.log(`[answerQuestion] Timeout - returning error`);
        return { error: `Search timed out after ${Math.round(elapsed/1000)}s. Please try a more specific question.` };
      }
      
      return { error: error.message || "Failed to answer question" };
    }
}

// Server function wrapper
export const answerQuestion = createServerFn({ method: "POST" })
  .validator((d: { question: string; series?: MeetingSeries }) => d)
  .handler(async ({ data }) => {
    return searchAndAnswer(data.question, data.series);
  });

/**
 * Generate embedding for text using xAI
 * 
 * Cost: ~$0.0001 per 1000 tokens
 * Budget: $10/month = ~100,000 documents or 100M tokens
 * Cache: Store embeddings, only regenerate for changed docs
 */
async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  // TODO: Use xAI embeddings API
  // For now, this is a placeholder
  
  // Estimated cost per document:
  // - Average doc: 2000 tokens
  // - Embedding cost: $0.0001 per 1K tokens = $0.0002 per doc
  // - 50 docs/month at $10 = $0.20, leaving $9.80 for queries
  
  return new Array(1536).fill(0);
}

/**
 * Get indexing statistics
 */
export const getIndexStats = createServerFn({ method: "GET" }).handler(async () => {
  // TODO: Query storage for stats
  const stats: IndexStats = {
    totalDocuments: 0,
    bySeriesCount: {
      badlanders: 0,
      business_dev: 0,
      partner_marketing: 0,
      other: 0,
    },
    lastIndexedAt: null,
    oldestDocument: null,
    newestDocument: null,
  };

  return stats;
});
