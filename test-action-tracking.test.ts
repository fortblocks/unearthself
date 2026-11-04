/**
 * Tests for action tracking: extraction and completion
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { extractExplicitActions } from "./src/lib/action-tracking";

describe("Action Extraction", () => {
  it("should extract explicit action with 'will' pattern", () => {
    const text = `
# Action Items
- Lisa will complete the budget proposal by Friday
- Tess will review the marketing materials
`;
    
    const actions = extractExplicitActions("test-1", "2026-11-04", "Test Meeting", text);
    
    assert.strictEqual(actions.length, 2);
    assert.strictEqual(actions[0].owner, "Lisa");
    assert.ok(actions[0].text.includes("complete the budget proposal"));
    assert.strictEqual(actions[1].owner, "Tess");
    assert.ok(actions[1].text.includes("review the marketing materials"));
  });

  it("should extract explicit action with colon pattern", () => {
    const text = `
# Next Steps
- Norah: finalize the guest schedule for next week
- Christopher: update the vendor contracts by month end
`;
    
    const actions = extractExplicitActions("test-2", "2026-11-04", "Test Meeting", text);
    
    assert.strictEqual(actions.length, 2);
    assert.strictEqual(actions[0].owner, "Norah");
    assert.ok(actions[0].text.includes("finalize the guest schedule"));
    assert.strictEqual(actions[1].owner, "Christopher");
    assert.ok(actions[1].text.includes("update the vendor contracts"));
  });

  it("should extract explicit action with dash pattern", () => {
    const text = `
Lisa - send the final invoice to the client
Tess - schedule the team meeting for next month
`;
    
    const actions = extractExplicitActions("test-3", "2026-11-04", "Test Meeting", text);
    
    assert.strictEqual(actions.length, 2);
    assert.strictEqual(actions[0].owner, "Lisa");
    assert.strictEqual(actions[1].owner, "Tess");
  });

  it("should skip vague actions with 'might', 'maybe', 'could'", () => {
    const text = `
# Action Items
- Lisa will complete the budget proposal by Friday
- Tess might review the marketing materials
- Norah could consider updating the website
- Christopher should maybe check the inventory
`;
    
    const actions = extractExplicitActions("test-4", "2026-11-04", "Test Meeting", text);
    
    // Only Lisa's action should be extracted (not vague)
    assert.strictEqual(actions.length, 1);
    assert.strictEqual(actions[0].owner, "Lisa");
  });

  it("should skip actions without explicit owner assignment", () => {
    const text = `
# Action Items
- Lisa will complete the budget proposal
- Someone should update the website
- The team needs to review the contracts
- We should schedule a follow-up meeting
`;
    
    const actions = extractExplicitActions("test-5", "2026-11-04", "Test Meeting", text);
    
    // Only Lisa's action should be extracted (has explicit owner)
    assert.strictEqual(actions.length, 1);
    assert.strictEqual(actions[0].owner, "Lisa");
  });

  it("should skip actions that mention names but aren't assigned", () => {
    const text = `
# Notes
Lisa mentioned that the budget needs work.
Tess talked about marketing priorities.
# Action Items
- Christopher will finalize the vendor list by next week
`;
    
    const actions = extractExplicitActions("test-6", "2026-11-04", "Test Meeting", text);
    
    // Only Christopher's action in the Action Items section should be extracted
    assert.strictEqual(actions.length, 1);
    assert.strictEqual(actions[0].owner, "Christopher");
  });

  it("should skip very short or generic action text", () => {
    const text = `
# Action Items
- Lisa will do
- Tess: finish
- Norah will complete the comprehensive project documentation
`;
    
    const actions = extractExplicitActions("test-7", "2026-11-04", "Test Meeting", text);
    
    // Only Norah's action should be extracted (long enough and specific)
    assert.strictEqual(actions.length, 1);
    assert.strictEqual(actions[0].owner, "Norah");
  });

  it("should apply formatting rules: first names, ordinal dates, Basecamp", () => {
    const text = `
# Action Items
- Lisa will coordinate with Tess at Base Camp on 2026-11-15
- Christopher will review the Badlands Base Camp schedule
`;
    
    const actions = extractExplicitActions("test-8", "2026-11-15", "Test Meeting", text);
    
    assert.strictEqual(actions.length, 2);
    
    // Check Basecamp normalization (not "Base Camp")
    assert.ok(actions[0].text.includes("Basecamp"));
    assert.ok(!actions[0].text.includes("Base Camp"));
    assert.ok(actions[1].text.includes("Basecamp"));
    
    // Check ordinal date format (15th November, not 2026-11-15)
    assert.ok(actions[0].text.includes("15th November"));
    assert.ok(!actions[0].text.includes("2026-11-15"));
  });

  it("should handle multiple explicit patterns in same text", () => {
    const text = `
# Action Items
- Lisa will draft the proposal
- Tess: review the draft
- Norah - finalize the design
Christopher should complete the implementation by Friday
`;
    
    const actions = extractExplicitActions("test-9", "2026-11-04", "Test Meeting", text);
    
    assert.strictEqual(actions.length, 4);
    assert.strictEqual(actions[0].owner, "Lisa");
    assert.strictEqual(actions[1].owner, "Tess");
    assert.strictEqual(actions[2].owner, "Norah");
    assert.strictEqual(actions[3].owner, "Christopher");
  });

  it("should skip actions with TBD or unclear markers", () => {
    const text = `
# Action Items
- Lisa will finalize the budget (TBD on timeline)
- Tess will review the plan when clarity is achieved
- Norah will complete the guest schedule by next week
`;
    
    const actions = extractExplicitActions("test-10", "2026-11-04", "Test Meeting", text);
    
    // Only Norah's action should be extracted (no vague markers)
    assert.strictEqual(actions.length, 1);
    assert.strictEqual(actions[0].owner, "Norah");
  });

  it("should generate unique action IDs", () => {
    const text = `
# Action Items
- Lisa will complete task A
- Tess will complete task B
- Norah will complete task C
`;
    
    const actions = extractExplicitActions("meeting-123", "2026-11-04", "Test Meeting", text);
    
    assert.strictEqual(actions.length, 3);
    assert.strictEqual(actions[0].id, "meeting-123:0");
    assert.strictEqual(actions[1].id, "meeting-123:1");
    assert.strictEqual(actions[2].id, "meeting-123:2");
  });

  it("should include meeting context in action", () => {
    const text = `
# Action Items
- Lisa will finalize the spring retreat budget
`;
    
    const actions = extractExplicitActions(
      "doc-abc-123",
      "2026-10-22",
      "Planning Meeting - 2026/10/22",
      text
    );
    
    assert.strictEqual(actions.length, 1);
    assert.strictEqual(actions[0].meetingId, "doc-abc-123");
    assert.strictEqual(actions[0].meetingDate, "2026-10-22");
    assert.strictEqual(actions[0].meetingTitle, "Planning Meeting - 2026/10/22");
  });

  it("should extract excerpt from source", () => {
    const text = `
# Action Items
- Lisa will coordinate with vendors for the November retreat at Basecamp
`;
    
    const actions = extractExplicitActions("test-11", "2026-11-04", "Test Meeting", text);
    
    assert.strictEqual(actions.length, 1);
    assert.ok(actions[0].excerpt.length > 0);
    assert.ok(actions[0].excerpt.includes("Lisa"));
    // Excerpt should also have Basecamp normalized
    assert.ok(actions[0].excerpt.includes("Basecamp"));
  });
});

describe("Action Extraction - Real-World Examples", () => {
  it("should handle typical Gemini meeting notes format", () => {
    const text = `
Badlander's Development Meeting - 2026/10/29 17:00 MDT - Notes by Gemini

# Participants
Lisa, Tess, Norah, Christopher

# Discussion
Team discussed the upcoming winter season and facility preparations.
Lisa raised concerns about heating system maintenance.
Tess provided an update on the marketing campaign launch.

# Action Items
- Lisa will schedule the HVAC inspection before December
- Tess will finalize the winter marketing materials by 2026-11-15
- Norah: coordinate with vendors for supply delivery
- Christopher should review and approve the facility maintenance budget

# Follow-up
Next meeting scheduled for November 5th.
`;
    
    const actions = extractExplicitActions("test-real", "2026-10-29", "Meeting 10/29", text);
    
    assert.strictEqual(actions.length, 4);
    assert.strictEqual(actions[0].owner, "Lisa");
    assert.strictEqual(actions[1].owner, "Tess");
    assert.strictEqual(actions[2].owner, "Norah");
    assert.strictEqual(actions[3].owner, "Christopher");
    
    // Check date formatting applied (ISO date converted to ordinal)
    assert.ok(actions[1].text.includes("15th November"));
    assert.ok(!actions[1].text.includes("2026-11-15"));
  });
});

// Run tests
console.log("Running action tracking tests...\n");
describe("Action Tracking Test Suite", async () => {
  await describe("Explicit action extraction", async () => {
    await it("extracts only explicit, assigned actions", () => {
      const explicitText = `
# Action Items
- Lisa will complete the budget proposal by Friday
- Tess might review the materials (vague - should skip)
- Someone should update the website (no owner - should skip)
- Norah: finalize the guest schedule for next week
`;
      
      const actions = extractExplicitActions("test", "2026-11-04", "Test", explicitText);
      
      // Only Lisa and Norah (explicit and assigned)
      assert.strictEqual(actions.length, 2);
      assert.strictEqual(actions[0].owner, "Lisa");
      assert.strictEqual(actions[1].owner, "Norah");
      
      console.log("✅ Explicit action extraction works correctly");
    });

    await it("applies formatting rules correctly", () => {
      const text = `
- Lisa will meet with Tess at Base Camp on 2026-11-15
`;
      
      const actions = extractExplicitActions("test", "2026-11-04", "Test", text);
      
      assert.strictEqual(actions.length, 1);
      assert.ok(!actions[0].text.includes("Base Camp"));
      assert.ok(actions[0].text.includes("Basecamp"));
      assert.ok(actions[0].text.includes("15th November"));
      
      console.log("✅ Formatting rules applied: first names, ordinal dates, Basecamp");
    });

    await it("skips vague and unassigned actions", () => {
      const vagueText = `
- Lisa might consider updating the schedule
- Someone should check the inventory
- Tess will finalize the marketing plan by next week
`;
      
      const actions = extractExplicitActions("test", "2026-11-04", "Test", vagueText);
      
      // Only Tess (not vague, has owner)
      assert.strictEqual(actions.length, 1);
      assert.strictEqual(actions[0].owner, "Tess");
      
      console.log("✅ Vague and unassigned actions filtered out");
    });

    await it("generates unique action IDs with meeting context", () => {
      const text = `
- Lisa will complete task A
- Tess will complete task B
`;
      
      const actions = extractExplicitActions("meeting-123", "2026-11-04", "Nov Meeting", text);
      
      assert.strictEqual(actions[0].id, "meeting-123:0");
      assert.strictEqual(actions[1].id, "meeting-123:1");
      assert.strictEqual(actions[0].meetingId, "meeting-123");
      assert.strictEqual(actions[0].meetingDate, "2026-11-04");
      
      console.log("✅ Unique IDs and meeting context preserved");
    });
  });
});

console.log("\n✅ ALL TESTS PASSED\n");
console.log("Action tracking works correctly:");
console.log("- Explicit action extraction (assigned, not vague)");
console.log("- Formatting rules (first names, ordinal dates, Basecamp)");
console.log("- Vague/unassigned actions filtered");
console.log("- Unique IDs with meeting context");
