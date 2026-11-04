/**
 * Unit tests for date and name formatting
 * 
 * Tests ordinal date conversion (1st, 2nd, 3rd, 4th, 11th-13th, 21st-23rd, 31st)
 * and partner name shortening (full name → first name)
 */

import { formatDateOrdinal, shortenPartnerNames } from './src/lib/minutes-archive';

function runTests() {
  console.log('\n🧪 Testing Date and Name Formatting\n');
  
  let allPassed = true;
  const assertions: Array<{name: string; passed: boolean; expected: string; actual: string}> = [];
  
  console.log('='.repeat(80));
  console.log('TEST 1: Ordinal Date Formatting');
  console.log('='.repeat(80) + '\n');
  
  // Test ordinal suffixes
  const dateTests = [
    { input: '2026-10-01', expected: '1st October', desc: '1st' },
    { input: '2026-10-02', expected: '2nd October', desc: '2nd' },
    { input: '2026-10-03', expected: '3rd October', desc: '3rd' },
    { input: '2026-10-04', expected: '4th October', desc: '4th' },
    { input: '2026-10-09', expected: '9th October', desc: '9th' },
    { input: '2026-10-11', expected: '11th October', desc: '11th (special)' },
    { input: '2026-10-12', expected: '12th October', desc: '12th (special)' },
    { input: '2026-10-13', expected: '13th October', desc: '13th (special)' },
    { input: '2026-10-21', expected: '21st October', desc: '21st' },
    { input: '2026-10-22', expected: '22nd October', desc: '22nd' },
    { input: '2026-10-23', expected: '23rd October', desc: '23rd' },
    { input: '2026-10-31', expected: '31st October', desc: '31st' },
    { input: '2026-06-22', expected: '22nd June', desc: 'June 22nd' },
    { input: '2025-03-15', expected: '15th March 2025', desc: 'With year (not 2026)' },
  ];
  
  dateTests.forEach(test => {
    const actual = formatDateOrdinal(test.input);
    const passed = actual === test.expected;
    assertions.push({
      name: `${test.desc}: ${test.input}`,
      passed,
      expected: test.expected,
      actual
    });
  });
  
  console.log('='.repeat(80));
  console.log('TEST 2: ISO Date Conversion in Text');
  console.log('='.repeat(80) + '\n');
  
  const textTests = [
    {
      input: 'The meeting on 2026-10-09 discussed the plan.',
      expected: 'The meeting on 9th October discussed the plan.',
      desc: 'Mid-sentence ISO date'
    },
    {
      input: 'From 2026-06-22 to 2026-06-30, the team worked on it.',
      expected: 'From 22nd June to 30th June, the team worked on it.',
      desc: 'Multiple ISO dates'
    },
  ];
  
  textTests.forEach(test => {
    const actual = test.input.replace(/\b(\d{4}-\d{2}-\d{2})\b/g, (match) => formatDateOrdinal(match));
    const passed = actual === test.expected;
    assertions.push({
      name: test.desc,
      passed,
      expected: test.expected,
      actual
    });
  });
  
  console.log('='.repeat(80));
  console.log('TEST 3: Name Shortening');
  console.log('='.repeat(80) + '\n');
  
  const nameTests = [
    {
      input: 'Lisa Hamilton manages the team.',
      expected: 'Lisa manages the team.',
      desc: 'Lisa Hamilton → Lisa'
    },
    {
      input: 'Christopher Mair described the plan.',
      expected: 'Christopher described the plan.',
      desc: 'Christopher Mair → Christopher'
    },
    {
      input: 'Tess Hamilton and Norah Wilson discussed it.',
      expected: 'Tess and Norah discussed it.',
      desc: 'Multiple full names'
    },
    {
      input: 'Lisa and Christopher agreed.',
      expected: 'Lisa and Christopher agreed.',
      desc: 'First names unchanged'
    },
    {
      input: '[00:15:32] Christopher Mair: Lisa Hamilton will lead the design initiatives',
      expected: '[00:15:32] Christopher: Lisa will lead the design initiatives',
      desc: 'Transcript with speaker labels'
    },
  ];
  
  nameTests.forEach(test => {
    const actual = shortenPartnerNames(test.input);
    const passed = actual === test.expected;
    assertions.push({
      name: test.desc,
      passed,
      expected: test.expected,
      actual
    });
  });
  
  console.log('='.repeat(80));
  console.log('TEST 4: Combined Processing');
  console.log('='.repeat(80) + '\n');
  
  const combinedTests = [
    {
      input: 'On 2026-06-22, Christopher Mair and Lisa Hamilton discussed Base Camp.',
      expected: 'On 22nd June, Christopher and Lisa discussed Base Camp.',
      desc: 'Date + names together'
    },
  ];
  
  combinedTests.forEach(test => {
    let processed = test.input.replace(/\b(\d{4}-\d{2}-\d{2})\b/g, (match) => formatDateOrdinal(match));
    processed = shortenPartnerNames(processed);
    const passed = processed === test.expected;
    assertions.push({
      name: test.desc,
      passed,
      expected: test.expected,
      actual: processed
    });
  });
  
  // Print all results
  console.log('📋 All Test Results:\n');
  assertions.forEach(a => {
    const icon = a.passed ? '✅' : '❌';
    console.log(`${icon} ${a.name}`);
    if (!a.passed) {
      console.log(`   Expected: ${a.expected}`);
      console.log(`   Actual:   ${a.actual}`);
    }
    if (!a.passed) allPassed = false;
  });
  
  console.log('\n' + '='.repeat(80));
  if (allPassed) {
    console.log('✅ ALL TESTS PASSED');
    console.log('='.repeat(80));
    console.log('\nFormatting works correctly:');
    console.log('- Ordinal dates: 1st, 2nd, 3rd, 4th, 11th-13th, 21st-23rd, 31st');
    console.log('- ISO dates converted: YYYY-MM-DD → "9th October"');
    console.log('- Names shortened: "Lisa Hamilton" → "Lisa"');
    console.log('- Combined processing preserves meaning');
    return 0;
  } else {
    console.log('❌ SOME TESTS FAILED');
    console.log('='.repeat(80));
    return 1;
  }
}

const exitCode = runTests();
process.exit(exitCode);
