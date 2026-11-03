import { createServerFn } from "@tanstack/react-start";
import { XAI_MODEL } from "./structured-minutes.ts";

export type Meeting = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM in America/Edmonton
  createdTime: string;
  modifiedTime: string;
};

export type MeetingAction = {
  text: string;
  owner: string | null;
  completed: boolean;
};

export type MeetingMinutes = {
  meeting: Meeting;
  fullText: string;
  actions: MeetingAction[];
};

export type AskResult = {
  answer: string;
  citations: Array<{
    meetingId: string;
    meetingDate: string;
    meetingTime: string;
    speaker: string | null;
    excerpt: string;
  }>;
};

// Parent "Google Meet" folder containing all meeting subfolders
const PARENT_FOLDER_ID = "1C5aG-ilfEtzjJowXEFZCzyNLE4OulL54";
const MAX_FOLDER_DEPTH = 3;

function extractDateTimeFromTitle(title: string): { date: string; time: string } | null {
  // Title format: "Badlander's Development Meeting – Notes by Gemini"
  // We'll use the file's createdTime instead, but we need to parse the Gemini notes for meeting date/time
  return null;
}

/**
 * Parse date/time from Gemini file name
 * Format: "Badlander's Development Meeting - 2026/10/29 17:00 MDT - Notes by Gemini"
 */
export function parseDateFromFilename(filename: string): { date: string; time: string } | null {
  // Pattern: YYYY/MM/DD HH:MM
  const pattern = /(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})/;
  const match = filename.match(pattern);
  
  if (match) {
    const [_, year, month, day, hour, minute] = match;
    return {
      date: `${year}-${month}-${day}`,
      time: `${hour}:${minute}`,
    };
  }
  
  return null;
}

function extractActionsFromGeminiNotes(text: string): MeetingAction[] {
  const actions: MeetingAction[] = [];
  const lines = text.split("\n");
  
  // Look for action items or next steps sections
  let inActionSection = false;
  const actionMarkers = /^[\s-*•]*(action|next step|todo|task|follow[- ]?up)s?[:\s-]/i;
  const ownerPattern = /\(([^)]+)\)$/;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Detect action section headers
    if (/^#{1,3}\s*(action|next step|todo|follow[- ]?up)/i.test(trimmed)) {
      inActionSection = true;
      continue;
    }
    
    // Exit action section if we hit another header
    if (/^#{1,3}\s/.test(trimmed) && inActionSection) {
      inActionSection = false;
      continue;
    }
    
    // Parse action items
    if (inActionSection && (trimmed.startsWith("-") || trimmed.startsWith("*") || trimmed.startsWith("•"))) {
      let actionText = trimmed.replace(/^[-*•]\s*/, "").trim();
      let owner: string | null = null;
      
      // Extract owner if present
      const ownerMatch = actionText.match(ownerPattern);
      if (ownerMatch) {
        owner = ownerMatch[1].trim();
        actionText = actionText.replace(ownerPattern, "").trim();
      }
      
      // Check for owner names in the text: Lisa, Tess, Norah, Christopher
      const names = ["Lisa", "Tess", "Norah", "Christopher"];
      for (const name of names) {
        const namePattern = new RegExp(`\\b${name}\\b`, "i");
        if (namePattern.test(actionText) && !owner) {
          owner = name;
        }
      }
      
      if (actionText) {
        actions.push({
          text: actionText,
          owner,
          completed: false,
        });
      }
    } else if (actionMarkers.test(trimmed)) {
      // Inline action item
      let actionText = trimmed.replace(actionMarkers, "").trim();
      let owner: string | null = null;
      
      const ownerMatch = actionText.match(ownerPattern);
      if (ownerMatch) {
        owner = ownerMatch[1].trim();
        actionText = actionText.replace(ownerPattern, "").trim();
      }
      
      if (actionText) {
        actions.push({
          text: actionText,
          owner,
          completed: false,
        });
      }
    }
  }
  
  return actions;
}

async function getGoogleDriveClient() {
  const keyJson = process.env.GOOGLE_SA_KEY;
  if (!keyJson) {
    return null;
  }
  
  try {
    const key = JSON.parse(keyJson);
    const { google } = await import("googleapis");
    
    const auth = new google.auth.GoogleAuth({
      credentials: key,
      scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    });
    
    const drive = google.drive({ version: "v3", auth });
    return drive;
  } catch (error) {
    console.error("Failed to initialize Google Drive client:", error);
    return null;
  }
}

/**
 * Recursively collect all Google Docs from a folder and its subfolders
 * @param drive Google Drive client
 * @param folderId Starting folder ID
 * @param depth Current recursion depth (0 = starting folder)
 * @param maxDepth Maximum recursion depth
 * @param seenFileIds Set of file IDs already collected (for deduplication)
 */
async function collectDocsRecursively(
  drive: any,
  folderId: string,
  depth: number,
  maxDepth: number,
  seenFileIds: Set<string>
): Promise<Array<{ id: string; name: string; createdTime: string; modifiedTime: string }>> {
  if (depth > maxDepth) {
    return [];
  }

  const results: Array<{ id: string; name: string; createdTime: string; modifiedTime: string }> = [];
  
  try {
    // First, collect all Google Docs in this folder
    let docsPageToken: string | undefined;
    do {
      const docsResponse = await drive.files.list({
        q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.document' and trashed=false`,
        fields: "nextPageToken, files(id, name, createdTime, modifiedTime)",
        pageSize: 100,
        pageToken: docsPageToken,
      });

      const docs = docsResponse.data.files || [];
      for (const doc of docs) {
        if (doc.id && doc.name && !seenFileIds.has(doc.id)) {
          seenFileIds.add(doc.id);
          results.push({
            id: doc.id,
            name: doc.name,
            createdTime: doc.createdTime || "",
            modifiedTime: doc.modifiedTime || "",
          });
        }
      }

      docsPageToken = docsResponse.data.nextPageToken || undefined;
    } while (docsPageToken);

    // Then, collect all subfolders and recurse
    const subfolders: string[] = [];
    let foldersPageToken: string | undefined;
    do {
      const foldersResponse = await drive.files.list({
        q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: "nextPageToken, files(id, name)",
        pageSize: 100,
        pageToken: foldersPageToken,
      });

      const folders = foldersResponse.data.files || [];
      for (const folder of folders) {
        if (folder.id) {
          subfolders.push(folder.id);
        }
      }

      foldersPageToken = foldersResponse.data.nextPageToken || undefined;
    } while (foldersPageToken);

    // Recurse into each subfolder
    for (const subfolderId of subfolders) {
      const subResults = await collectDocsRecursively(drive, subfolderId, depth + 1, maxDepth, seenFileIds);
      results.push(...subResults);
    }
  } catch (error: any) {
    console.error(`Error collecting docs from folder ${folderId} at depth ${depth}:`, error.message);
    // Continue with partial results rather than failing completely
  }

  return results;
}

export const listMeetings = createServerFn({ method: "GET" }).handler(async (): Promise<Meeting[]> => {
  const drive = await getGoogleDriveClient();
  if (!drive) {
    return [];
  }
  
  try {
    // Recursively collect all Google Docs from parent folder and subfolders
    const seenFileIds = new Set<string>();
    const files = await collectDocsRecursively(drive, PARENT_FOLDER_ID, 0, MAX_FOLDER_DEPTH, seenFileIds);
    
    console.log(`Collected ${files.length} unique meeting docs from recursive folder search`);
    
    const meetings: Meeting[] = [];
    
    for (const file of files) {
      if (!file.id || !file.name) continue;
      
      // Parse date from filename first (fast, no API call)
      const parsedDateTime = parseDateFromFilename(file.name);
      
      // Fallback to createdTime in America/Edmonton timezone
      let fallbackDate = "";
      let fallbackTime = "00:00";
      
      if (file.createdTime) {
        const createdDate = new Date(file.createdTime);
        fallbackDate = createdDate.toLocaleDateString("en-CA", {
          timeZone: "America/Edmonton",
        }); // YYYY-MM-DD format
        fallbackTime = createdDate.toLocaleTimeString("en-US", {
          timeZone: "America/Edmonton",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
      }
      
      // Log files that fail to parse (might indicate new naming format)
      if (!parsedDateTime && file.createdTime) {
        const createdDate = new Date(file.createdTime);
        if (createdDate >= new Date('2026-10-01')) {
          console.log(`Recent file with non-standard name: "${file.name}" (created ${file.createdTime})`);
        }
      }
      
      meetings.push({
        id: file.id,
        title: file.name,
        date: parsedDateTime?.date || fallbackDate,
        time: parsedDateTime?.time || fallbackTime,
        createdTime: file.createdTime || "",
        modifiedTime: file.modifiedTime || "",
      });
    }
    
    // Sort by date desc
    meetings.sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return b.time.localeCompare(a.time);
    });
    
    return meetings;
  } catch (error: any) {
    console.error("Error listing meetings:", error);
    // Return empty array for permission errors
    if (error?.code === 403 || error?.code === 404) {
      return [];
    }
    return [];
  }
});

export const getMeetingMinutes = createServerFn({ method: "GET" })
  .validator((d: { meetingId: string }) => d)
  .handler(async ({ data }): Promise<MeetingMinutes | null> => {
    const drive = await getGoogleDriveClient();
    if (!drive) {
      return null;
    }
    
    try {
      // Get file metadata
      const metaResponse = await drive.files.get({
        fileId: data.meetingId,
        fields: "id, name, createdTime, modifiedTime",
      });
      
      const file = metaResponse.data;
      if (!file.id || !file.name) {
        return null;
      }
      
      // Export as plain text
      const exportResponse = await drive.files.export({
        fileId: data.meetingId,
        mimeType: "text/plain",
      }, { responseType: "text" });
      
      const fullText = String(exportResponse.data);
      
      // Parse date from filename first
      const parsedDateTime = parseDateFromFilename(file.name);
      
      // Fallback to createdTime in America/Edmonton timezone
      let fallbackDate = "";
      let fallbackTime = "00:00";
      
      if (file.createdTime) {
        const createdDate = new Date(file.createdTime);
        fallbackDate = createdDate.toLocaleDateString("en-CA", {
          timeZone: "America/Edmonton",
        }); // YYYY-MM-DD format
        fallbackTime = createdDate.toLocaleTimeString("en-US", {
          timeZone: "America/Edmonton",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
      }
      
      const meeting: Meeting = {
        id: file.id,
        title: file.name,
        date: parsedDateTime?.date || fallbackDate,
        time: parsedDateTime?.time || fallbackTime,
        createdTime: file.createdTime || "",
        modifiedTime: file.modifiedTime || "",
      };
      
      const actions = extractActionsFromGeminiNotes(fullText);
      
      return {
        meeting,
        fullText,
        actions,
      };
    } catch (error: any) {
      console.error("Error getting meeting minutes:", error);
      // Only return null for not-found errors
      if (error?.code === 404) {
        return null;
      }
      // For other errors, throw to show the real error message
      throw new Error(`Failed to get meeting minutes: ${error.message || error}`);
    }
  });

export const askMinutes = createServerFn({ method: "POST" })
  .validator((d: { question: string }) => d)
  .handler(async ({ data }): Promise<AskResult | { error: string }> => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return { error: "XAI_API_KEY not configured" };
    }
    
    const drive = await getGoogleDriveClient();
    if (!drive) {
      return { error: "Google Drive not configured" };
    }
    
    try {
      // First, get all meetings with their full text
      const meetings = await listMeetings();
      const meetingTexts = await Promise.all(
        meetings.map(async (meeting) => {
          try {
            const minutes = await getMeetingMinutes({ data: { meetingId: meeting.id } });
            return minutes ? { meeting, text: minutes.fullText } : null;
          } catch {
            return null;
          }
        })
      );
      
      const validMeetings = meetingTexts.filter((m): m is { meeting: Meeting; text: string } => m !== null);
      
      if (validMeetings.length === 0) {
        return {
          answer: "No meetings are available yet. Once Lisa shares the Meet Recordings folder, I'll be able to search through meeting notes.",
          citations: [],
        };
      }
      
      // Use xAI to answer the question with citations
      const prompt = `You are a meeting assistant helping answer questions about Badlander's Development Meetings. 

Here are all the meeting transcripts:

${validMeetings.map((m, idx) => `
=== MEETING ${idx + 1} ===
Date: ${m.meeting.date}
Time: ${m.meeting.time} (America/Edmonton)
ID: ${m.meeting.id}

${m.text}

===
`).join("\n")}

Question: ${data.question}

Instructions:
1. Search through ALL meetings for information related to the question
2. Answer ONLY based on what is explicitly stated in the meetings
3. If nothing in the meetings supports an answer, say "I found nothing in the meetings about this"
4. For each piece of information in your answer, provide:
   - The meeting date and time
   - The speaker's name if mentioned in the notes
   - A VERBATIM quote (never paraphrase when quoting)
   - The meeting ID

Format your response as JSON:
{
  "answer": "Your natural language answer here",
  "citations": [
    {
      "meetingId": "meeting ID",
      "meetingDate": "YYYY-MM-DD",
      "meetingTime": "HH:MM",
      "speaker": "Name or null",
      "excerpt": "Exact verbatim quote from the meeting"
    }
  ]
}

If you found nothing relevant, return:
{
  "answer": "I found nothing in the meetings about this.",
  "citations": []
}`;
      
      const response = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: XAI_MODEL,
          messages: [
            {
              role: "system",
              content: "You are a precise meeting assistant. Only answer based on what is explicitly stated. Never make up information. Always provide verbatim quotes for citations.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.1,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorDetail = `HTTP ${response.status}: Failed to get answer from xAI`;
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.error?.message) {
            errorDetail = `HTTP ${response.status}: ${errorJson.error.message}`;
          }
        } catch {
          errorDetail = `HTTP ${response.status}: ${errorText.substring(0, 200)}`;
        }
        console.error("xAI API error:", errorText);
        return { error: errorDetail };
      }
      
      const result = await response.json();
      const content = result.choices?.[0]?.message?.content;
      
      if (!content) {
        return { error: "No response from xAI" };
      }
      
      // Parse the JSON response
      try {
        // Extract JSON from markdown code blocks if present
        let jsonStr = content;
        const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
        if (jsonMatch) {
          jsonStr = jsonMatch[1];
        }
        
        const parsed = JSON.parse(jsonStr);
        return parsed as AskResult;
      } catch (error) {
        console.error("Failed to parse xAI response:", error, content);
        // Fallback: use the content as the answer
        return {
          answer: content,
          citations: [],
        };
      }
    } catch (error: any) {
      console.error("Error in askMinutes:", error);
      return { error: "Failed to process question" };
    }
  });
