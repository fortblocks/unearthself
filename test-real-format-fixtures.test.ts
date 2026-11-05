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

/**
 * Regression: plaintext Next steps must end at bare Details; transcript
 * speaker lines must never become actions (production bug after PR 52).
 */
const PLAINTEXT_TRANSCRIPT_LEAK_FIXTURE = `
Next steps

☐ [Lisa Hamilton] Email Proposal: Send the updated proposal to the client by Friday EOD.
☐ [Tess, Christopher Mair] Pick Up Passengers: Coordinate pickup schedule for airport transfers.
☐ [Tess Hamilton, Chris] Develop corporate packages: Create three-tier pricing for corporate clients.

Details

Discussion continues after the action list.

[Lisa Hamilton] And then Lisa will concentrate on construction for the next two days, staying until Tuesday, spending a day with their mother, and returning home on Wednesday. Regarding exterior painting, Norah Hamilton noted that their father recommended painting by hand.

[Lisa Hamilton] definitely not be happy with that first one. Um,

[Norah Hamilton] something else about operations

Transcript

[Lisa Hamilton] travel to join them in person to unify operations and accelerate project momentum.
`;

// Expected results for the core fixtures
const EXPECTED_ACTIONS = [
  { owner: 'Lisa', title: 'Email Proposal' },
  { owner: 'Tess', title: 'Pick Up Passengers' },
  { owner: 'Christopher', title: 'Pick Up Passengers' },
  { owner: 'Tess', title: 'Develop corporate packages' },
  { owner: 'Christopher', title: 'Develop corporate packages' },
  { owner: 'Norah', title: 'Perform Moisture Test' },
];

async function runTests() {
  // Ensure rewrite falls back to title (no XAI key / dead model path)
  delete process.env.XAI_API_KEY;

  console.log('Testing markdown fixture...\n');

  const markdownActions = await extractExplicitActions(
    'test-meeting-1',
    '2026-11-04',
    'Test Meeting',
    MARKDOWN_FIXTURE
  );

  console.log(`Extracted ${markdownActions.length} actions from markdown fixture:`);
  for (const action of markdownActions) {
    console.log(`  - Owner: ${action.owner}, text: "${action.text}", excerpt: "${action.excerpt}"`);
  }
  console.log();

  if (markdownActions.length !== EXPECTED_ACTIONS.length) {
    console.error(`❌ FAIL: Expected ${EXPECTED_ACTIONS.length} actions, got ${markdownActions.length}`);
    process.exit(1);
  }

  for (const expected of EXPECTED_ACTIONS) {
    const found = markdownActions.find(
      a => a.owner === expected.owner && a.excerpt === expected.title
    );
    if (!found) {
      console.error(`❌ FAIL: Expected action not found: ${expected.owner} - "${expected.title}"`);
      process.exit(1);
    }
    if (found.text !== expected.title) {
      console.error(`❌ FAIL: UI text should be short title "${expected.title}", got "${found.text}"`);
      process.exit(1);
    }
  }

  console.log('✅ Markdown fixture: All assertions passed!\n');

  console.log('Testing plaintext fixture...\n');

  const plaintextActions = await extractExplicitActions(
    'test-meeting-2',
    '2026-11-04',
    'Test Meeting',
    PLAINTEXT_FIXTURE
  );

  console.log(`Extracted ${plaintextActions.length} actions from plaintext fixture:`);
  for (const action of plaintextActions) {
    console.log(`  - Owner: ${action.owner}, text: "${action.text}", excerpt: "${action.excerpt}"`);
  }
  console.log();

  if (plaintextActions.length !== EXPECTED_ACTIONS.length) {
    console.error(`❌ FAIL: Expected ${EXPECTED_ACTIONS.length} actions, got ${plaintextActions.length}`);
    process.exit(1);
  }

  for (const expected of EXPECTED_ACTIONS) {
    const found = plaintextActions.find(
      a => a.owner === expected.owner && a.excerpt === expected.title
    );
    if (!found) {
      console.error(`❌ FAIL: Expected action not found: ${expected.owner} - "${expected.title}"`);
      process.exit(1);
    }
    if (found.text !== expected.title) {
      console.error(`❌ FAIL: UI text should be short title "${expected.title}", got "${found.text}"`);
      process.exit(1);
    }
  }

  console.log('✅ Plaintext fixture: All assertions passed!\n');

  console.log('Testing plaintext transcript-leak regression...\n');

  const leakActions = await extractExplicitActions(
    'test-meeting-leak',
    '2026-10-26',
    'Meeting started 2026/10/26 12:31 PDT - Notes by Gemini',
    PLAINTEXT_TRANSCRIPT_LEAK_FIXTURE
  );

  console.log(`Extracted ${leakActions.length} actions from leak fixture:`);
  for (const action of leakActions) {
    console.log(`  - Owner: ${action.owner}, text: "${action.text}", excerpt: "${action.excerpt}"`);
  }
  console.log();

  const leakTexts = leakActions.map(a => a.text);
  const forbiddenFragments = [
    'definitely not be happy with that first one',
    'concentrate on construction for the next two days',
    'travel to join them in person to unify operations',
  ];
  for (const frag of forbiddenFragments) {
    if (leakTexts.some(t => t.includes(frag)) || leakActions.some(a => a.excerpt.includes(frag))) {
      console.error(`❌ FAIL: Transcript fragment leaked into actions: "${frag}"`);
      process.exit(1);
    }
  }

  // Only the three real checklist titles (Lisa + Tess/Christopher multi + Tess/Chris multi)
  const expectedLeak = [
    { owner: 'Lisa', title: 'Email Proposal' },
    { owner: 'Tess', title: 'Pick Up Passengers' },
    { owner: 'Christopher', title: 'Pick Up Passengers' },
    { owner: 'Tess', title: 'Develop corporate packages' },
    { owner: 'Christopher', title: 'Develop corporate packages' },
  ];

  if (leakActions.length !== expectedLeak.length) {
    console.error(`❌ FAIL: Expected ${expectedLeak.length} checklist actions, got ${leakActions.length}`);
    process.exit(1);
  }

  for (const expected of expectedLeak) {
    const found = leakActions.find(
      a => a.owner === expected.owner && a.text === expected.title && a.excerpt === expected.title
    );
    if (!found) {
      console.error(`❌ FAIL: Expected checklist action missing: ${expected.owner} - "${expected.title}"`);
      process.exit(1);
    }
  }

  if (leakActions.some(a => a.meetingTitle.includes('Notes by Gemini') || a.meetingTitle.includes('2026/10/26'))) {
    console.error(`❌ FAIL: meetingTitle not cleaned: ${leakActions[0].meetingTitle}`);
    process.exit(1);
  }

  console.log('✅ Plaintext transcript-leak regression: All assertions passed!\n');
  console.log('🎉 ALL TESTS PASSED!');
}

runTests().catch(error => {
  console.error('Test failed with error:', error);
  process.exit(1);
});
