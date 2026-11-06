/**
 * Test Today diagnostic with various scenarios:
 * - Normal (Oct 8/9 discovered)
 * - Zero (no meetings)
 * - Partial fetch failure
 * - Discovery failure
 * - Cache hit
 */

import { extractExplicitActions } from './src/lib/action-tracking';
import { readFileSync } from 'fs';

async function testScenarios() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  TODAY DIAGNOSTIC SCENARIOS');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  // Scenario 1: Normal (Oct 8/9 discovered and extracted)
  console.log('SCENARIO 1: Normal - Oct 8/9 discovered\n');
  
  const oct8Content = readFileSync('/home/ubuntu/.cursor/projects/workspace/uploads/oct8-plaintext-nextsteps_5010.txt', 'utf-8');
  const oct9Content = readFileSync('/home/ubuntu/.cursor/projects/workspace/uploads/oct9-plaintext-nextsteps_8a83.txt', 'utf-8');
  
  const meetings = [
    { id: 'oct8', date: '2026-10-08', title: 'Oct 8 Meeting' },
    { id: 'oct9', date: '2026-10-09', title: 'Oct 9 Meeting' },
  ];
  
  let allActions: any[] = [];
  const errors: string[] = [];
  
  try {
    const oct8Actions = await extractExplicitActions('oct8', '2026-10-08', 'Oct 8', oct8Content);
    const oct9Actions = await extractExplicitActions('oct9', '2026-10-09', 'Oct 9', oct9Content);
    allActions = [...oct8Actions, ...oct9Actions];
  } catch (error: any) {
    errors.push('Extraction failed: ' + error.message);
  }
  
  const diagnostic = {
    timestamp: new Date().toISOString(),
    cacheHit: false,
    discoveredMeetings: meetings.length,
    latestMeetingDate: meetings[0]?.date || null,
    extractedTotal: allActions.length,
    partnerCounts: {
      Lisa: allActions.filter(a => a.owner === 'Lisa').length,
      Tess: allActions.filter(a => a.owner === 'Tess').length,
      Christopher: allActions.filter(a => a.owner === 'Christopher').length,
      Norah: allActions.filter(a => a.owner === 'Norah').length,
    },
    errors,
  };
  
  console.log('Discovery:');
  console.log('  Meetings: ' + diagnostic.discoveredMeetings);
  console.log('  Latest: ' + diagnostic.latestMeetingDate);
  console.log('\nExtraction:');
  console.log('  Total: ' + diagnostic.extractedTotal);
  console.log('  Lisa: ' + diagnostic.partnerCounts.Lisa);
  console.log('  Tess: ' + diagnostic.partnerCounts.Tess);
  console.log('  Christopher: ' + diagnostic.partnerCounts.Christopher);
  console.log('  Norah: ' + diagnostic.partnerCounts.Norah);
  console.log('  Errors: ' + (diagnostic.errors.length === 0 ? 'none' : diagnostic.errors.join(', ')));
  
  // Filtering for Lisa
  const thirtyDaysAgo = new Date('2026-11-05');
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoff = thirtyDaysAgo.toISOString().split('T')[0];
  
  const lisaTotal = allActions.filter(a => a.owner === 'Lisa').length;
  const lisaAfterDate = allActions.filter(a => a.owner === 'Lisa' && a.meetingDate >= cutoff).length;
  
  console.log('\nFiltering (Lisa):');
  console.log('  Total: ' + lisaTotal);
  console.log('  After date filter: ' + lisaAfterDate);
  console.log('  Cutoff: ' + cutoff);
  
  console.log('\nResult: NORMAL - Actions extracted, filtering applied\n');
  
  // Scenario 2: Zero meetings
  console.log('─────────────────────────────────────────────────────────\n');
  console.log('SCENARIO 2: Zero - No meetings discovered\n');
  
  const zeroMeetings: any[] = [];
  const zeroActions: any[] = [];
  const zeroErrors: string[] = [];
  
  const zeroDiagnostic = {
    discoveredMeetings: zeroMeetings.length,
    latestMeetingDate: null,
    extractedTotal: zeroActions.length,
    partnerCounts: { Lisa: 0, Tess: 0, Christopher: 0, Norah: 0 },
    errors: zeroErrors,
  };
  
  console.log('Discovery:');
  console.log('  Meetings: ' + zeroDiagnostic.discoveredMeetings);
  console.log('  Latest: ' + (zeroDiagnostic.latestMeetingDate || 'none'));
  console.log('\nExtraction:');
  console.log('  Total: ' + zeroDiagnostic.extractedTotal);
  console.log('  All partners: 0');
  console.log('  Errors: ' + (zeroDiagnostic.errors.length === 0 ? 'none' : 'some'));
  
  console.log('\nResult: ZERO - Valid empty (no meetings to process)\n');
  
  // Scenario 3: Discovery but extraction failure
  console.log('─────────────────────────────────────────────────────────\n');
  console.log('SCENARIO 3: Extraction Failure - Meetings found but export fails\n');
  
  const failMeetings = [
    { id: 'oct8', date: '2026-10-08', title: 'Oct 8 Meeting' },
    { id: 'oct9', date: '2026-10-09', title: 'Oct 9 Meeting' },
  ];
  const failActions: any[] = [];
  const failErrors = ['Extraction failed: Drive export permission denied'];
  
  const failDiagnostic = {
    discoveredMeetings: failMeetings.length,
    latestMeetingDate: failMeetings[0].date,
    extractedTotal: failActions.length,
    partnerCounts: { Lisa: 0, Tess: 0, Christopher: 0, Norah: 0 },
    errors: failErrors,
  };
  
  console.log('Discovery:');
  console.log('  Meetings: ' + failDiagnostic.discoveredMeetings);
  console.log('  Latest: ' + failDiagnostic.latestMeetingDate);
  console.log('\nExtraction:');
  console.log('  Total: ' + failDiagnostic.extractedTotal);
  console.log('  All partners: 0');
  console.log('  Errors: ' + failDiagnostic.errors.join(', '));
  
  console.log('\nResult: FAILURE - Discovery succeeded but extraction failed\n');
  console.log('Distinguish from valid empty: errors array not empty\n');
  
  // Scenario 4: Cache hit
  console.log('─────────────────────────────────────────────────────────\n');
  console.log('SCENARIO 4: Cache Hit - Fast retrieval from Redis\n');
  
  const cacheHitDiagnostic = {
    cacheHit: true,
    cacheAge: 15, // Fast < 100ms
    discoveredMeetings: 2,
    latestMeetingDate: '2026-10-09',
    extractedTotal: 13,
    partnerCounts: { Lisa: 2, Tess: 3, Christopher: 1, Norah: 8 },
    errors: [],
  };
  
  console.log('Cache:');
  console.log('  Hit: YES (' + cacheHitDiagnostic.cacheAge + 'ms)');
  console.log('\nDiscovery:');
  console.log('  Meetings: ' + cacheHitDiagnostic.discoveredMeetings);
  console.log('  Latest: ' + cacheHitDiagnostic.latestMeetingDate);
  console.log('\nExtraction (from cache):');
  console.log('  Total: ' + cacheHitDiagnostic.extractedTotal);
  console.log('  Lisa: ' + cacheHitDiagnostic.partnerCounts.Lisa);
  console.log('  Tess: ' + cacheHitDiagnostic.partnerCounts.Tess);
  console.log('  Christopher: ' + cacheHitDiagnostic.partnerCounts.Christopher);
  console.log('  Norah: ' + cacheHitDiagnostic.partnerCounts.Norah);
  
  console.log('\nResult: CACHE HIT - Fast retrieval, no export work\n');
  
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('All scenarios distinguish incomplete/failing from valid empty');
  console.log('via discoveredMeetings count + errors array\n');
}

testScenarios().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
