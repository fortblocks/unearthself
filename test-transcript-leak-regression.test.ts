/**
 * Test transcript leak regression
 * Ensure we don't extract from transcript speaker lines like "[Lisa Hamilton] spoken words..."
 */

import { extractExplicitActions } from './src/lib/action-tracking';

const TRANSCRIPT_LEAK_FIXTURE = `
Development Meeting Notes

Next steps
* [Lisa] Email Proposal: Send the updated proposal to the client.
* [Tess, Christopher] Pick Up Passengers: Coordinate pickup schedule.

Details
Meeting discussion about the proposal.

[Lisa Hamilton] I think we should focus on the client proposal first.
[Tess Hamilton] Yes, and we need to coordinate the pickup schedule.
[Christopher Mair] Agreed. Let's make sure we have all the details.
[Norah Bird Hamilton] I'll handle the other items after this meeting.

The team discussed various action items and next steps.
`;

async function testTranscriptLeak() {
  console.log('Testing transcript leak regression\n');
  
  const actions = await extractExplicitActions(
    'leak-test',
    '2026-11-05',
    'Test Meeting',
    TRANSCRIPT_LEAK_FIXTURE
  );
  
  console.log(`Extracted ${actions.length} actions:`);
  for (const action of actions) {
    console.log(`  - ${action.owner}: "${action.excerpt}"`);
  }
  
  // Should only extract from Next steps section, not transcript speaker lines
  const expectedCount = 3; // Lisa 1, Tess 1, Christopher 1 (from shared action)
  
  if (actions.length !== expectedCount) {
    console.error(`\n❌ Expected ${expectedCount} actions, got ${actions.length}`);
    console.error(`   Possible transcript leak if count > ${expectedCount}`);
    process.exit(1);
  }
  
  // Check that we don't have actions from transcript
  const hasTranscriptText = actions.some(a => 
    a.excerpt.includes('focus on the client') ||
    a.excerpt.includes('coordinate the pickup') ||
    a.excerpt.includes('make sure we have') ||
    a.excerpt.includes('handle the other items')
  );
  
  if (hasTranscriptText) {
    console.error('\n❌ Found transcript text in actions (leak detected)');
    process.exit(1);
  }
  
  console.log('\n✅ No transcript leak detected!');
}

testTranscriptLeak().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
