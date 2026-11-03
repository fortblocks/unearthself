/**
 * Verification script for exact name matching fix (PR 43)
 * 
 * Tests that "Base Camp" is distinguished from "Boot Camp" and that
 * June 22 is correctly identified as the first mention of "Base Camp"
 * 
 * Prerequisites:
 * 1. Run from main branch with .env.local present
 * 2. Run: npx tsx test-name-matching.ts
 */

import { answerQuestion } from './src/lib/minutes-archive';

const EXPECTED_FIRST_DATE = '2026-06-22';
const WRONG_DATES = ['2026-06-13', '2026-06-18'];

interface TestCase {
  query: string;
  expectedName: string;
  expectedDate: string;
  wrongDates: string[];
}

const tests: TestCase[] = [
  {
    query: 'what was the name for the headquarters and when was it first agreed or discussed?',
    expectedName: 'Base Camp',
    expectedDate: EXPECTED_FIRST_DATE,
    wrongDates: WRONG_DATES,
  },
  {
    query: 'when was Basecamp first mentioned?',
    expectedName: 'Base Camp',
    expectedDate: EXPECTED_FIRST_DATE,
    wrongDates: WRONG_DATES,
  },
];

async function runTest(test: TestCase): Promise<boolean> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Query: "${test.query}"`);
  console.log('='.repeat(80));
  
  const result = await answerQuestion({ data: { question: test.query } });
  
  console.log('\n📝 ANSWER:');
  console.log(result.answer);
  
  console.log('\n📊 METADATA:');
  console.log(`Confidence: ${result.confidence}`);
  console.log(`Not Found: ${result.notFound || false}`);
  console.log(`Sources: ${result.sources.length}`);
  
  console.log('\n📚 SOURCES:');
  result.sources.forEach((s, i) => {
    console.log(`\n  ${i + 1}. ${s.documentTitle} (${s.meetingDate})`);
    console.log(`     Excerpt: ${s.excerpt.substring(0, 150)}...`);
  });
  
  // Validation
  const sourceDates = result.sources.map(s => s.meetingDate);
  const answerLower = result.answer.toLowerCase();
  
  let passed = true;
  const errors: string[] = [];
  
  // Check: answer mentions the expected name
  const normalizedExpected = test.expectedName.toLowerCase().replace(/[\s-]+/g, '');
  if (!answerLower.replace(/[\s-]+/g, '').includes(normalizedExpected)) {
    errors.push(`❌ Answer does not mention "${test.expectedName}"`);
    passed = false;
  }
  
  // Check: answer mentions or implies the expected date
  if (!answerLower.includes('june 22') && !answerLower.includes('6/22') && !answerLower.includes('22')) {
    errors.push(`❌ Answer does not mention June 22 as the first mention`);
    passed = false;
  }
  
  // Check: sources do NOT include wrong dates for this name
  const wrongCitations = test.wrongDates.filter(d => sourceDates.includes(d));
  if (wrongCitations.length > 0) {
    errors.push(`❌ Sources incorrectly cite ${wrongCitations.join(', ')} for "${test.expectedName}"`);
    passed = false;
  }
  
  // Check: sources DO include the expected date
  if (!sourceDates.includes(test.expectedDate)) {
    errors.push(`❌ Sources do not include ${test.expectedDate}`);
    passed = false;
  }
  
  console.log('\n✅ VALIDATION:');
  if (passed) {
    console.log('✅ PASSED - All checks passed');
  } else {
    console.log('❌ FAILED:');
    errors.forEach(e => console.log(`   ${e}`));
  }
  
  return passed;
}

async function main() {
  console.log('\n🧪 Testing Name Matching Fix (PR 43)\n');
  console.log('Expected behavior:');
  console.log('- "Base Camp" first mentioned: June 22, 2026');
  console.log('- June 13: "Boot Camp" only (NOT Base Camp)');
  console.log('- June 18: "headquarters" mention only (NOT Base Camp)');
  console.log('- Generic nouns must not count as specific proper names\n');
  
  const results = await Promise.all(tests.map(runTest));
  
  const allPassed = results.every(r => r);
  
  console.log('\n' + '='.repeat(80));
  if (allPassed) {
    console.log('✅ ALL TESTS PASSED');
    console.log('='.repeat(80));
    console.log('\nReady to merge to main.');
    process.exit(0);
  } else {
    console.log('❌ SOME TESTS FAILED');
    console.log('='.repeat(80));
    console.log('\nDo NOT merge until tests pass.');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('\n💥 Test execution failed:', error);
  process.exit(1);
});
