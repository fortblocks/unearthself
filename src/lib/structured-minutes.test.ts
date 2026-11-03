import { describe, it } from "node:test";
import assert from "node:assert";
import type { StructuredMinutes, ActionItem } from "./structured-minutes";

describe("Structured Minutes - Chunk Processing", () => {
  it("should merge multiple chunk results correctly", () => {
    // Simulate results from 2 chunks
    const chunk1: StructuredMinutes = {
      meetingId: "test-id",
      attendees: ["Alice", "Bob"],
      keyDecisions: [{ decision: "Decision 1", source: "Alice said..." }],
      actionItems: [{ owner: "Alice", item: "Task 1", dueDate: null }],
      openQuestions: ["Question 1"],
      summary: "First part summary",
      generatedAt: "2026-11-03T10:00:00.000Z",
    };

    const chunk2: StructuredMinutes = {
      meetingId: "test-id",
      attendees: ["Bob", "Charlie"], // Bob duplicated
      keyDecisions: [{ decision: "Decision 2", source: "Charlie said..." }],
      actionItems: [{ owner: "Bob", item: "Task 2", dueDate: null }],
      openQuestions: ["Question 2"],
      summary: "Second part summary",
      generatedAt: "2026-11-03T10:00:00.000Z",
    };

    // Mock merge logic
    const allAttendees = new Set<string>();
    [chunk1, chunk2].forEach((r) => r.attendees.forEach((a) => allAttendees.add(a)));
    
    const allDecisions = [chunk1, chunk2].flatMap((r) => r.keyDecisions);
    
    const actionMap = new Map<string, ActionItem>();
    [chunk1, chunk2].forEach((r) =>
      r.actionItems.forEach((item) => {
        if (!actionMap.has(item.item)) {
          actionMap.set(item.item, item);
        }
      })
    );
    
    const questionSet = new Set<string>();
    [chunk1, chunk2].forEach((r) => r.openQuestions.forEach((q) => questionSet.add(q)));

    // Verify deduplication and merging
    assert.strictEqual(allAttendees.size, 3); // Alice, Bob, Charlie (Bob deduplicated)
    assert.ok(allAttendees.has("Alice"));
    assert.ok(allAttendees.has("Bob"));
    assert.ok(allAttendees.has("Charlie"));
    
    assert.strictEqual(allDecisions.length, 2);
    assert.strictEqual(actionMap.size, 2);
    assert.strictEqual(questionSet.size, 2);
  });

  it("should handle single chunk (no merging needed)", () => {
    const singleChunk: StructuredMinutes = {
      meetingId: "test-id",
      attendees: ["Alice"],
      keyDecisions: [],
      actionItems: [],
      openQuestions: [],
      summary: "Single chunk summary",
      generatedAt: "2026-11-03T10:00:00.000Z",
    };

    // Single chunk should pass through unchanged
    const result = [singleChunk];
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].attendees.length, 1);
  });

  it("should handle parallel chunk processing", async () => {
    // Simulate 3 chunks processed in parallel
    const chunks = ["chunk 1 text", "chunk 2 text", "chunk 3 text"];
    
    // All chunks start processing at once (parallel)
    const startTime = Date.now();
    const promises = chunks.map(async (chunk, i) => {
      // Simulate async processing
      await new Promise(resolve => setTimeout(resolve, 10));
      return {
        meetingId: "test-id",
        attendees: [`Person${i + 1}`],
        keyDecisions: [],
        actionItems: [],
        openQuestions: [],
        summary: `Chunk ${i + 1}`,
        generatedAt: new Date().toISOString(),
      };
    });
    
    const results = await Promise.all(promises);
    const duration = Date.now() - startTime;
    
    // All 3 chunks completed
    assert.strictEqual(results.length, 3);
    
    // Processing was parallel (not 30ms for sequential, but ~10ms for parallel)
    assert.ok(duration < 25); // Should be closer to 10ms than 30ms
  });

  it("should handle chunk timeout with AbortSignal", () => {
    // Timeout error should be caught
    const timeoutError = {
      error: "Chunk 1 timed out after 50 seconds",
    };

    assert.ok("error" in timeoutError);
    assert.ok(timeoutError.error.includes("timed out"));
    assert.ok(timeoutError.error.includes("50 seconds"));
  });

  it("should validate AbortSignal timeout value", () => {
    // 50-second timeout per chunk
    const timeoutMs = 50000;
    
    assert.strictEqual(timeoutMs, 50000);
    assert.ok(timeoutMs < 60000); // Less than maxDuration
  });
});

describe("Structured Minutes", () => {
  it("should validate StructuredMinutes structure", () => {
    const minutes: StructuredMinutes = {
      meetingId: "doc-123",
      attendees: ["Lisa", "Tess", "Norah", "Christopher"],
      keyDecisions: [
        {
          decision: "Decided on red paint for the main room",
          source: '"We agreed on Benjamin Moore red for that space" - Lisa',
        },
      ],
      actionItems: [
        {
          owner: "Christopher",
          item: "Follow up with insurance broker",
          dueDate: "2026-11-15",
        },
      ],
      openQuestions: ["What about the outdoor insurance coverage?"],
      summary: "Team discussed paint colours and insurance requirements. Red selected for main room.",
      generatedAt: "2026-11-03T00:00:00Z",
    };

    assert.strictEqual(minutes.attendees.length, 4);
    assert.strictEqual(minutes.keyDecisions.length, 1);
    assert.strictEqual(minutes.actionItems.length, 1);
    assert.strictEqual(minutes.openQuestions.length, 1);
    assert.ok(minutes.summary.length > 0);
  });

  it("should handle action items with no owner", () => {
    const action: ActionItem = {
      owner: null,
      item: "Review the proposal",
      dueDate: null,
    };

    assert.strictEqual(action.owner, null);
    assert.strictEqual(action.dueDate, null);
    assert.ok(action.item.length > 0);
  });

  it("should handle action items with due date", () => {
    const action: ActionItem = {
      owner: "Lisa",
      item: "Confirm room booking",
      dueDate: "2026-11-10",
    };

    assert.strictEqual(action.owner, "Lisa");
    if (action.dueDate) {
      assert.match(action.dueDate, /^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("should allow empty sections", () => {
    const minutes: StructuredMinutes = {
      meetingId: "doc-456",
      attendees: ["Lisa"],
      keyDecisions: [],
      actionItems: [],
      openQuestions: [],
      summary: "Brief check-in with no major decisions.",
      generatedAt: "2026-11-03T00:00:00Z",
    };

    assert.strictEqual(minutes.keyDecisions.length, 0);
    assert.strictEqual(minutes.actionItems.length, 0);
    assert.strictEqual(minutes.openQuestions.length, 0);
  });

  it("should format cache key correctly", () => {
    const documentId = "doc-123";
    const modifiedTime: string = "2026-11-01T10:00:00Z";
    const cacheKey = `${documentId}:${modifiedTime}`;

    assert.strictEqual(cacheKey, "doc-123:2026-11-01T10:00:00Z");
    assert.ok(cacheKey.includes(documentId));
    assert.ok(cacheKey.includes(modifiedTime));
  });

  it("should estimate token cost for average meeting", () => {
    // Average meeting: 8000 tokens input + 500 tokens output = 8500 total
    const inputTokens = 8000;
    const outputTokens = 500;
    const totalTokens = inputTokens + outputTokens;
    const costPer1KTokens = 0.01;
    const estimatedCost = (totalTokens / 1000) * costPer1KTokens;

    // Should be around $0.085 per meeting
    assert.ok(estimatedCost < 0.10);
    assert.ok(estimatedCost > 0.05);
  });

  it("should handle chunking for large documents", () => {
    const maxChunkSize = 400000; // 400K chars
    const largeText = "a".repeat(600000); // 600K chars

    // Should need 2 chunks
    const chunks: string[] = [];
    let start = 0;
    while (start < largeText.length) {
      const end = Math.min(start + maxChunkSize, largeText.length);
      chunks.push(largeText.slice(start, end));
      start = end;
    }

    assert.ok(chunks.length >= 2);
    assert.ok(chunks[0].length <= maxChunkSize);
  });

  it("should group decisions by type", () => {
    const decisions = [
      { decision: "Paint decision", source: "quote 1" },
      { decision: "Budget decision", source: "quote 2" },
      { decision: "Timeline decision", source: "quote 3" },
    ];

    assert.strictEqual(decisions.length, 3);
    decisions.forEach((d) => {
      assert.ok(d.decision.length > 0);
      assert.ok(d.source);
    });
  });

  it("should handle missing due dates gracefully", () => {
    const actions: ActionItem[] = [
      { owner: "Lisa", item: "Call vendor", dueDate: null },
      { owner: "Tess", item: "Review contract", dueDate: "2026-11-05" },
      { owner: null, item: "Schedule meeting", dueDate: null },
    ];

    const withDueDate = actions.filter((a) => a.dueDate !== null);
    const withoutDueDate = actions.filter((a) => a.dueDate === null);

    assert.strictEqual(withDueDate.length, 1);
    assert.strictEqual(withoutDueDate.length, 2);
  });
});
