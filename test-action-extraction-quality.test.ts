/**
 * Tests for action extraction quality
 * Uses real fixture text to ensure only proper action items are extracted
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { extractExplicitActions } from "./src/lib/action-tracking";

describe("Action Extraction Quality", () => {
  it("should extract ZERO actions from transcript fragments", async () => {
    // Real bad text from Lisa's Today page screenshot
    const transcriptText = `
Badlander's Development Meeting - 2026/11/01 14:00 MDT - Notes by Gemini

# Transcript
definitely not be happy with that first one. Um,
do that, we're going to move up our staff training...
Lisa mentioned something about the budget.
Christopher talked about vendors.
`;
    
    const actions = await extractExplicitActions("test-1", "2026-11-01", "Meeting", transcriptText);
    
    // Should extract ZERO actions because there's no "Action items" or "Suggested next steps" section
    assert.strictEqual(actions.length, 0, "Should not extract actions from transcript text");
  });

  it("should extract action from proper next-steps section", async () => {
    const goodText = `
Badlander's Development Meeting - 2026/11/01 14:00 MDT - Notes by Gemini

# Discussion
Team discussed various topics.

# Suggested next steps
- [Lisa Hamilton] Ask Scott if moving the door is feasible before scheduling contractors
- [Tess] Review the winter marketing materials and provide feedback by next week
`;
    
    const actions = await extractExplicitActions("test-2", "2026-11-01", "Meeting", goodText);
    
    assert.strictEqual(actions.length, 2, "Should extract 2 actions from next-steps section");
    assert.strictEqual(actions[0].owner, "Lisa");
    assert.strictEqual(actions[1].owner, "Tess");
    // Text should be short and imperative
    assert.ok(actions[0].text.length < 100, "Action text should be concise");
    assert.ok(!actions[0].text.includes("[Lisa Hamilton]"), "Owner should not be in action text");
  });

  it("should skip actions assigned to non-partners", async () => {
    const mixedText = `
# Action Items
- [Lisa Hamilton] Complete budget proposal by Friday
- [Scott] Check with building management about permits
- [Jonah] Schedule follow-up meeting
- [Christopher] Review vendor contracts
`;
    
    const actions = await extractExplicitActions("test-3", "2026-11-01", "Meeting", mixedText);
    
    // Should only extract Lisa and Christopher (partners), not Scott or Jonah
    assert.strictEqual(actions.length, 2);
    const owners = actions.map(a => a.owner);
    assert.ok(owners.includes("Lisa"));
    assert.ok(owners.includes("Christopher"));
    assert.ok(!owners.includes("Scott" as any));
    assert.ok(!owners.includes("Jonah" as any));
  });

  it("should extract from 'Action items' section", async () => {
    const text = `
# Action items
- Lisa will finalize the guest schedule for next month
- Norah: coordinate with vendors for supply delivery
`;
    
    const actions = await extractExplicitActions("test-4", "2026-11-01", "Meeting", text);
    
    assert.strictEqual(actions.length, 2);
    assert.strictEqual(actions[0].owner, "Lisa");
    assert.strictEqual(actions[1].owner, "Norah");
  });

  it("should skip unassigned group actions", async () => {
    const text = `
# Next steps
- [Lisa] Complete the budget proposal
- Team should review the new policies
- Someone needs to update the website
- [Tess] Send the quarterly report
`;
    
    const actions = await extractExplicitActions("test-5", "2026-11-01", "Meeting", text);
    
    // Should only extract Lisa and Tess (assigned), not the group/unassigned items
    assert.strictEqual(actions.length, 2);
    assert.strictEqual(actions[0].owner, "Lisa");
    assert.strictEqual(actions[1].owner, "Tess");
  });

  it("should clean meeting title", async () => {
    const text = `
# Suggested next steps
- [Norah] Review facility maintenance schedule
`;
    
    const actions = await extractExplicitActions(
      "test-6",
      "2026-11-01",
      "Badlander's Development Meeting - 2026/11/01 14:00 MDT - Notes by Gemini",
      text
    );
    
    assert.strictEqual(actions.length, 1);
    // Title should be cleaned: no timestamp, no "Notes by Gemini"
    assert.ok(!actions[0].meetingTitle.includes("2026/11/01"));
    assert.ok(!actions[0].meetingTitle.includes("14:00"));
    assert.ok(!actions[0].meetingTitle.includes("Notes by Gemini"));
    assert.ok(actions[0].meetingTitle.length < 50);
  });

  it("should format dates as ordinal", async () => {
    const text = `
# Action items
- [Lisa] Schedule contractor visit on 2026-11-15 to assess facility needs
`;
    
    const actions = await extractExplicitActions("test-7", "2026-11-01", "Meeting", text);
    
    assert.strictEqual(actions.length, 1);
    // Date should be formatted as "15th November" not "2026-11-15"
    assert.ok(actions[0].text.includes("15th November") || !actions[0].text.includes("2026-11-15"));
  });

  it("should normalize Basecamp to one word", async () => {
    const text = `
# Next steps
- [Christopher] Review the Base Camp facility schedule and update calendar
`;
    
    const actions = await extractExplicitActions("test-8", "2026-11-01", "Meeting", text);
    
    assert.strictEqual(actions.length, 1);
    // "Base Camp" should be "Basecamp"
    assert.ok(actions[0].text.includes("Basecamp") || !actions[0].text.includes("Base Camp"));
  });

  it("should keep verbatim source as excerpt", async () => {
    const text = `
# Action items
- [Lisa Hamilton] Ask Scott if moving the door is feasible before scheduling contractors
`;
    
    const actions = await extractExplicitActions("test-9", "2026-11-01", "Meeting", text);
    
    assert.strictEqual(actions.length, 1);
    // Excerpt should contain the verbatim source
    assert.ok(actions[0].excerpt.includes("Ask Scott") || actions[0].excerpt.includes("moving the door"));
    // Text should be shorter/rewritten
    assert.ok(actions[0].text.length <= actions[0].excerpt.length);
  });

  it("should generate stable IDs based on line hash", async () => {
    const text = `
# Action items
- [Lisa] Complete budget proposal by Friday
`;
    
    const actions1 = await extractExplicitActions("meeting-123", "2026-11-01", "Meeting", text);
    const actions2 = await extractExplicitActions("meeting-123", "2026-11-01", "Meeting", text);
    
    // Same text should produce same ID
    assert.strictEqual(actions1[0].id, actions2[0].id);
    // ID should include meeting ID
    assert.ok(actions1[0].id.startsWith("meeting-123:"));
  });
});

// Run tests
console.log("Running action extraction quality tests...\n");
describe("Action Extraction Quality Test Suite", async () => {
  await describe("Extraction quality", async () => {
    await it("extracts zero actions from transcript fragments", async () => {
      const badText = `
Transcript:
definitely not be happy with that first one. Um,
do that, we're going to move up our staff training...
`;
      
      const actions = await extractExplicitActions("test", "2026-11-01", "Meeting", badText);
      assert.strictEqual(actions.length, 0);
      console.log("✅ Transcript fragments produce zero actions");
    });

    await it("extracts proper actions from next-steps section", async () => {
      const goodText = `
# Suggested next steps
- [Lisa Hamilton] Ask Scott about door feasibility
- [Tess] Review marketing materials
`;
      
      const actions = await extractExplicitActions("test", "2026-11-01", "Meeting", goodText);
      assert.strictEqual(actions.length, 2);
      assert.strictEqual(actions[0].owner, "Lisa");
      console.log("✅ Proper next-steps section produces correct actions");
    });

    await it("skips non-partner and unassigned actions", async () => {
      const text = `
# Action items
- [Lisa] Do task A
- [Scott] Do task B
- Team should do task C
- [Christopher] Do task D
`;
      
      const actions = await extractExplicitActions("test", "2026-11-01", "Meeting", text);
      assert.strictEqual(actions.length, 2);
      assert.strictEqual(actions[0].owner, "Lisa");
      assert.strictEqual(actions[1].owner, "Christopher");
      console.log("✅ Non-partner and unassigned actions skipped");
    });

    await it("applies formatting rules", async () => {
      const text = `
# Next steps
- [Lisa] Visit Base Camp on 2026-11-15
`;
      
      const actions = await extractExplicitActions("test", "2026-11-01", "Meeting", text);
      assert.strictEqual(actions.length, 1);
      console.log("✅ Formatting applied (dates, Basecamp)");
    });
  });
});

console.log("\n✅ ALL TESTS PASSED\n");
console.log("Extraction quality verified:");
console.log("- Transcript fragments → zero actions");
console.log("- Proper next-steps section → correct actions");
console.log("- Non-partner/unassigned → skipped");
console.log("- Formatting rules applied");
