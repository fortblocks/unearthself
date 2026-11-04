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

// Mock answer for Lisa's roles (no multi-word proper names)
const mockLisaAnswer = {
  answer: "Looking back over your records, Lisa manages the design team and oversees client relationships. She's responsible for project timelines and team coordination.",
  confidence: "medium",
  sources: [
    {
      documentTitle: "Meeting started 2026/10/27 12:18 PDT - Notes by Gemini",
      meetingDate: "2026-10-27",
      excerpt: "[00:15:32] Christopher Mair: Lisa Hamilton will lead the design initiatives going forward",
      claimType: "recorded",
      isDecision: false
    },
    {
      documentTitle: "Meeting started 2026/08/26 11:43 PDT - Notes by Gemini",
      meetingDate: "2026-08-26",
      excerpt: "[00:22:15] Tess Hamilton: Lisa has been managing client relationships very effectively",
      claimType: "recorded",
      isDecision: false
    }
  ],
  notFound: false
};

// Test suite
function runTests() {
  console.log('\n🧪 Testing Answer-Side Validation\n');
  console.log('Test Cases:');
  console.log('1. Multi-word proper name (Base Camp vs Boot Camp)');
  console.log('2. Possessive name with no multi-word proper names (Lisa\'s roles)\n');
  
  let allTestsPassed = true;
  
  console.log('='.repeat(80));
  console.log('TEST 1: Base Camp proper name validation');
  console.log('='.repeat(80));
  console.log('\nGround Truth:');
  console.log('- June 13: "Badlands Boot Camp" only (NOT Base Camp)');
  console.log('- June 18: "Badlands boot camp headquarters" only (NOT Base Camp)');
  console.log('- June 22: "Badlands Base Camp headquarters" (first Base Camp mention)\n');
  
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
  
  // Test 1 results
  if (!allPassed) allTestsPassed = false;
  
  // TEST 2: Lisa's roles (possessive, no multi-word proper names)
  console.log('\n' + '='.repeat(80));
  console.log('TEST 2: Possessive name with no multi-word proper names');
  console.log('='.repeat(80));
  
  console.log('\n📥 INPUT (mocked model response):');
  console.log('Answer:', mockLisaAnswer.answer);
  console.log('\nSources:');
  mockLisaAnswer.sources.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.meetingDate}: "${s.excerpt.substring(0, 80)}..."`);
  });
  
  console.log('\n🔍 VALIDATION:');
  const lisaValidatedSources = validateSources(mockLisaAnswer.answer, mockLisaAnswer.sources);
  
  console.log('\n📤 OUTPUT (after validation):');
  console.log(`Validated sources: ${lisaValidatedSources.length}/${mockLisaAnswer.sources.length}`);
  lisaValidatedSources.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.meetingDate}: "${s.excerpt.substring(0, 80)}..."`);
  });
  
  // Assertions for Test 2
  console.log('\n✅ ASSERTIONS:');
  const lisaAssertions = [];
  
  // Should NOT extract multi-word proper names (just "Lisa" which is one word)
  const lisaExtractedNames = extractProperNames(mockLisaAnswer.answer);
  const hasNoMultiWord = lisaExtractedNames.length === 0;
  lisaAssertions.push({
    name: 'No multi-word proper names extracted from Lisa answer',
    passed: hasNoMultiWord,
    expected: '0',
    actual: lisaExtractedNames.length.toString(),
    details: `Extracted names: [${lisaExtractedNames.join(', ')}]`
  });
  
  // Should keep all sources (validation skipped when no proper names)
  const allSourcesKept = lisaValidatedSources.length === mockLisaAnswer.sources.length;
  lisaAssertions.push({
    name: 'All sources kept (validation skipped)',
    passed: allSourcesKept,
    expected: mockLisaAnswer.sources.length.toString(),
    actual: lisaValidatedSources.length.toString(),
    details: 'When no multi-word proper names, validation is skipped'
  });
  
  // Print assertions
  let test2Passed = true;
  lisaAssertions.forEach(a => {
    const icon = a.passed ? '✅' : '❌';
    console.log(`  ${icon} ${a.name}`);
    console.log(`     Expected: ${a.expected}, Actual: ${a.actual}`);
    if (a.details) console.log(`     ${a.details}`);
    if (!a.passed) test2Passed = false;
  });
  
  if (!test2Passed) allTestsPassed = false;
  
  // Final summary
  console.log('\n' + '='.repeat(80));
  if (allTestsPassed) {
    console.log('✅ ALL TESTS PASSED');
    console.log('='.repeat(80));
    console.log('\nTest 1 (Base Camp): Validation correctly drops wrong proper names');
    console.log('Test 2 (Lisa\'s roles): Validation skipped when no multi-word proper names');
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
