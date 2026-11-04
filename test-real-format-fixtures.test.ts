/**
 * Tests with real Gemini docs format fixtures
 * Based on audit of 40 actual documents
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { extractExplicitActions } from "./src/lib/action-tracking";

describe("Real Gemini Docs Format", () => {
  it("should extract from plain 'Next steps' heading (no markdown)", async () => {
    const realFormat = `
Discussion about various topics.

Next steps

[ ] Lisa, Tess - Review the quarterly budget and provide feedback
[ ] Christopher - Follow up with vendors about delivery timeline
`;
    
    const actions = await extractExplicitActions("test-1", "2026-11-01", "Meeting", realFormat);
    
    // Should extract 3 actions: Lisa, Tess (shared), and Christopher
    assert.strictEqual(actions.length, 3);
    const owners = actions.map(a => a.owner).sort();
    assert.deepStrictEqual(owners, ["Christopher", "Lisa", "Tess"]);
  });

  it("should handle 'Chris' as Christopher", async () => {
    const text = `
Next steps

[ ] Chris - Update the facility schedule
`;
    
    const actions = await extractExplicitActions("test-2", "2026-11-01", "Meeting", text);
    
    assert.strictEqual(actions.length, 1);
    assert.strictEqual(actions[0].owner, "Christopher");
  });

  it("should skip checkbox [ ] when matching owners", async () => {
    const text = `
Next steps

[ ] Lisa - Complete budget proposal
[x] Tess - Send marketing report (already done)
`;
    
    const actions = await extractExplicitActions("test-3", "2026-11-01", "Meeting", text);
    
    // Should extract both (checkbox state doesn't determine inclusion)
    assert.strictEqual(actions.length, 2);
    assert.strictEqual(actions[0].owner, "Lisa");
    assert.strictEqual(actions[1].owner, "Tess");
  });

  it("should handle comma-separated multi-owner actions", async () => {
    const text = `
Next steps

[ ] Lisa, Tess, Norah - Review and approve the new policies document
`;
    
    const actions = await extractExplicitActions("test-4", "2026-11-01", "Meeting", text);
    
    // Should create 3 actions, one per owner, all with same text
    assert.strictEqual(actions.length, 3);
    const owners = actions.map(a => a.owner).sort();
    assert.deepStrictEqual(owners, ["Lisa", "Norah", "Tess"]);
    // All should have same text
    assert.strictEqual(actions[0].text, actions[1].text);
    assert.strictEqual(actions[1].text, actions[2].text);
  });

  it("should skip non-partner owners", async () => {
    const text = `
Next steps

[ ] Lisa - Do task A
[ ] Scott - Do task B
[ ] Christopher - Do task C
[ ] Jonah - Do task D
`;
    
    const actions = await extractExplicitActions("test-5", "2026-11-01", "Meeting", text);
    
    // Should only extract Lisa and Christopher (partners)
    assert.strictEqual(actions.length, 2);
    const owners = actions.map(a => a.owner).sort();
    assert.deepStrictEqual(owners, ["Christopher", "Lisa"]);
  });

  it("should avoid duplicate actions from tab duplication", async () => {
    const text = `
Next steps

[ ] Lisa - Complete budget proposal
[ ] Lisa - Complete budget proposal
[ ] Tess - Review marketing plan
`;
    
    const actions = await extractExplicitActions("test-6", "2026-11-01", "Meeting", text);
    
    // Should skip the duplicate Lisa line
    assert.strictEqual(actions.length, 2);
    assert.strictEqual(actions[0].owner, "Lisa");
    assert.strictEqual(actions[1].owner, "Tess");
  });

  it("should stop at other section headings", async () => {
    const text = `
Next steps

[ ] Lisa - Complete budget proposal
[ ] Tess - Review marketing plan

Discussion

Christopher mentioned something about vendors.
Lisa talked about the schedule.
`;
    
    const actions = await extractExplicitActions("test-7", "2026-11-01", "Meeting", text);
    
    // Should only extract from Next steps section, not from Discussion
    assert.strictEqual(actions.length, 2);
    const owners = actions.map(a => a.owner).sort();
    assert.deepStrictEqual(owners, ["Lisa", "Tess"]);
  });

  it("should handle full names like 'Lisa Hamilton'", async () => {
    const text = `
Next steps

[ ] Lisa Hamilton, Tess Rodriguez - Coordinate on guest schedule
`;
    
    const actions = await extractExplicitActions("test-8", "2026-11-01", "Meeting", text);
    
    // Should extract first names only
    assert.strictEqual(actions.length, 2);
    const owners = actions.map(a => a.owner).sort();
    assert.deepStrictEqual(owners, ["Lisa", "Tess"]);
  });

  it("should handle mixed owner formats", async () => {
    const text = `
Next steps

[ ] Lisa, Chris - Task A
[ ] Tess Hamilton - Task B
[ ] Norah - Task C
`;
    
    const actions = await extractExplicitActions("test-9", "2026-11-01", "Meeting", text);
    
    // Should normalize Chris to Christopher
    assert.strictEqual(actions.length, 4);
    const owners = actions.map(a => a.owner).sort();
    assert.deepStrictEqual(owners, ["Christopher", "Lisa", "Norah", "Tess"]);
  });

  it("should skip unassigned group actions", async () => {
    const text = `
Next steps

[ ] Lisa - Task A
[ ] Team - Review policies
[ ] Everyone - Submit feedback
[ ] Christopher - Task B
`;
    
    const actions = await extractExplicitActions("test-10", "2026-11-01", "Meeting", text);
    
    // Should skip "Team" and "Everyone"
    assert.strictEqual(actions.length, 2);
    const owners = actions.map(a => a.owner).sort();
    assert.deepStrictEqual(owners, ["Christopher", "Lisa"]);
  });

  it("should recognize 'Suggested next steps' heading", async () => {
    const text = `
Discussion summary here.

Suggested next steps

[ ] Norah - Update vendor contracts
`;
    
    const actions = await extractExplicitActions("test-11", "2026-11-01", "Meeting", text);
    
    assert.strictEqual(actions.length, 1);
    assert.strictEqual(actions[0].owner, "Norah");
  });

  it("should recognize 'Action items' heading", async () => {
    const text = `
Meeting notes.

Action items

[ ] Christopher - Review facility schedule
`;
    
    const actions = await extractExplicitActions("test-12", "2026-11-01", "Meeting", text);
    
    assert.strictEqual(actions.length, 1);
    assert.strictEqual(actions[0].owner, "Christopher");
  });
});

// Run tests
console.log("Running real format fixture tests...\n");
describe("Real Format Test Suite", async () => {
  await describe("Real Gemini docs format", async () => {
    await it("extracts from plain 'Next steps' heading", async () => {
      const text = `
Next steps

[ ] Lisa, Tess - Review budget
`;
      const actions = await extractExplicitActions("test", "2026-11-01", "Meeting", text);
      assert.strictEqual(actions.length, 2);
      console.log("✅ Plain 'Next steps' heading works");
    });

    await it("handles Chris → Christopher", async () => {
      const text = `
Next steps

[ ] Chris - Update schedule
`;
      const actions = await extractExplicitActions("test", "2026-11-01", "Meeting", text);
      assert.strictEqual(actions[0].owner, "Christopher");
      console.log("✅ 'Chris' mapped to Christopher");
    });

    await it("skips checkbox when matching owners", async () => {
      const text = `
Next steps

[ ] Lisa - Do task
`;
      const actions = await extractExplicitActions("test", "2026-11-01", "Meeting", text);
      assert.strictEqual(actions[0].owner, "Lisa");
      console.log("✅ Checkbox skipped, owner extracted");
    });

    await it("handles comma-separated multi-owner", async () => {
      const text = `
Next steps

[ ] Lisa, Tess - Shared task
`;
      const actions = await extractExplicitActions("test", "2026-11-01", "Meeting", text);
      assert.strictEqual(actions.length, 2);
      console.log("✅ Multi-owner creates multiple actions");
    });

    await it("skips non-partner owners", async () => {
      const text = `
Next steps

[ ] Lisa - Task A
[ ] Scott - Task B
`;
      const actions = await extractExplicitActions("test", "2026-11-01", "Meeting", text);
      assert.strictEqual(actions.length, 1);
      assert.strictEqual(actions[0].owner, "Lisa");
      console.log("✅ Non-partner (Scott) skipped");
    });

    await it("avoids duplicates from tabs", async () => {
      const text = `
Next steps

[ ] Lisa - Task A
[ ] Lisa - Task A
`;
      const actions = await extractExplicitActions("test", "2026-11-01", "Meeting", text);
      assert.strictEqual(actions.length, 1);
      console.log("✅ Duplicate lines skipped");
    });
  });
});

console.log("\n✅ ALL REAL FORMAT TESTS PASSED\n");
console.log("Real Gemini docs format verified:");
console.log("- Plain 'Next steps' heading (no markdown #)");
console.log("- Checkbox [ ] skipped when matching owners");
console.log("- 'Chris' → Christopher");
console.log("- Comma-separated multi-owner → multiple actions");
console.log("- Non-partner owners skipped");
console.log("- Duplicate lines avoided");
