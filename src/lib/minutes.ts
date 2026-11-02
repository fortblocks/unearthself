import { createServerFn } from "@tanstack/react-start";

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

const FOLDER_ID = "1xehL5chPhYNNqtXm5jTIu7bOVV77fpXL";
const MEET_RECORDINGS_FOLDER = "Meet Recordings";

function extractDateTimeFromTitle(title: string): { date: string; time: string } | null {
  // Title format: "Badlander's Development Meeting – Notes by Gemini"
  // We'll use the file's createdTime instead, but we need to parse the Gemini notes for meeting date/time
  return null;
}

function parseGeminiNotesForDateTime(text: string): { date: string; time: string } | null {
  // Look for patterns like "Meeting started at 10:30 AM on June 23, 2026"
  // or similar patterns in the Gemini notes
  const patterns = [
    /(?:started|held|occurred)\s+(?:at|on)\s+(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)\s+(?:on\s+)?(\w+\s+\d{1,2},?\s+\d{4})/i,
    /(\w+\s+\d{1,2},?\s+\d{4})\s+at\s+(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        // Parse the date and time
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
        // Continue to next pattern
      }
    }
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

export const listMeetings = createServerFn({ method: "GET" }).handler(async (): Promise<Meeting[]> => {
  const drive = await getGoogleDriveClient();
  if (!drive) {
    return [];
  }
  
  try {
    // Search for files with "Badlander's Development Meeting" in the title within the folder
    const response = await drive.files.list({
      q: `'${FOLDER_ID}' in parents and name contains 'Badlander' and mimeType='application/vnd.google-apps.document' and trashed=false`,
      fields: "files(id, name, createdTime, modifiedTime)",
      orderBy: "createdTime desc",
      pageSize: 100,
    });
    
    const files = response.data.files || [];
    const meetings: Meeting[] = [];
    
    for (const file of files) {
      if (!file.id || !file.name) continue;
      
      // Try to get the document text to parse meeting date/time
      try {
        const exportResponse = await drive.files.export({
          fileId: file.id,
          mimeType: "text/plain",
        }, { responseType: "text" });
        
        const text = String(exportResponse.data);
        const parsedDateTime = parseGeminiNotesForDateTime(text);
        
        // Fallback to file creation time if we can't parse from content
        const createdDate = new Date(file.createdTime || "");
        const fallbackDate = createdDate.toISOString().split("T")[0];
        const fallbackTime = createdDate.toLocaleTimeString("en-US", {
          timeZone: "America/Edmonton",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
        
        meetings.push({
          id: file.id,
          title: file.name,
          date: parsedDateTime?.date || fallbackDate,
          time: parsedDateTime?.time || fallbackTime,
          createdTime: file.createdTime || "",
          modifiedTime: file.modifiedTime || "",
        });
      } catch (error) {
        console.error(`Failed to export file ${file.id}:`, error);
        // Add with fallback times
        const createdDate = new Date(file.createdTime || "");
        meetings.push({
          id: file.id,
          title: file.name || "",
          date: createdDate.toISOString().split("T")[0],
          time: createdDate.toLocaleTimeString("en-US", {
            timeZone: "America/Edmonton",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }),
          createdTime: file.createdTime || "",
          modifiedTime: file.modifiedTime || "",
        });
      }
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
      const parsedDateTime = parseGeminiNotesForDateTime(fullText);
      
      const createdDate = new Date(file.createdTime || "");
      const fallbackDate = createdDate.toISOString().split("T")[0];
      const fallbackTime = createdDate.toLocaleTimeString("en-US", {
        timeZone: "America/Edmonton",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      
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
      if (error?.code === 403 || error?.code === 404) {
        return null;
      }
      return null;
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
          model: "grok-beta",
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
        console.error("xAI API error:", await response.text());
        return { error: "Failed to get answer from xAI" };
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
