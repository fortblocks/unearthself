/**
 * Comprehensive source validation test suite
 * Tests actual Oct 8/9 exports plus transcript leak regression
 */

import { extractExplicitActions } from './src/lib/action-tracking';
import { readFileSync } from 'fs';

async function runAllTests() {
  let passed = 0;
  let failed = 0;
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  COMPREHENSIVE SOURCE VALIDATION TEST SUITE');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  // Test 1: Oct 8 actual source
  console.log('📄 TEST 1: Oct 8 Meeting (2026-10-08) - ACTUAL SOURCE');
  console.log('   Expected: Tess 1, Norah 2, exclude "The group"\n');
  
  try {
    const oct8Content = readFileSync('/home/ubuntu/.cursor/projects/workspace/uploads/oct8-plaintext-nextsteps_5010.txt', 'utf-8');
    const oct8Actions = await extractExplicitActions(
      'oct8-test',
      '2026-10-08',
      'Badlander\'s Development Meeting',
      oct8Content
    );
    
    const oct8Tess = oct8Actions.filter(a => a.owner === 'Tess').length;
    const oct8Norah = oct8Actions.filter(a => a.owner === 'Norah').length;
    const oct8Group = oct8Actions.filter(a => a.text.includes('The group') || a.excerpt.includes('The group')).length;
    
    console.log(`   Extracted: Tess ${oct8Tess}, Norah ${oct8Norah}`);
    
    if (oct8Tess === 1 && oct8Norah === 2 && oct8Group === 0) {
      console.log('   ✅ PASS\n');
      passed++;
    } else {
      console.log(`   ❌ FAIL: Expected Tess=1, Norah=2, Group=0 | Got Tess=${oct8Tess}, Norah=${oct8Norah}, Group=${oct8Group}\n`);
      failed++;
    }
  } catch (error: any) {
    console.log(`   ❌ FAIL: ${error.message}\n`);
    failed++;
  }
  
  // Test 2: Oct 9 actual source
  console.log('📄 TEST 2: Oct 9 Meeting (2026-10-09) - ACTUAL SOURCE');
  console.log('   Expected: Lisa 2, Tess 2, Norah 6, exclude "The group"\n');
  
  try {
    const oct9Content = readFileSync('/home/ubuntu/.cursor/projects/workspace/uploads/oct9-plaintext-nextsteps_8a83.txt', 'utf-8');
    const oct9Actions = await extractExplicitActions(
      'oct9-test',
      '2026-10-09',
      'Badlander\'s Development Meeting',
      oct9Content
    );
    
    const oct9Lisa = oct9Actions.filter(a => a.owner === 'Lisa').length;
    const oct9Tess = oct9Actions.filter(a => a.owner === 'Tess').length;
    const oct9Norah = oct9Actions.filter(a => a.owner === 'Norah').length;
    const oct9Group = oct9Actions.filter(a => a.text.includes('The group') || a.excerpt.includes('The group')).length;
    
    console.log(`   Extracted: Lisa ${oct9Lisa}, Tess ${oct9Tess}, Norah ${oct9Norah}`);
    
    if (oct9Lisa === 2 && oct9Tess === 2 && oct9Norah === 6 && oct9Group === 0) {
      console.log('   ✅ PASS\n');
      passed++;
    } else {
      console.log(`   ❌ FAIL: Expected Lisa=2, Tess=2, Norah=6, Group=0 | Got Lisa=${oct9Lisa}, Tess=${oct9Tess}, Norah=${oct9Norah}, Group=${oct9Group}\n`);
      failed++;
    }
  } catch (error: any) {
    console.log(`   ❌ FAIL: ${error.message}\n`);
    failed++;
  }
  
  // Test 3: Transcript leak regression
  console.log('📄 TEST 3: Transcript Leak Regression');
  console.log('   Expected: Extract from Next steps only, not transcript speaker lines\n');
  
  try {
    const leakFixture = `
Next steps
* [Lisa] Email Proposal: Send the updated proposal.
* [Tess] Research Concepts: Research terminology.

Details
[Lisa Hamilton] I think we should focus on the proposal.
[Tess Hamilton] Yes, and we need to research.
`;
    
    const leakActions = await extractExplicitActions(
      'leak-test',
      '2026-11-05',
      'Test Meeting',
      leakFixture
    );
    
    const hasTranscriptLeak = leakActions.some(a => 
      a.text.includes('think we should') ||
      a.text.includes('Yes, and we need') ||
      a.excerpt.includes('think we should') ||
      a.excerpt.includes('Yes, and we need')
    );
    
    console.log(`   Extracted: ${leakActions.length} actions`);
    
    if (leakActions.length === 2 && !hasTranscriptLeak) {
      console.log('   ✅ PASS\n');
      passed++;
    } else {
      console.log(`   ❌ FAIL: Expected 2 actions with no transcript text | Got ${leakActions.length} actions, leak=${hasTranscriptLeak}\n`);
      failed++;
    }
  } catch (error: any) {
    console.log(`   ❌ FAIL: ${error.message}\n`);
    failed++;
  }
  
  // Summary
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
  console.log('═══════════════════════════════════════════════════════════\n');
  
  if (failed > 0) {
    process.exit(1);
  }
  
  console.log('🎉 ALL SOURCE VALIDATION TESTS PASSED!');
}

runAllTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
