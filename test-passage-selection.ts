/**
 * Test passage selection logic offline
 * Simulates the fixed passage budget and ranking
 */

// Simulated Jun 22 content (from earlier fetch)
const jun22Content = `
Jun 22, 2026

Badlander's Development Meeting

Christopher Mair identified the broad project umbrellas as Badlands Boot Camp and Badlands Base Camp. 
While other potential avenues like health tourism and an incubator are on the future roadmap, the group 
reached a consensus to maintain a primary focus on developing and launching the propositions for Boot Camp 
and Base Camp, reviewing additional concepts on a quarterly basis.

Christopher Mair suggested moving away from individual creative tasks in favor of a team-based design approach. 
Using mood boards and digital imagery to visualize the building's interior and exterior, they agreed to conduct 
a design workshop to establish a cohesive "vibe" for the Badlands Base Camp headquarters.

The Badlands Base Camp is like in its own right is a work stream its own P&L. Um, it fits within the same 
branding umbrella as Badlands Boot Camp as whether or not we're going to call that Badlands Base Camp or just 
Base Camp or whatever.

Norah suggested that they need to have a clear understanding of what services Base Camp will offer and how 
those fit into the retreat packages that Boot Camp provides.

Lisa discussed the importance of creating a distinct identity for Base Camp while maintaining brand consistency 
with Boot Camp.

The team agreed that Base Camp would rent space at specified rates per room to streamline the process.

Base Camp provides wellness services for retreats and retains the revenue, while paying a commission to Boot Camp.

The name "Badlands Base Camp" or "Base Camp" has been used throughout the discussion as the wellness/spa 
entity that complements the Boot Camp retreat offerings.
`.repeat(5); // Simulate a longer document

// Simulated Jun 4 content
const jun4Content = `
Jun 4, 2026

Meeting started

Discussion about building renovations and timeline.

The team discussed painting options for the walls.

Budget considerations were reviewed.

No mentions of Base Camp or headquarters naming in this meeting.

Focus was on physical space improvements and scheduling.
`.repeat(20); // Simulate it being 40KB

function extractRelevantPassages(text: string, query: string, maxPassages: number = 3, contextChars: number = 1000): string {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const stopWords = new Set(['what', 'was', 'is', 'the', 'a', 'an', 'for', 'to', 'of', 'in', 'on', 'at', 'from', 'with', 'about']);
  const queryWords = lowerQuery.split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));
  
  if (queryWords.length === 0) {
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
    return text.slice(0, contextChars * 2);
  }
  
  // Sort by position and merge overlapping regions
  passages.sort((a, b) => a.start - b.start);
  
  const MAX_PASSAGE_SIZE = 8000;
  const merged: Array<{ start: number; end: number }> = [];
  
  for (const p of passages) {
    const start = Math.max(0, p.start - contextChars);
    const end = Math.min(text.length, p.start + contextChars);
    
    if (merged.length === 0 || start > merged[merged.length - 1].end) {
      merged.push({ start, end });
    } else {
      const newEnd = Math.max(merged[merged.length - 1].end, end);
      const mergedSize = newEnd - merged[merged.length - 1].start;
      
      if (mergedSize <= MAX_PASSAGE_SIZE) {
        merged[merged.length - 1].end = newEnd;
      } else {
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
  
  // Sort by score (most distinct query terms first)
  rankedPassages.sort((a, b) => b.score - a.score);
  
  return rankedPassages
    .slice(0, maxPassages)
    .map(({ start, end }) => text.slice(start, end))
    .join('\n\n[...]\n\n');
}

// Simulate the fixed passage selection logic
const query = "what was the agreed name for the headquarters and when was it first agreed or discussed?";
const MAX_CONTEXT_CHARS = 150000;
const decisionsLength = 80000;
const remainingChars = MAX_CONTEXT_CHARS - decisionsLength - 100;

const docs = [
  { id: 'jun4', title: 'Jun 4 Meeting', date: '2026-06-04', fullText: jun4Content },
  { id: 'jun22', title: 'Jun 22 Meeting', date: '2026-06-22', fullText: jun22Content },
];

console.log('=== Testing Fixed Passage Selection ===\n');
console.log(`Query: "${query}"`);
console.log(`\nRemaining chars for passages: ${remainingChars}`);
console.log(`Number of docs: ${docs.length}`);

const MIN_CHARS_PER_DOC = 4000;
const budgetPerDoc = Math.max(MIN_CHARS_PER_DOC, Math.floor(remainingChars / docs.length));
console.log(`Budget per doc: ${budgetPerDoc}\n`);

let passagesText = '';
let passagesAdded = 0;
let passagesSkipped = 0;

for (const d of docs) {
  const passages = extractRelevantPassages(d.fullText, query, 5, budgetPerDoc);
  const entry = `[MEETING: ${d.title} on ${d.date}]\n${passages}\n===\n`;
  
  console.log(`Doc ${passagesAdded + passagesSkipped + 1}: ${d.id}`);
  console.log(`  fullText: ${d.fullText.length} chars`);
  console.log(`  passages: ${passages.length} chars`);
  console.log(`  entry: ${entry.length} chars`);
  
  if (passagesText.length + entry.length > remainingChars) {
    console.log(`  → SKIPPED (would exceed limit)\n`);
    passagesSkipped++;
    continue;
  }
  
  console.log(`  → ADDED\n`);
  passagesText += entry;
  passagesAdded++;
}

console.log(`\n=== Results ===`);
console.log(`Passages added: ${passagesAdded}`);
console.log(`Passages skipped: ${passagesSkipped}`);
console.log(`Total passage text: ${passagesText.length} chars\n`);

console.log(`=== Jun 22 Passages (showing Base Camp mentions) ===\n`);
const jun22Passages = passagesText.match(/\[MEETING: Jun 22.*?\n(.*?)\n===/s);
if (jun22Passages) {
  console.log(jun22Passages[1].slice(0, 1500) + '...\n');
  
  const baseCampCount = (jun22Passages[1].match(/base camp/gi) || []).length;
  console.log(`✅ Jun 22 passages included with ${baseCampCount} "Base Camp" mentions`);
} else {
  console.log('❌ Jun 22 passages NOT found');
}
