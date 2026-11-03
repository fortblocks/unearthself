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
  
  // Cap each passage at 8000 chars to prevent returning entire documents
  const MAX_PASSAGE_SIZE = 8000;
  
  const merged: Array<{ start: number; end: number }> = [];
  for (const p of passages) {
    const start = Math.max(0, p.start - contextChars);
    const end = Math.min(text.length, p.start + contextChars);
    
    if (merged.length === 0 || start > merged[merged.length - 1].end) {
      merged.push({ start, end });
    } else {
      // Merge with previous, but cap the size
      const newEnd = Math.max(merged[merged.length - 1].end, end);
      const mergedSize = newEnd - merged[merged.length - 1].start;
      
      if (mergedSize <= MAX_PASSAGE_SIZE) {
        merged[merged.length - 1].end = newEnd;
      } else {
        // Start a new passage instead of creating a giant merged one
        merged.push({ start, end });
      }
    }
  }
  
  // Rank passages by number of distinct query terms they contain
  const rankedPassages = merged.map(({ start, end }) => {
    const passageText = text.slice(start, end).toLowerCase();
    const distinctTerms = new Set(
      queryWords.filter(word => passageText.includes(word))
    );
    return { start, end, score: distinctTerms.size };
  });
  
  // Sort by score (most distinct query terms first), then take top N
  rankedPassages.sort((a, b) => b.score - a.score);
  
  return rankedPassages
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
      
      // Collect all folder IDs that listMeetings walks for Drive query scoping
      const PARENT_FOLDER_ID = "1C5aG-ilfEtzjJowXEFZCzyNLE4OulL54";
      const meetingFolderIds = new Set<string>([PARENT_FOLDER_ID]);
      
      async function collectFolderIds(folderId: string, depth: number, maxDepth: number): Promise<void> {
        if (depth > maxDepth) return;
        try {
          let pageToken: string | undefined;
          do {
            const response = await drive.files.list({
              q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
              fields: "nextPageToken, files(id)",
              pageSize: 100,
              pageToken,
            });
            const folders = response.data.files || [];
            for (const folder of folders) {
              if (folder.id) {
                meetingFolderIds.add(folder.id);
                await collectFolderIds(folder.id, depth + 1, maxDepth);
              }
            }
            pageToken = response.data.nextPageToken || undefined;
          } while (pageToken);
        } catch (error: any) {
          console.error(`Error collecting folders from ${folderId}:`, error.message);
        }
      }
      
      await collectFolderIds(PARENT_FOLDER_ID, 0, 3);
      console.log(`[answerQuestion] Collected ${meetingFolderIds.size} folder IDs for Drive scoping`);
      
      // Build Drive search with stop word filtering
      const searchStart = Date.now();
      const stopWords = new Set(['what', 'when', 'where', 'who', 'how', 'why', 'was', 'were', 'is', 'are', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'about', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'all', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'can', 'will', 'just', 'should', 'now']);
      
      const queryWords = question.toLowerCase()
        .split(/\s+/)
        .filter(w => w.length >= 3 && !stopWords.has(w));
      
      let candidateIds: Set<string>;
      
      if (queryWords.length > 0) {
        // Build folder scoping part of query
        const folderScope = Array.from(meetingFolderIds).map(id => `'${id}' in parents`).join(' or ');
        
        // Build fullText search with generic spacing variants
        const searchTerms: string[] = [];
        queryWords.forEach(word => {
          searchTerms.push(`fullText contains '${word}'`);
          // Add spacing variant if word contains common separators
          if (word.includes('-') || word.includes('_')) {
            const spaced = word.replace(/[-_]/g, ' ');
            searchTerms.push(`fullText contains '${spaced}'`);
          }
        });
        
        const searchQuery = `mimeType='application/vnd.google-apps.document' and trashed=false and (${folderScope}) and (${searchTerms.join(' or ')})`;
        
        // Page through all results
        const driveResults: any[] = [];
        let pageToken: string | undefined;
        do {
          const searchResponse = await drive.files.list({
            q: searchQuery,
            fields: "nextPageToken, files(id)",
            pageSize: 100,
            pageToken,
          });
          driveResults.push(...(searchResponse.data.files || []));
          pageToken = searchResponse.data.nextPageToken || undefined;
        } while (pageToken);
        
        console.log(`[answerQuestion] Drive full-text search: ${Date.now() - searchStart}ms (${driveResults.length} raw results from ${meetingFolderIds.size} folders)`);
        
        candidateIds = new Set(driveResults.map(f => f.id).filter(id => id && allDocIds.has(id)) as string[]);
        console.log(`[answerQuestion] Filtered to ${candidateIds.size} candidates in our doc set`);
        
        if (candidateIds.size === 0) {
          console.log(`[answerQuestion] Drive returned 0 results, falling back to all meetings`);
          candidateIds = allDocIds;
        }
      } else {
        candidateIds = allDocIds;
      }
      
      // Get candidates
      const matchedMeetings = allMeetings.filter(m => candidateIds.has(m.id));
      console.log(`[answerQuestion] ${matchedMeetings.length} matched meetings from Drive search`);
      
      // Detect if query is about "first" mentions OR name/decision - prioritize oldest meetings
      const isTemporalQuery = /\b(first|earliest|initial|originally|when.*first|when.*start|beginning)\b/i.test(question);
      const isNameDecisionQuery = /\b(name|named|call|called|naming|decided|decision|agreed|agreement)\b/i.test(question);
      const sortByDateAscending = isTemporalQuery || isNameDecisionQuery;
      
      let selectedMeetings = matchedMeetings;
      if (sortByDateAscending) {
        // For temporal or name/decision queries, sort by date ascending to prioritize oldest
        selectedMeetings.sort((a, b) => a.date.localeCompare(b.date));
        console.log(`[answerQuestion] ${isTemporalQuery ? 'Temporal' : 'Name/decision'} query detected, sorted by date ascending`);
      }
      
      // Take top 20 candidates (increased to catch older meetings)
      const files = selectedMeetings.slice(0, 20).map(m => ({
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

      // Sort docs - by date for temporal queries, by relevance otherwise
      let sortedDocs = documents;
      if (isTemporalQuery) {
        // For "first" queries, sort by date ascending
        sortedDocs.sort((a, b) => a.date.localeCompare(b.date));
        console.log(`[answerQuestion] Sorted ${sortedDocs.length} docs by date ascending for temporal query`);
        console.log(`[answerQuestion] Date range: ${sortedDocs[0]?.date} to ${sortedDocs[sortedDocs.length - 1]?.date}`);
      } else {
        // Sort by relevance score
        sortedDocs.sort((a, b) => (b.score || 0) - (a.score || 0));
        console.log(`[answerQuestion] Top ${sortedDocs.length} scores: ${sortedDocs.map(d => (d.score || 0).toFixed(1)).join(', ')}`);
      }
      console.log(`[answerQuestion] Top docs: ${sortedDocs.map(d => `${d.title} (${d.id.slice(0,8)}...)`).join(', ')}`);
      
      // DEBUG: Check if Aug 20 doc is in results
      const aug20Doc = documents.find(d => d.id === '14UIO9kglaCR2JX3h1VNByD416SWVP8A-sNmCDXTguxQ');
      if (aug20Doc) {
        console.log(`[answerQuestion] Aug 20 doc found in results at position ${documents.indexOf(aug20Doc) + 1}/${documents.length}, score: ${aug20Doc.score}, date: ${aug20Doc.date}`);
      } else {
        console.log(`[answerQuestion] Aug 20 doc NOT in exported docs`);
      }

      // Build context with decisions and relevant passages, cap at 150KB
      const MAX_CONTEXT_CHARS = 150000;
      
      // Build decisions text, cap at 80KB to leave room for passages
      const MAX_DECISIONS_CHARS = 80000;
      let decisionsText = sortedDocs
        .flatMap((d) =>
          d.decisions.map(
            (dec) =>
              `[DECISION from ${d.title} on ${d.date}]\n${dec.decisionText}\nContext: ${dec.context}\n`
          )
        )
        .join("\n\n");
      
      if (decisionsText.length > MAX_DECISIONS_CHARS) {
        decisionsText = decisionsText.slice(0, MAX_DECISIONS_CHARS) + "\n...[truncated]";
      }

      // Calculate fair budget per document (minimum 4KB per doc)
      const remainingChars = MAX_CONTEXT_CHARS - decisionsText.length - 100; // 100 char buffer
      const MIN_CHARS_PER_DOC = 4000;
      const budgetPerDoc = Math.max(MIN_CHARS_PER_DOC, Math.floor(remainingChars / sortedDocs.length));
      
      console.log(`[answerQuestion] Building passages: remainingChars=${remainingChars}, sortedDocs=${sortedDocs.length}, budgetPerDoc=${budgetPerDoc}`);
      
      // Extract query terms for passage ranking
      const queryTerms = question.toLowerCase()
        .split(/\s+/)
        .filter(w => w.length >= 3 && !stopWords.has(w));
      
      // Build passages text with fair budgeting - skip docs that won't fit instead of stopping
      let passagesText = '';
      let passagesAdded = 0;
      let passagesSkipped = 0;
      
      for (const d of sortedDocs) {
        // Extract best passages for this doc using budget
        const passages = extractRelevantPassages(d.fullText, question, 5, budgetPerDoc);
        const entry = `[MEETING: ${d.title} on ${d.date}]\n${passages}\n===\n`;
        
        console.log(`[answerQuestion] Doc ${passagesAdded + passagesSkipped + 1}/${sortedDocs.length}: fullText.length=${d.fullText?.length || 0}, passages.length=${passages.length}, entry.length=${entry.length}`);
        
        // Skip this doc if it won't fit, but continue trying others
        if (passagesText.length + entry.length > remainingChars) {
          console.log(`[answerQuestion] Skipping doc ${d.id.slice(0,8)} - would exceed limit`);
          passagesSkipped++;
          continue;
        }
        
        passagesText += entry;
        passagesAdded++;
      }

      console.log(`[answerQuestion] Added ${passagesAdded} passage entries (skipped ${passagesSkipped}), total length: ${passagesText.length}`);

      const fullContextText = decisionsText + '\n\n' + passagesText;
      console.log(`[answerQuestion] Context size: ${fullContextText.length} chars (decisions: ${decisionsText.length}, passages: ${passagesText.length})`);

      const prompt = `You are answering questions about Unearth Self meeting decisions and discussions.

PRIORITIZE DECISIONS AND ACTION ITEMS:
${decisionsText}

RELEVANT PASSAGES (Top ${sortedDocs.length} meetings):
${passagesText}

Question: ${question}

Instructions:
1. Write the answer in a CONVERSATIONAL tone, like talking on a call
2. Frame findings as coming from the records: "Looking back over your records...", "The first time I can hear of..."
3. State dates and names plainly with short sentences - NO bracketed labels like [RECORDED] or [INFERRED]
4. Distinguish recorded vs inferred in plain words:
   - For recorded facts: "Christopher Mair described..." or "the team agreed to..."
   - For inferred conclusions: "nobody formally voted on it, but it's been the name in use since..." 
   - For not found: "I don't see any record of..."
5. Use EXACT dates from meeting headers [MEETING: ... on YYYY-MM-DD]
6. Never invent prior conversations - search has no memory of earlier chats
7. Check alternative spellings (e.g., "Basecamp" vs "Base Camp")

Example answer shape:
"Looking back over your records, the first time I can hear of an official name for headquarters was on June 22, and the name I picked up was Base Camp. Christopher Mair described it as a workstream under Boot Camp. Nobody formally voted on it, but it's been the name in use since then."

Format as JSON:
{
  "answer": "Conversational answer with plain language, short sentences, dates and names stated directly",
  "confidence": "high" | "medium" | "low",
  "sources": [
    {
      "documentTitle": "Meeting Title",
      "meetingDate": "YYYY-MM-DD",
      "excerpt": "verbatim quote",
      "claimType": "recorded" | "inferred",
      "isDecision": true | false
    }
  ],
  "notFound": false
}

Only use notFound: true when absolutely NO related information exists:
{
  "answer": "I don't see any record of discussions about [topic] in your meeting notes.",
  "confidence": "low",
  "sources": [],
  "notFound": true
}

IMPORTANT: 
- Conversational tone throughout - sound like talking to someone on a call
- Short sentences, plain language, no technical formatting in the prose
- Recorded/inferred distinction in natural words, not brackets
- NEVER use "high" confidence with "notFound: true"
- NEVER cite sources that claim nothing exists - only cite actual mentions with verbatim excerpts`;

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
                "You answer questions about meeting records in a conversational tone, like talking to someone on a call. Frame findings as coming from the records. Use short sentences and plain language. Distinguish what was explicitly recorded from what you're inferring, but use natural words, not bracketed labels. Never invent prior conversations.",
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
        let errorDetail = `HTTP ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.error?.message) {
            errorDetail += `: ${errorJson.error.message}`;
          }
        } catch {
          // Ignore parse error
        }
        console.error("xAI error:", errorText);
        throw new Error(errorDetail);
      }

      const result = await response.json();
      const content = result.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error("No response from xAI");
      }

      let jsonStr = content;
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) jsonStr = jsonMatch[1];

      const parsed = JSON.parse(jsonStr);
      
      // Add documentId to sources and filter out invented sources
      const sourcesWithIds = (parsed.sources || [])
        .map((s: any) => {
          const doc = documents.find((d) => d.title === s.documentTitle);
          return {
            ...s,
            documentId: doc?.id || "",
          };
        })
        // Filter out sources without valid document IDs (invented by model)
        .filter((s: any) => s.documentId && s.documentId.length > 0);
      
      // Enforce: never allow HIGH confidence on "not found" answers
      let confidence = parsed.confidence || "medium";
      if ((parsed.notFound || sourcesWithIds.length === 0) && confidence === "high") {
        console.log(`[answerQuestion] Downgrading confidence from HIGH to LOW (notFound or no sources)`);
        confidence = "low";
      }

      console.log(`[answerQuestion] TOTAL time: ${Date.now() - startTime}ms`);
      return {
        answer: parsed.answer,
        confidence,
        sources: sourcesWithIds,
        notFound: parsed.notFound || false,
      };
    } catch (error: any) {
      // Fatal error in search - provide simple fallback
      const elapsed = Date.now() - startTime;
      console.error(`[answerQuestion] Fatal error after ${elapsed}ms:`, error.message);
      
      let fallbackAnswer: string;
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        fallbackAnswer = `Search timed out while analyzing meeting records. Please try a more specific question or check the matching meetings below.`;
      } else {
        fallbackAnswer = `Unable to analyze meeting records due to a technical issue. Please try rephrasing your question or review the matching meetings below.`;
      }
      
      console.log(`[answerQuestion] TOTAL time: ${elapsed}ms (fatal error)`);
      return {
        answer: fallbackAnswer,
        confidence: "low",
        sources: [],
        notFound: false,
      };
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
