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

function extractOwners(line: string): PartnerName[] {
  const cleanedLine = line.replace(/\[\s*[xX]?\s*\]/g, '').trim();
  
  const patterns = [
    /^[-•*]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?(?:\s*,\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)*)\s*[:–-]/,
    /^[-•*]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(will|should|needs? to|must|to)\s+/i,
  ];
  
  for (const pattern of patterns) {
    const match = cleanedLine.match(pattern);
    if (match) {
      const ownerText = match[1].trim();
      const nameParts = ownerText.split(/\s*,\s*/);
      const owners: PartnerName[] = [];
      
      for (const namePart of nameParts) {
        const firstName = namePart.trim().split(/\s+/)[0];
        const mappedName = firstName === "Chris" ? "Christopher" : firstName;
        
        if (PARTNER_NAMES.includes(mappedName as PartnerName)) {
          owners.push(mappedName as PartnerName);
        }
      }
      
      return owners;
    }
  }
  
  return [];
}

function extractActionsNoRewrite(fullText: string, meetingId: string, meetingTitle: string) {
  const actions: any[] = [];
  const lines = fullText.split("\n");
  const seenLineHashes = new Set<string>();
  
  let inActionSection = false;
  const actionSectionPattern = /^(suggested next steps?|action items?|next steps?|follow[- ]?ups?|tasks?)$/i;
  const otherSections = /^(discussion|transcript|agenda|attendees|participants|summary|notes|decisions?|open questions?)$/i;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    if (actionSectionPattern.test(trimmed)) {
      inActionSection = true;
      continue;
    }
    
    if (otherSections.test(trimmed) && inActionSection) {
      inActionSection = false;
      continue;
    }
    
    if (!inActionSection || trimmed.length < 10) continue;
    
    const looksLikeAction = /^[-•*\[\d]/.test(trimmed) || /\[\s*[xX]?\s*\]/.test(trimmed);
    if (!looksLikeAction) continue;
    
    const lineHash = hashString(trimmed);
    if (seenLineHashes.has(lineHash)) continue;
    seenLineHashes.add(lineHash);
    
    const owners = extractOwners(trimmed);
    if (owners.length === 0) continue;
    
    // Clean up the text (remove checkbox and owner prefix)
    const cleanText = trimmed
      .replace(/\[\s*[xX]?\s*\]/g, '')
      .replace(/^[-•*]?\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?(?:\s*,\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)*\s*[:–-]\s*/, '')
      .trim();
    
    for (const owner of owners) {
      actions.push({
        owner,
        text: cleanText.substring(0, 100),
        excerpt: trimmed.substring(0, 150),
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
