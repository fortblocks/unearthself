/**
 * Test extractExplicitActions with REAL Gemini notes format
 * 
 * Real format (markdown view):
 * - [ ] \[Lisa Hamilton\] Email Proposal: <description>.
 * - [ ] \[Tess, Christopher Mair\] Pick Up Passengers: <description>.
 * 
 * Real format (text/plain view):
 * ☐ [Lisa Hamilton] Email Proposal: <description>.
 */

import { extractExplicitActions } from './src/lib/action-tracking';

// Test fixture with EXACT real format (markdown view with backslash escapes)
const MARKDOWN_FIXTURE = `
## **Next steps**

- [ ] \[Lisa Hamilton\] Email Proposal: Send the updated proposal to the client by Friday EOD.
- [ ] \[Tess, Christopher Mair\] Pick Up Passengers: Coordinate pickup schedule for the airport transfers next week.
- [ ] \[Tess Hamilton, Chris\] Develop corporate packages: Create three-tier pricing for corporate clients.
- [ ] \[Norah Bird Hamilton\] {Perform Moisture Test}: Test moisture levels in the warehouse samples.
- [ ] \[Interlocutor\] Review Options: Review the venue options and inform Lisa Hamilton by tomorrow.
- [ ] \[The group\] Finalize Budget: Complete the Q4 budget review before month end.

### **Details**

Meeting held at the downtown office.
`;

// Test fixture with EXACT real format (text/plain view with unicode checkboxes)
const PLAINTEXT_FIXTURE = `
Next steps

☐ [Lisa Hamilton] Email Proposal: Send the updated proposal to the client by Friday EOD.
☐ [Tess, Christopher Mair] Pick Up Passengers: Coordinate pickup schedule for the airport transfers next week.
☐ [Tess Hamilton, Chris] Develop corporate packages: Create three-tier pricing for corporate clients.
☐ [Norah Bird Hamilton] {Perform Moisture Test}: Test moisture levels in the warehouse samples.
☐ [Interlocutor] Review Options: Review the venue options and inform Lisa Hamilton by tomorrow.
☐ [The group] Finalize Budget: Complete the Q4 budget review before month end.

Details

Meeting held at the downtown office.
`;

// Expected results
const EXPECTED_ACTIONS = [
  // Line 1: [Lisa Hamilton] -> owner: Lisa, title: "Email Proposal"
  { owner: 'Lisa', title: 'Email Proposal' },
  
  // Line 2: [Tess, Christopher Mair] -> owners: Tess, Christopher, title: "Pick Up Passengers"
  { owner: 'Tess', title: 'Pick Up Passengers' },
  { owner: 'Christopher', title: 'Pick Up Passengers' },
  
  // Line 3: [Tess Hamilton, Chris] -> owners: Tess, Christopher (Chris mapped), title: "Develop corporate packages"
  { owner: 'Tess', title: 'Develop corporate packages' },
  { owner: 'Christopher', title: 'Develop corporate packages' },
  
  // Line 4: [Norah Bird Hamilton] -> owner: Norah, title: "Perform Moisture Test" (braces stripped)
  { owner: 'Norah', title: 'Perform Moisture Test' },
  
  // Line 5: [Interlocutor] -> ZERO actions (not a partner)
  // Line 6: [The group] -> ZERO actions (not a partner)
];

async function runTests() {
  console.log('Testing markdown fixture...\n');
  
  const markdownActions = await extractExplicitActions(
    'test-meeting-1',
    '2026-11-04',
    'Test Meeting',
    MARKDOWN_FIXTURE
  );
  
  console.log(`Extracted ${markdownActions.length} actions from markdown fixture:`);
  for (const action of markdownActions) {
    console.log(`  - Owner: ${action.owner}, Title: "${action.excerpt}"`);
  }
  console.log();
  
  // Verify count
  if (markdownActions.length !== EXPECTED_ACTIONS.length) {
    console.error(`❌ FAIL: Expected ${EXPECTED_ACTIONS.length} actions, got ${markdownActions.length}`);
    process.exit(1);
  }
  
  // Verify each expected action
  for (const expected of EXPECTED_ACTIONS) {
    const found = markdownActions.find(
      a => a.owner === expected.owner && a.excerpt === expected.title
    );
    if (!found) {
      console.error(`❌ FAIL: Expected action not found: ${expected.owner} - "${expected.title}"`);
      process.exit(1);
    }
  }
  
  console.log('✅ Markdown fixture: All assertions passed!\n');
  
  // Test plaintext fixture
  console.log('Testing plaintext fixture...\n');
  
  const plaintextActions = await extractExplicitActions(
    'test-meeting-2',
    '2026-11-04',
    'Test Meeting',
    PLAINTEXT_FIXTURE
  );
  
  console.log(`Extracted ${plaintextActions.length} actions from plaintext fixture:`);
  for (const action of plaintextActions) {
    console.log(`  - Owner: ${action.owner}, Title: "${action.excerpt}"`);
  }
  console.log();
  
  // Verify count
  if (plaintextActions.length !== EXPECTED_ACTIONS.length) {
    console.error(`❌ FAIL: Expected ${EXPECTED_ACTIONS.length} actions, got ${plaintextActions.length}`);
    process.exit(1);
  }
  
  // Verify each expected action
  for (const expected of EXPECTED_ACTIONS) {
    const found = plaintextActions.find(
      a => a.owner === expected.owner && a.excerpt === expected.title
    );
    if (!found) {
      console.error(`❌ FAIL: Expected action not found: ${expected.owner} - "${expected.title}"`);
      process.exit(1);
    }
  }
  
  console.log('✅ Plaintext fixture: All assertions passed!\n');
  console.log('🎉 ALL TESTS PASSED!');
}

runTests().catch(error => {
  console.error('Test failed with error:', error);
  process.exit(1);
});
