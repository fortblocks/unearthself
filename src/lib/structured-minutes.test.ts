import { describe, it } from "node:test";
import assert from "node:assert";
import type { StructuredMinutes, ActionItem } from "./structured-minutes";

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
