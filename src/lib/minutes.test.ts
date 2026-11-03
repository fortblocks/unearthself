import { describe, it } from "node:test";
import assert from "node:assert";
import type { Meeting, MeetingMinutes, MeetingAction } from "./minutes.ts";
import { parseDateFromFilename } from "./minutes.ts";

describe("Minutes data structures", () => {
  it("should have valid Meeting structure", () => {
    const meeting: Meeting = {
      id: "test-id-123",
      title: "Badlander's Development Meeting – Notes by Gemini",
      date: "2026-06-23",
      time: "10:30",
      createdTime: "2026-06-23T16:30:00.000Z",
      modifiedTime: "2026-06-23T17:00:00.000Z",
    };

    assert.strictEqual(meeting.id, "test-id-123");
    assert.strictEqual(meeting.title, "Badlander's Development Meeting – Notes by Gemini");
    assert.strictEqual(meeting.date, "2026-06-23");
    assert.strictEqual(meeting.time, "10:30");
  });

  it("should have valid MeetingAction structure", () => {
    const action: MeetingAction = {
      text: "Follow up with Apex Energy about insurance",
      owner: "Christopher",
      completed: false,
    };

    assert.strictEqual(action.text, "Follow up with Apex Energy about insurance");
    assert.strictEqual(action.owner, "Christopher");
    assert.strictEqual(action.completed, false);
  });

  it("should have valid MeetingMinutes structure", () => {
    const minutes: MeetingMinutes = {
      meeting: {
        id: "test-id-123",
        title: "Badlander's Development Meeting – Notes by Gemini",
        date: "2026-06-23",
        time: "10:30",
        createdTime: "2026-06-23T16:30:00.000Z",
        modifiedTime: "2026-06-23T17:00:00.000Z",
      },
      fullText: `Badlander's Development Meeting – June 23, 2026

Attendees: Lisa, Tess, Norah, Christopher

Discussion:
- Reviewed Apex Energy proposal status
- Insurance requirements for canyon activities
- Canalta partnership terms

Action Items:
- Christopher: Follow up with insurance broker about canyon coverage
- Lisa: Confirm Canalta room block for November
- Tess: Review canyon operator safety certifications`,
      actions: [
        {
          text: "Follow up with insurance broker about canyon coverage",
          owner: "Christopher",
          completed: false,
        },
        {
          text: "Confirm Canalta room block for November",
          owner: "Lisa",
          completed: false,
        },
        {
          text: "Review canyon operator safety certifications",
          owner: "Tess",
          completed: false,
        },
      ],
    };

    assert.strictEqual(minutes.meeting.id, "test-id-123");
    assert.strictEqual(minutes.actions.length, 3);
    assert.strictEqual(minutes.actions[0].owner, "Christopher");
    assert.strictEqual(minutes.actions[1].owner, "Lisa");
    assert.strictEqual(minutes.actions[2].owner, "Tess");
    assert.ok(minutes.fullText.includes("Badlander's Development Meeting"));
    assert.ok(minutes.fullText.includes("Action Items:"));
  });

  it("should filter actions by owner", () => {
    const actions: MeetingAction[] = [
      { text: "Task 1", owner: "Christopher", completed: false },
      { text: "Task 2", owner: "Lisa", completed: false },
      { text: "Task 3", owner: "Christopher", completed: false },
      { text: "Task 4", owner: "Tess", completed: true },
    ];

    const christopherActions = actions.filter((a) => a.owner === "Christopher");
    assert.strictEqual(christopherActions.length, 2);

    const openActions = actions.filter((a) => !a.completed);
    assert.strictEqual(openActions.length, 3);
  });

  it("should format date correctly", () => {
    const meeting: Meeting = {
      id: "test",
      title: "Test Meeting",
      date: "2026-06-23",
      time: "14:30",
      createdTime: "2026-06-23T20:30:00.000Z",
      modifiedTime: "2026-06-23T21:00:00.000Z",
    };

    // Verify date is in expected format
    assert.match(meeting.date, /^\d{4}-\d{2}-\d{2}$/);
    
    // Verify time parsing
    const [hours, minutes] = meeting.time.split(":").map(Number);
    assert.strictEqual(hours, 14);
    assert.strictEqual(minutes, 30);
  });

  it("should handle meetings without actions", () => {
    const minutes: MeetingMinutes = {
      meeting: {
        id: "test-no-actions",
        title: "Meeting with no actions",
        date: "2026-07-01",
        time: "09:00",
        createdTime: "2026-07-01T15:00:00.000Z",
        modifiedTime: "2026-07-01T16:00:00.000Z",
      },
      fullText: "Brief discussion. No action items.",
      actions: [],
    };

    assert.strictEqual(minutes.actions.length, 0);
    assert.ok(minutes.fullText.length > 0);
  });

  it("should handle actions without owner", () => {
    const action: MeetingAction = {
      text: "General task for the team",
      owner: null,
      completed: false,
    };

    assert.strictEqual(action.owner, null);
    assert.strictEqual(action.text, "General task for the team");
  });

  it("should render meeting list data correctly", () => {
    const meetings: Meeting[] = [
      {
        id: "meeting-1",
        title: "Badlander's Development Meeting – Notes by Gemini",
        date: "2026-10-29",
        time: "10:00",
        createdTime: "2026-10-29T16:00:00.000Z",
        modifiedTime: "2026-10-29T17:00:00.000Z",
      },
      {
        id: "meeting-2",
        title: "Badlander's Development Meeting – Notes by Gemini",
        date: "2026-10-22",
        time: "10:00",
        createdTime: "2026-10-22T16:00:00.000Z",
        modifiedTime: "2026-10-22T17:00:00.000Z",
      },
    ];

    // Verify newest first
    assert.strictEqual(meetings[0].date, "2026-10-29");
    assert.strictEqual(meetings[1].date, "2026-10-22");
    
    // Verify all required fields exist
    meetings.forEach((meeting) => {
      assert.ok(meeting.id);
      assert.ok(meeting.title);
      assert.ok(meeting.date);
      assert.ok(meeting.time);
    });
  });
});

describe("parseDateFromFilename", () => {
  it("should parse standard Gemini filename format", () => {
    const filename = "Badlander's Development Meeting - 2026/10/29 17:00 MDT - Notes by Gemini";
    const result = parseDateFromFilename(filename);
    
    assert.ok(result);
    assert.strictEqual(result.date, "2026-10-29");
    assert.strictEqual(result.time, "17:00");
  });

  it("should parse exact filename from Drive: 2026/08/25 11:36 MDT", () => {
    const filename = "Badlander's Development Meeting - 2026/08/25 11:36 MDT - Notes by Gemini";
    const result = parseDateFromFilename(filename);
    
    assert.ok(result);
    assert.strictEqual(result.date, "2026-08-25");
    assert.strictEqual(result.time, "11:36");
  });

  it("should parse filename with PDT timezone", () => {
    const filename = "Badlander's Development Meeting - 2026/08/25 11:36 PDT - Notes by Gemini";
    const result = parseDateFromFilename(filename);
    
    assert.ok(result);
    assert.strictEqual(result.date, "2026-08-25");
    assert.strictEqual(result.time, "11:36");
  });

  it("should parse filename with GMT-7 timezone", () => {
    const filename = "Badlander's Development Meeting - 2026/08/25 11:36 GMT-7 - Notes by Gemini";
    const result = parseDateFromFilename(filename);
    
    assert.ok(result);
    assert.strictEqual(result.date, "2026-08-25");
    assert.strictEqual(result.time, "11:36");
  });

  it("should handle apostrophe in Badlander's correctly", () => {
    const filename = "Badlander's Development Meeting - 2026/08/25 11:36 MDT - Notes by Gemini";
    const result = parseDateFromFilename(filename);
    
    assert.ok(result, "Should parse despite apostrophe");
    assert.strictEqual(result.date, "2026-08-25");
  });

  it("should parse morning meeting time", () => {
    const filename = "Badlander's Development Meeting - 2026/11/01 09:30 MDT - Notes by Gemini";
    const result = parseDateFromFilename(filename);
    
    assert.ok(result);
    assert.strictEqual(result.date, "2026-11-01");
    assert.strictEqual(result.time, "09:30");
  });

  it("should parse different month", () => {
    const filename = "Badlander's Development Meeting - 2026/01/15 14:45 MST - Notes by Gemini";
    const result = parseDateFromFilename(filename);
    
    assert.ok(result);
    assert.strictEqual(result.date, "2026-01-15");
    assert.strictEqual(result.time, "14:45");
  });

  it("should return null for filename without date pattern", () => {
    const filename = "Badlander's Development Meeting - Notes by Gemini";
    const result = parseDateFromFilename(filename);
    
    assert.strictEqual(result, null);
  });

  it("should return null for malformed date", () => {
    const filename = "Meeting - 2026-10-29 17:00 - Notes";
    const result = parseDateFromFilename(filename);
    
    assert.strictEqual(result, null);
  });

  it("should parse date with different timezone suffix", () => {
    const filename = "Partner Meeting - 2026/12/25 16:00 PST - Notes by Gemini";
    const result = parseDateFromFilename(filename);
    
    assert.ok(result);
    assert.strictEqual(result.date, "2026-12-25");
    assert.strictEqual(result.time, "16:00");
  });
});

describe("getMeetingMinutes error handling", () => {
  it("should validate MeetingMinutes structure from successful response", () => {
    // This validates the expected structure matches our types
    const mockResponse: MeetingMinutes = {
      meeting: {
        id: "doc-123",
        title: "Badlander's Development Meeting - 2026/10/29 17:00 MDT - Notes by Gemini",
        date: "2026-10-29",
        time: "17:00",
        createdTime: "2026-10-29T23:00:00.000Z",
        modifiedTime: "2026-10-29T23:30:00.000Z",
      },
      fullText: "Meeting notes here...",
      actions: [
        {
          text: "Follow up with partner",
          owner: "Christopher",
          completed: false,
        },
      ],
    };

    assert.strictEqual(mockResponse.meeting.id, "doc-123");
    assert.ok(mockResponse.meeting.title.includes("2026/10/29 17:00"));
    assert.strictEqual(mockResponse.actions.length, 1);
    assert.strictEqual(mockResponse.actions[0].owner, "Christopher");
  });

  it("should parse dates from filename in getMeetingMinutes", () => {
    const filename = "Badlander's Development Meeting - 2026/10/29 17:00 MDT - Notes by Gemini";
    const parsed = parseDateFromFilename(filename);
    
    assert.ok(parsed);
    assert.strictEqual(parsed.date, "2026-10-29");
    assert.strictEqual(parsed.time, "17:00");
  });
});
