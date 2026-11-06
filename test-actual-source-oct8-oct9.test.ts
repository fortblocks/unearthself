/**
 * Test with ACTUAL source files from Oct 8 and Oct 9
 * Real plaintext format: * [Owner] Title: Description. (NO checkbox tokens)
 */

import { extractExplicitActions } from './src/lib/action-tracking.ts';
import { readFileSync } from 'fs';

async function testActualSources() {
  console.log('Testing ACTUAL source files from production Drive exports\n');
  
  // Read Oct 8 plaintext export
  const oct8Content = readFileSync('/home/ubuntu/.cursor/projects/workspace/uploads/oct8-plaintext-nextsteps_5010.txt', 'utf-8');
  
  console.log('📄 Oct 8 Meeting (2026-10-08)');
  console.log('Expected: Tess 1, Norah 2, exclude "The group"\n');
  
  const oct8Actions = await extractExplicitActions(
    'oct8-test',
    '2026-10-08',
    'Badlander\'s Development Meeting - 2026/10/08',
    oct8Content
  );
  
  console.log(`Extracted ${oct8Actions.length} actions:`);
  const oct8ByOwner: Record<string, number> = {};
  for (const action of oct8Actions) {
    oct8ByOwner[action.owner] = (oct8ByOwner[action.owner] || 0) + 1;
    console.log(`  - ${action.owner}: "${action.excerpt}"`);
  }
  
  console.log('\nCounts by owner:');
  for (const [owner, count] of Object.entries(oct8ByOwner)) {
    console.log(`  ${owner}: ${count}`);
  }
  
  // Verify Oct 8
  const oct8Tess = oct8Actions.filter(a => a.owner === 'Tess').length;
  const oct8Norah = oct8Actions.filter(a => a.owner === 'Norah').length;
  const oct8Group = oct8Actions.filter(a => a.excerpt.includes('The group')).length;
  
  if (oct8Tess !== 1) {
    console.error(`❌ Oct 8: Expected 1 Tess action, got ${oct8Tess}`);
    process.exit(1);
  }
  if (oct8Norah !== 2) {
    console.error(`❌ Oct 8: Expected 2 Norah actions, got ${oct8Norah}`);
    process.exit(1);
  }
  if (oct8Group > 0) {
    console.error(`❌ Oct 8: Found ${oct8Group} "The group" actions (should be excluded)`);
    process.exit(1);
  }
  
  console.log('✅ Oct 8: All assertions passed!\n');
  
  // Read Oct 9 plaintext export
  const oct9Content = readFileSync('/home/ubuntu/.cursor/projects/workspace/uploads/oct9-plaintext-nextsteps_8a83.txt', 'utf-8');
  
  console.log('📄 Oct 9 Meeting (2026-10-09)');
  console.log('Expected: Lisa 2, Tess 2, Norah 6, exclude "The group"\n');
  
  const oct9Actions = await extractExplicitActions(
    'oct9-test',
    '2026-10-09',
    'Badlander\'s Development Meeting - 2026/10/09',
    oct9Content
  );
  
  console.log(`Extracted ${oct9Actions.length} actions:`);
  const oct9ByOwner: Record<string, number> = {};
  for (const action of oct9Actions) {
    oct9ByOwner[action.owner] = (oct9ByOwner[action.owner] || 0) + 1;
    console.log(`  - ${action.owner}: "${action.excerpt}"`);
  }
  
  console.log('\nCounts by owner:');
  for (const [owner, count] of Object.entries(oct9ByOwner)) {
    console.log(`  ${owner}: ${count}`);
  }
  
  // Verify Oct 9
  const oct9Lisa = oct9Actions.filter(a => a.owner === 'Lisa').length;
  const oct9Tess = oct9Actions.filter(a => a.owner === 'Tess').length;
  const oct9Norah = oct9Actions.filter(a => a.owner === 'Norah').length;
  const oct9Group = oct9Actions.filter(a => a.excerpt.includes('The group')).length;
  
  if (oct9Lisa !== 2) {
    console.error(`❌ Oct 9: Expected 2 Lisa actions, got ${oct9Lisa}`);
    process.exit(1);
  }
  if (oct9Tess !== 2) {
    console.error(`❌ Oct 9: Expected 2 Tess actions, got ${oct9Tess}`);
    process.exit(1);
  }
  if (oct9Norah !== 6) {
    console.error(`❌ Oct 9: Expected 6 Norah actions, got ${oct9Norah}`);
    process.exit(1);
  }
  if (oct9Group > 0) {
    console.error(`❌ Oct 9: Found ${oct9Group} "The group" actions (should be excluded)`);
    process.exit(1);
  }
  
  console.log('✅ Oct 9: All assertions passed!\n');
  console.log('🎉 ALL ACTUAL SOURCE TESTS PASSED!');
}

testActualSources().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
