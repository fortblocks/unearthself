/**
 * DEV ONLY: Extract actions from live Drive docs without xAI rewriting
 * Usage: GOOGLE_SA_KEY='{"type":...}' npx tsx scripts/extract-live-actions-dev.ts
 */

import { createHash } from "crypto";

const PARTNER_NAMES = ["Lisa", "Tess", "Norah", "Christopher"] as const;
type PartnerName = (typeof PARTNER_NAMES)[number];

function hashString(text: string): string {
  return createHash("sha256").update(text).digest("hex").substring(0, 12);
}

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

function normalizeHeading(line: string): string {
  return line
    .replace(/^#+\s*/, '')  // Remove leading #
    .replace(/\*\*/g, '')   // Remove **
    .trim();
}

function extractActionsNoRewrite(fullText: string, meetingId: string, meetingTitle: string) {
  const actions: any[] = [];
  const lines = fullText.split("\n");
  const seenLineHashes = new Set<string>();
  
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
    
    // Exit action section on "Details" heading or any other heading
    if (inActionSection) {
      // Check if this is a heading (starts with # or looks like a heading)
      const isHeading = /^#+\s/.test(trimmed) || /^\*\*[^*]+\*\*$/.test(trimmed);
      if (isHeading) {
        inActionSection = false;
        continue;
      }
    }
    
    // Only process lines within action sections
    if (!inActionSection) continue;
    
    // Skip empty lines
    if (!trimmed) continue;
    
    // Normalize line: remove leading markers, backslashes, ** markers, and checkboxes
    const normalized = normalizeLine(trimmed);
    if (!normalized) continue;
    
    // Extract owners (requires bracket group)
    const owners = extractOwners(trimmed);
    if (owners.length === 0) continue;
    
    // Dedupe per doc by normalized line
    const lineHash = hashString(normalized);
    if (seenLineHashes.has(lineHash)) continue;
    seenLineHashes.add(lineHash);
    
    // Extract title (text before first colon, braces stripped)
    const title = extractTitle(trimmed);
    
    for (const owner of owners) {
      actions.push({
        owner,
        text: title,
        excerpt: title,
        meetingId,
        meetingTitle: meetingTitle.substring(0, 60),
      });
    }
  }
  
  return actions;
}

async function main() {
  console.log("DEV: Extracting actions from live Drive (no xAI rewriting)\n");
  
  // Check for GOOGLE_SA_KEY
  if (!process.env.GOOGLE_SA_KEY) {
    console.error("❌ GOOGLE_SA_KEY environment variable not set");
    console.error("Usage: GOOGLE_SA_KEY='{\"type\":...}' npx tsx scripts/extract-live-actions-dev.ts");
    process.exit(1);
  }
  
  try {
    const { google } = await import("googleapis");
    const key = JSON.parse(process.env.GOOGLE_SA_KEY);
    
    const auth = new google.auth.GoogleAuth({
      credentials: key,
      scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    });
    
    const drive = google.drive({ version: "v3", auth });
    const PARENT_FOLDER_ID = "1C5aG-ilfEtzjJowXEFZCzyNLE4OulL54";
    
    console.log("Fetching meetings from Drive...");
    
    // Get all docs from folder
    const response = await drive.files.list({
      q: `'${PARENT_FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.document' and trashed=false`,
      fields: "files(id, name)",
      pageSize: 100,
    });
    
    const files = response.data.files || [];
    console.log(`Found ${files.length} documents\n`);
    
    const allActions: any[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.id || !file.name) continue;
      
      try {
        console.log(`Processing ${i + 1}/${files.length}: ${file.name.substring(0, 50)}...`);
        
        const exportResponse = await drive.files.export({
          fileId: file.id,
          mimeType: "text/plain",
        }, { responseType: "text" });
        
        const fullText = String(exportResponse.data);
        const actions = extractActionsNoRewrite(fullText, file.id, file.name);
        
        if (actions.length > 0) {
          console.log(`  → Found ${actions.length} actions`);
          allActions.push(...actions);
        }
      } catch (error) {
        console.error(`  ✗ Error: ${error instanceof Error ? error.message : error}`);
      }
    }
    
    console.log(`\n${"=".repeat(80)}\n`);
    console.log(`✅ Extracted ${allActions.length} total actions\n`);
    
    // Group by owner
    const byOwner: Record<string, any[]> = {
      Lisa: [],
      Tess: [],
      Norah: [],
      Christopher: [],
    };
    
    for (const action of allActions) {
      byOwner[action.owner].push(action);
    }
    
    // Print each partner's actions
    for (const [owner, actions] of Object.entries(byOwner)) {
      console.log(`\n${owner.toUpperCase()} (${actions.length} actions)`);
      console.log("-".repeat(80));
      
      if (actions.length === 0) {
        console.log("  (no actions)");
        continue;
      }
      
      for (const action of actions) {
        console.log(`\n  ✓ ${action.text}`);
        console.log(`    Source: ${action.excerpt}`);
      }
    }
    
    console.log(`\n${"=".repeat(80)}`);
    console.log(`\nSummary: ${allActions.length} total actions`);
    console.log(`  Lisa: ${byOwner.Lisa.length}`);
    console.log(`  Tess: ${byOwner.Tess.length}`);
    console.log(`  Norah: ${byOwner.Norah.length}`);
    console.log(`  Christopher: ${byOwner.Christopher.length}`);
    
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

main();
