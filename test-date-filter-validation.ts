/**
 * Validate date filtering with actual Oct 8/9 meetings
 */

import { extractExplicitActions } from './src/lib/action-tracking';
import { readFileSync } from 'fs';

async function testDateFilter() {
  console.log('DATE FILTER VALIDATION TEST\n');
  
  // Simulate Nov 5, 2026 (Chris's report date)
  const today = new Date('2026-11-05');
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0];
  
  console.log('Today: 2026-11-05');
  console.log('30-day cutoff: ' + cutoffDate);
  console.log('Expected: 2026-10-06\n');
  
  if (cutoffDate !== '2026-10-06') {
    console.error('ERROR: Date calculation wrong!');
    console.error('Expected cutoff: 2026-10-06');
    console.error('Actual cutoff: ' + cutoffDate);
    process.exit(1);
  }
  
  // Test Oct 8 meeting (within window)
  const oct8Content = readFileSync('/home/ubuntu/.cursor/projects/workspace/uploads/oct8-plaintext-nextsteps_5010.txt', 'utf-8');
  const oct8Actions = await extractExplicitActions('oct8', '2026-10-08', 'Oct 8 Meeting', oct8Content);
  
  console.log('Oct 8 Meeting (2026-10-08):');
  console.log('  Extracted: ' + oct8Actions.length + ' actions');
  console.log('  Within window: ' + ('2026-10-08' >= cutoffDate ? 'YES' : 'NO'));
  
  const oct8Filtered = oct8Actions.filter(a => a.meetingDate >= cutoffDate);
  console.log('  After date filter: ' + oct8Filtered.length + ' actions');
  
  if (oct8Actions.length !== oct8Filtered.length) {
    console.error('\nERROR: Date filter removed Oct 8 actions!');
    process.exit(1);
  }
  
  // Test Oct 9 meeting (within window)
  const oct9Content = readFileSync('/home/ubuntu/.cursor/projects/workspace/uploads/oct9-plaintext-nextsteps_8a83.txt', 'utf-8');
  const oct9Actions = await extractExplicitActions('oct9', '2026-10-09', 'Oct 9 Meeting', oct9Content);
  
  console.log('\nOct 9 Meeting (2026-10-09):');
  console.log('  Extracted: ' + oct9Actions.length + ' actions');
  console.log('  Within window: ' + ('2026-10-09' >= cutoffDate ? 'YES' : 'NO'));
  
  const oct9Filtered = oct9Actions.filter(a => a.meetingDate >= cutoffDate);
  console.log('  After date filter: ' + oct9Filtered.length + ' actions');
  
  if (oct9Actions.length !== oct9Filtered.length) {
    console.error('\nERROR: Date filter removed Oct 9 actions!');
    process.exit(1);
  }
  
  // Check Lisa's actions specifically
  const lisa8 = oct8Filtered.filter(a => a.owner === 'Lisa').length;
  const lisa9 = oct9Filtered.filter(a => a.owner === 'Lisa').length;
  
  console.log('\nLisa actions from Oct 8+9: ' + (lisa8 + lisa9));
  console.log('  From Oct 8: ' + lisa8);
  console.log('  From Oct 9: ' + lisa9);
  console.log('\nExpected Lisa total (all meetings): 7');
  console.log('Missing: Oct 27 (1) + Oct 29 (4) = 5 actions\n');
  
  console.log('CONCLUSION: Date filter working correctly.');
  console.log('ISSUE: listMeetings not discovering Oct 27/29 meetings.\n');
}

testDateFilter().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
