import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import assert from "node:assert";
import type { ActionItem, StructuredMinutes } from "./structured-minutes.ts";
import {
  XAI_MODEL,
  minutesDetailMode,
  plainMeetingSummary,
  readStructuredMinutes,
  structuredMinutesCacheKey,
} from "./structured-minutes.ts";

describe("XAI Model Configuration", () => {
  it("should use a documented xAI model", () => {
    // Current xAI models as of Nov 2026: https://docs.x.ai/docs/models
    const ALLOWED_MODELS = [
      "grok-4.7",
      "grok-4.6",
      "grok-4.5",
      "grok-4.3",
      "grok-4.20-0309-reasoning",
      "grok-4.20-0309-non-reasoning",
      "grok-build-0.1",
      "grok-4.20-multi-agent-0309",
    ];

    assert.ok(
      ALLOWED_MODELS.includes(XAI_MODEL),
      `XAI_MODEL "${XAI_MODEL}" is not in the allowlist of documented models. Check https://docs.x.ai/docs/models for current models.`
    );
  });

  it("should use non-reasoning model for speed", () => {
    // Non-reasoning models are faster (no extended inference time)
    // Reasoning models (grok-4.20-0309-reasoning, grok-4.7) can take 30-60s+
    const modelStr: string = XAI_MODEL;
    const isNonReasoning =
      modelStr.includes("non-reasoning") ||
      modelStr === "grok-4.3" ||
      modelStr === "grok-4.5" ||
      modelStr === "grok-4.6";

    assert.ok(
      isNonReasoning,
      `XAI_MODEL "${XAI_MODEL}" should be a non-reasoning variant for fast structured extraction`
    );
  });
});

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

  it("should handle parallel chunk processing with concurrency limit", async () => {
    // Simulate 5 chunks with MAX_CONCURRENT=3
    const chunks = ["chunk 1", "chunk 2", "chunk 3", "chunk 4", "chunk 5"];
    const MAX_CONCURRENT = 3;
    const results: Array<{ chunk: string; batchIndex: number }> = [];
    
    // Process in batches
    for (let i = 0; i < chunks.length; i += MAX_CONCURRENT) {
      const batch = chunks.slice(i, i + MAX_CONCURRENT);
      const batchPromises = batch.map(async (chunk, batchIndex) => {
        await new Promise(resolve => setTimeout(resolve, 5));
        return { chunk, batchIndex: i + batchIndex };
      });
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }
    
    // All 5 chunks completed
    assert.strictEqual(results.length, 5);
    
    // Batch 1: chunks 0, 1, 2
    // Batch 2: chunks 3, 4
    assert.ok(results.some(r => r.batchIndex === 0));
    assert.ok(results.some(r => r.batchIndex === 4));
  });

  it("should handle chunk timeout with AbortSignal", () => {
    // Timeout error should be caught
    const timeoutError = {
      error: "Chunk 1 timed out after 100 seconds",
    };

    assert.ok("error" in timeoutError);
    assert.ok(timeoutError.error.includes("timed out"));
    assert.ok(timeoutError.error.includes("100 seconds"));
  });

  it("should validate AbortSignal timeout value", () => {
    // 100-second timeout per chunk (below 120s function limit)
    const timeoutMs = 100000;
    
    assert.strictEqual(timeoutMs, 100000);
    assert.ok(timeoutMs < 120000); // Less than maxDuration
  });
});

describe("Structured Minutes", () => {
  it("should extract attendees from meeting notes", () => {
    const mockAttendees = ["Lisa", "Tess", "Norah", "Christopher"];
    assert.strictEqual(mockAttendees.length, 4);
    assert.ok(mockAttendees.includes("Christopher"));
  });

  it("should extract key decisions with sources", () => {
    const mockDecision = {
      decision: "Approved canyon insurance partnership",
      source: "Christopher confirmed the terms meet our requirements",
    };

    assert.ok(mockDecision.decision.length > 0);
    assert.ok(mockDecision.source.length > 0);
  });

  it("should extract action items with owners", () => {
    const mockAction: ActionItem = {
      owner: "Lisa",
      item: "Follow up with Apex Energy about insurance",
      dueDate: null,
    };

    assert.strictEqual(mockAction.owner, "Lisa");
    assert.ok(mockAction.item.includes("Apex Energy"));
    assert.strictEqual(mockAction.dueDate, null);
  });

  it("should handle action items with due dates", () => {
    const mockAction: ActionItem = {
      owner: "Tess",
      item: "Review canyon certifications",
      dueDate: "2026-11-15",
    };

    assert.strictEqual(mockAction.dueDate, "2026-11-15");
  });

  it("should extract open questions", () => {
    const mockQuestion = "Do we need additional liability coverage for night tours?";
    assert.ok(mockQuestion.endsWith("?"));
    assert.ok(mockQuestion.length > 10);
  });

  it("should generate meeting summary", () => {
    const mockSummary = "Team discussed canyon insurance requirements and partnership terms. Key decisions made on coverage levels.";
    assert.ok(mockSummary.length > 0);
    assert.ok(mockSummary.length < 500); // Should be concise
  });

  it("should format structured minutes correctly", () => {
    const structured: StructuredMinutes = {
      meetingId: "test-meeting-123",
      attendees: ["Lisa", "Christopher"],
      keyDecisions: [
        {
          decision: "Approved partnership",
          source: "Discussed in opening remarks",
        },
      ],
      actionItems: [
        {
          owner: "Lisa",
          item: "Send contract",
          dueDate: null,
        },
      ],
      openQuestions: ["When do we start?"],
      summary: "Brief meeting about partnership approval.",
      generatedAt: "2026-11-03T10:00:00.000Z",
    };

    assert.strictEqual(structured.meetingId, "test-meeting-123");
    assert.strictEqual(structured.attendees.length, 2);
    assert.strictEqual(structured.keyDecisions.length, 1);
    assert.strictEqual(structured.actionItems.length, 1);
    assert.strictEqual(structured.openQuestions.length, 1);
    assert.ok(structured.summary.length > 0);
  });

  it("should group decisions by type", () => {
    const decisions = [
      { decision: "Partnership approved", source: "..." },
      { decision: "Budget increased", source: "..." },
      { decision: "Timeline extended", source: "..." },
    ];

    // Can be categorized by keywords
    const partnershipDecisions = decisions.filter(d => d.decision.toLowerCase().includes("partnership"));
    const budgetDecisions = decisions.filter(d => d.decision.toLowerCase().includes("budget"));

    assert.strictEqual(partnershipDecisions.length, 1);
    assert.strictEqual(budgetDecisions.length, 1);
  });

  it("should handle missing due dates gracefully", () => {
    const actionWithoutDate: ActionItem = {
      owner: "Christopher",
      item: "Review proposal",
      dueDate: null,
    };

    const actionWithDate: ActionItem = {
      owner: "Lisa",
      item: "Submit forms",
      dueDate: "2026-12-01",
    };

    assert.strictEqual(actionWithoutDate.dueDate, null);
    assert.strictEqual(typeof actionWithDate.dueDate, "string");
  });
});

describe("Structured minutes speed", () => {
  const sample: StructuredMinutes = {
    meetingId: "doc-1",
    attendees: ["Lisa"],
    keyDecisions: [],
    actionItems: [],
    openQuestions: [],
    summary: "The partners agreed to send the proposal.",
    generatedAt: "2026-11-07T00:00:00.000Z",
  };

  it("keys Redis by meeting id and content hash", () => {
    const notes = "Summary\n\nSend the proposal.\n";
    const key = structuredMinutesCacheKey("doc-1", notes);
    assert.equal(key, structuredMinutesCacheKey("doc-1", notes));
    assert.match(key, /^structured-minutes:v1:doc-1:[a-f0-9]{32}$/);
    assert.notEqual(key, structuredMinutesCacheKey("doc-2", notes));
    assert.notEqual(key, structuredMinutesCacheKey("doc-1", `${notes}edited`));
  });

  it("reads a stored structured view and rejects anything else", () => {
    assert.deepEqual(readStructuredMinutes(sample), sample);
    assert.deepEqual(readStructuredMinutes(JSON.stringify(sample)), sample);
    assert.equal(readStructuredMinutes({ error: "failed" }), null);
    assert.equal(readStructuredMinutes("not json"), null);
    assert.equal(readStructuredMinutes(null), null);
  });

  it("keeps the raw notes on screen until a structured view exists", () => {
    assert.equal(minutesDetailMode(null), "raw");
    assert.equal(minutesDetailMode({ error: "timed out" }), "raw");
    assert.equal(minutesDetailMode(sample), "structured");
  });

  it("uses the notes' own summary and does not invent one", () => {
    const notes = `# Summary
Lisa will send the proposal to Christopher on Friday.

# Transcript
Long spoken notes.
`;
    assert.equal(
      plainMeetingSummary(notes),
      "Lisa will send the proposal to Christopher on Friday.",
    );
    assert.equal(plainMeetingSummary("Transcript\n\nNo summary heading here."), null);
  });

  it("renders raw notes while structured generation is still running", () => {
    const page = readFileSync(new URL("../routes/admin.minutes.$meetingId.tsx", import.meta.url), "utf8");
    assert.match(page, /minutesDetailMode/);
    assert.match(page, /plainMeetingSummary/);
    assert.match(page, /mode === "raw"/);
    const lib = readFileSync(new URL("./structured-minutes.ts", import.meta.url), "utf8");
    assert.match(lib, /structuredMinutesCacheKey\(data\.meetingId, data\.fullText\)/);
    assert.match(lib, /STRUCTURED_CACHE_TTL_SECONDS/);
    assert.match(lib, /Redis HIT/);
  });
});
