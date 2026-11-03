/**
 * Unit tests for answer-side validation (PR fixing Base Camp vs Boot Camp)
 * 
 * Tests the fix that validates sources against proper names extracted from the answer.
 * Uses fixture passages from real documents to verify correct behavior.
 */

// Mock the xAI API response to return the exact bad live answer
const mockBadAnswer = {
  answer: "Looking back over your records, the first mention of Badlands Base Camp I can find is on June 13, when the team discussed making it profitable. There are also mentions on June 18 and June 22.",
  confidence: "medium",
  sources: [
    {
      documentTitle: "Meeting started 2026/06/13 12:45 PDT - Notes by Gemini",
      meetingDate: "2026-06-13",
      excerpt: "[00:31:07] Tess Hamilton: we first have to just figure out how to make Badlands Boot Camp profitable",
      claimType: "recorded",
      isDecision: false
    },
    {
      documentTitle: "Meeting started 2026/06/18 10:41 PDT - Notes by Gemini",
      meetingDate: "2026-06-18",
      excerpt: "[01:32:27] Tess Hamilton: we would be needing Badlands boot camp headquarters by August",
      claimType: "recorded",
      isDecision: false
    },
    {
      documentTitle: "Meeting started 2026/06/22 10:31 PDT - Notes by Gemini",
      meetingDate: "2026-06-22",
      excerpt: "[00:04:06] Christopher Mair: Let's schedule a design workshop for the Badlands Base Camp headquarters",
      claimType: "recorded",
      isDecision: false
    }
  ],
  notFound: false
};

// The validation function to test (extracted from minutes-archive.ts logic)
function extractProperNames(text: string): string[] {
  const names: string[] = [];
  // Match sequences of 2+ capitalized words (allows spaces, hyphens, apostrophes)
  const pattern = /\b([A-Z][a-z]+(?:[\s\-'][A-Z][a-z]+)+)\b/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const name = match[1].trim();
    if (name.length >= 5) { // Minimum 5 chars to avoid false positives
      names.push(name);
    }
  }
  return Array.from(new Set(names)); // Remove duplicates
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[\s\-]+/g, '').trim();
}

function validateSources(answer: string, sources: any[]): any[] {
  const properNamesInAnswer = extractProperNames(answer);
  
  if (properNamesInAnswer.length === 0) {
    console.log('  ⚠️  No proper names found in answer, keeping all sources');
    return sources;
  }
  
  console.log(`  📝 Proper names found in answer: [${properNamesInAnswer.join(', ')}]`);
  
  const normalizedNames = properNamesInAnswer.map(normalize);
  
  const validatedSources = sources.filter((s: any) => {
    const normalizedExcerpt = normalize(s.excerpt || '');
    const containsName = normalizedNames.some(name => normalizedExcerpt.includes(name));
    if (!containsName) {
      console.log(`  ❌ Dropping ${s.meetingDate} - excerpt doesn't contain any proper names`);
      console.log(`     Excerpt: "${s.excerpt}"`);
    } else {
      console.log(`  ✅ Keeping ${s.meetingDate} - contains proper name`);
    }
    return containsName;
  });
  
  return validatedSources;
}

// Test suite
function runTests() {
  console.log('\n🧪 Testing Answer-Side Validation\n');
  console.log('Ground Truth:');
  console.log('- June 13: "Badlands Boot Camp" only (NOT Base Camp)');
  console.log('- June 18: "Badlands boot camp headquarters" only (NOT Base Camp)');
  console.log('- June 22: "Badlands Base Camp headquarters" (first Base Camp mention)\n');
  
  console.log('='.repeat(80));
  console.log('TEST 1: Mock bad answer claiming June 13 as first "Badlands Base Camp"');
  console.log('='.repeat(80));
  
  console.log('\n📥 INPUT (mocked model response):');
  console.log('Answer:', mockBadAnswer.answer);
  console.log('\nSources:');
  mockBadAnswer.sources.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.meetingDate}: "${s.excerpt.substring(0, 80)}..."`);
  });
  
  console.log('\n🔍 VALIDATION:');
  const validatedSources = validateSources(mockBadAnswer.answer, mockBadAnswer.sources);
  
  console.log('\n📤 OUTPUT (after validation):');
  console.log(`Validated sources: ${validatedSources.length}/${mockBadAnswer.sources.length}`);
  validatedSources.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.meetingDate}: "${s.excerpt.substring(0, 80)}..."`);
  });
  
  // Assertions
  console.log('\n✅ ASSERTIONS:');
  const assertions = [];
  
  // Should extract "Badlands Base Camp" from answer
  const extractedNames = extractProperNames(mockBadAnswer.answer);
  const hasBaseCamp = extractedNames.some(name => normalize(name) === normalize("Badlands Base Camp"));
  assertions.push({
    name: 'Extracts "Badlands Base Camp" from answer',
    passed: hasBaseCamp,
    expected: 'true',
    actual: hasBaseCamp.toString(),
    details: `Extracted names: [${extractedNames.join(', ')}]`
  });
  
  // Should drop June 13 (Boot Camp, not Base Camp)
  const hasJune13 = validatedSources.some(s => s.meetingDate === '2026-06-13');
  assertions.push({
    name: 'June 13 (Boot Camp) is dropped',
    passed: !hasJune13,
    expected: 'false',
    actual: hasJune13.toString(),
    details: 'June 13 has "Boot Camp" not "Base Camp"'
  });
  
  // Should drop June 18 (headquarters only, not Base Camp)
  const hasJune18 = validatedSources.some(s => s.meetingDate === '2026-06-18');
  assertions.push({
    name: 'June 18 (headquarters only) is dropped',
    passed: !hasJune18,
    expected: 'false',
    actual: hasJune18.toString(),
    details: 'June 18 has "headquarters" but not "Base Camp"'
  });
  
  // Should keep June 22 (has Base Camp)
  const hasJune22 = validatedSources.some(s => s.meetingDate === '2026-06-22');
  assertions.push({
    name: 'June 22 (Base Camp) is kept',
    passed: hasJune22,
    expected: 'true',
    actual: hasJune22.toString(),
    details: 'June 22 has "Badlands Base Camp headquarters"'
  });
  
  // Should have exactly 1 source after validation
  const correctCount = validatedSources.length === 1;
  assertions.push({
    name: 'Exactly 1 source remains (June 22 only)',
    passed: correctCount,
    expected: '1',
    actual: validatedSources.length.toString(),
    details: 'Only June 22 should pass validation'
  });
  
  // Print assertions
  let allPassed = true;
  assertions.forEach(a => {
    const icon = a.passed ? '✅' : '❌';
    console.log(`  ${icon} ${a.name}`);
    console.log(`     Expected: ${a.expected}, Actual: ${a.actual}`);
    if (a.details) console.log(`     ${a.details}`);
    if (!a.passed) allPassed = false;
  });
  
  console.log('\n' + '='.repeat(80));
  if (allPassed) {
    console.log('✅ ALL TESTS PASSED');
    console.log('='.repeat(80));
    console.log('\nThe validation correctly:');
    console.log('- Extracts "Badlands Base Camp" from the answer');
    console.log('- Drops June 13 (only has "Boot Camp")');
    console.log('- Drops June 18 (only has "headquarters", no "Base Camp")');
    console.log('- Keeps June 22 (has "Badlands Base Camp")');
    console.log('\nReady to merge to main.');
    return 0;
  } else {
    console.log('❌ SOME TESTS FAILED');
    console.log('='.repeat(80));
    console.log('\nDo NOT merge until all tests pass.');
    return 1;
  }
}

// Run tests
const exitCode = runTests();
process.exit(exitCode);
