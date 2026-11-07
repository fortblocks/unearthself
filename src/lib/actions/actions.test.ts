/**
 * Open-actions view, fixture parser, and route loader guards.
 * Imports production modules. Does not copy the extractor.
 */

import { readFileSync } from "node:fs";
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { buildFixtureActionsBundle } from "./fixture.ts";
import { searchRequestsFixture } from "./dev-fixture.ts";
import { ActionsTimeoutError, loadWithTimeout } from "./timeout.ts";
import { contextSentenceFromDetail, CONTEXT_WORD_LIMIT } from "./context.ts";
import { extractExplicitActions } from "../action-tracking.ts";
import {
  actionRowExpansion,
  bundleFromExtraction,
  formatCompletedWhen,
  groupOpenActions,
  openListState,
  splitByCompletion,
  toggleExpandedIds,
} from "./view.ts";
import type { ExtractionResult } from "../action-tracking.ts";

test("dev fixture query is explicit", () => {
  assert.equal(searchRequestsFixture("?fixture=sample"), true);
  assert.equal(searchRequestsFixture("fixture=sample"), true);
  assert.equal(searchRequestsFixture("?fixture=live"), false);
  assert.equal(searchRequestsFixture(""), false);
});

test("unknown and failed extracts are not an empty action list", () => {
  assert.equal(
    openListState({ outcome: "unknown", actionCount: 0, openCount: 0, completionsKnown: true }),
    "unknown",
  );
  assert.equal(
    openListState({ outcome: "error", actionCount: 0, openCount: 0, completionsKnown: true }),
    "error",
  );
  assert.equal(
    openListState({ outcome: "ok", actionCount: 0, openCount: 0, completionsKnown: true }),
    "empty",
  );
  assert.equal(
    openListState({ outcome: "error", actionCount: 2, openCount: 2, completionsKnown: true }),
    "list",
  );
});

test("missing pipeline outcome treats zero meetings as unknown", () => {
  const result: ExtractionResult = {
    actions: [],
    diagnostic: {
      cacheHit: false,
      meetingsProcessed: 0,
      meetingsFailed: 0,
      latestMeetingDate: null,
      errors: [],
    },
  };
  const bundle = bundleFromExtraction(result, [], false, "live");
  assert.equal(bundle.outcome, "unknown");
  assert.match(bundle.message ?? "", /not a list of zero actions/i);
});

test("ten most recent open actions per person, then show more", () => {
  const actions = Array.from({ length: 12 }, (_, i) => ({
    id: `a-${i}`,
    meetingId: `m-${i}`,
    meetingDate: `2026-10-${String(i + 1).padStart(2, "0")}`,
    meetingTitle: "Development meeting",
    text: `Action ${i}`,
    owner: "Lisa" as const,
    excerpt: "Action",
  }));
  const first = groupOpenActions(actions, "Lisa", {});
  assert.equal(first[0].visible.length, 10);
  assert.equal(first[0].remaining, 2);
  assert.equal(first[0].visible[0].meetingDate, "2026-10-12");
  const more = groupOpenActions(actions, "Lisa", { Lisa: 20 });
  assert.equal(more[0].visible.length, 12);
  assert.equal(more[0].remaining, 0);
});

test("completed actions leave the open list and keep who finished them", () => {
  const actions = [
    {
      id: "done",
      meetingId: "m1",
      meetingDate: "2026-10-29",
      meetingTitle: "Development meeting",
      text: "Send the note",
      owner: "Tess" as const,
      excerpt: "Send the note",
    },
    {
      id: "open",
      meetingId: "m2",
      meetingDate: "2026-10-22",
      meetingTitle: "Development meeting",
      text: "Book the room",
      owner: "Tess" as const,
      excerpt: "Book the room",
    },
  ];
  const split = splitByCompletion(actions, [
    { actionId: "done", completedBy: "Norah", completedAt: "2026-10-02T18:30:00.000Z" },
  ]);
  assert.equal(split.open.length, 1);
  assert.equal(split.open[0].id, "open");
  assert.equal(split.completed[0].completion.completedBy, "Norah");
  const when = formatCompletedWhen("2026-10-02T18:30:00.000Z", new Date("2026-11-06T12:00:00Z"));
  assert.match(when, /2nd October/);
  assert.doesNotMatch(when, /2025/);
  assert.match(when, /pm|am/);
});

test("all filter keeps each partner's own page", () => {
  const actions = [
    {
      id: "l",
      meetingId: "m",
      meetingDate: "2026-10-29",
      meetingTitle: "Development meeting",
      text: "Lisa task",
      owner: "Lisa" as const,
      excerpt: "Lisa task",
    },
    {
      id: "c",
      meetingId: "m",
      meetingDate: "2026-10-28",
      meetingTitle: "Development meeting",
      text: "Christopher task",
      owner: "Christopher" as const,
      excerpt: "Christopher task",
    },
  ];
  const groups = groupOpenActions(actions, "All", {}).filter((group) => group.total > 0);
  assert.deepEqual(
    groups.map((group) => group.owner),
    ["Lisa", "Christopher"],
  );
});

test("fixture bundle is parsed by the production extractor", async () => {
  delete process.env.XAI_API_KEY;
  const bundle = await buildFixtureActionsBundle();
  assert.equal(bundle.mode, "sample");
  assert.equal(bundle.outcome, "ok");
  const lisa = bundle.actions.filter((action) => action.owner === "Lisa");
  assert.equal(lisa.length, 12);
  assert.ok(lisa.every((action) => action.text.includes("Email Proposal")));
  assert.equal(bundle.actions.some((action) => action.owner === "Norah"), true);
  assert.equal(bundle.actions.some((action) => action.text.toLowerCase().includes("interlocutor")), false);
  const split = splitByCompletion(bundle.actions, bundle.completions);
  const openLisa = split.open.filter((action) => action.owner === "Lisa");
  assert.equal(openLisa.length, 11);
  assert.equal(split.completed.length, 1);
  assert.equal(split.completed[0].completion.completedBy, "Tess");
  const page = groupOpenActions(openLisa, "Lisa", {});
  assert.equal(page[0].visible.length, 10);
  assert.equal(page[0].remaining, 1);
});

test("action load times out instead of hanging", async () => {
  await assert.rejects(
    () => loadWithTimeout(() => new Promise(() => {}), 30),
    (error: unknown) => error instanceof ActionsTimeoutError,
  );
});

test("action rows start collapsed and toggle open in place", () => {
  const action = {
    id: "fixture-2026-10-29:abc:Lisa",
    text: "Send email proposal",
    context: "Send the updated proposal to the client by Friday.",
  };
  const collapsed = actionRowExpansion(action, new Set());
  assert.equal(collapsed.expanded, false);
  assert.equal(collapsed.control.type, "button");
  assert.equal(collapsed.control["aria-expanded"], false);
  assert.equal(collapsed.control["aria-controls"], collapsed.panelId);
  assert.equal(collapsed.title, "Send email proposal");
  assert.equal(collapsed.sentence, null);
  assert.equal(collapsed.meetingFallback, false);

  const opened = toggleExpandedIds(new Set(), action.id);
  const expanded = actionRowExpansion(action, opened);
  assert.equal(expanded.expanded, true);
  assert.equal(expanded.control["aria-expanded"], true);
  assert.equal(expanded.sentence, "Send the updated proposal to the client by Friday.");
  assert.equal(expanded.meetingFallback, false);
  assert.equal(expanded.title, action.text);

  const closed = toggleExpandedIds(opened, action.id);
  assert.equal(closed.has(action.id), false);
  const other = toggleExpandedIds(opened, "other-action");
  assert.equal(other.has(action.id), true);
  assert.equal(other.has("other-action"), true);
});

test("expanded action without a source sentence cites the meeting", () => {
  const action = {
    id: "m1:line:Tess",
    text: "Inform Scott",
  };
  const expanded = actionRowExpansion(action, new Set([action.id]));
  assert.equal(expanded.sentence, null);
  assert.equal(expanded.meetingFallback, true);
  assert.equal(expanded.title, "Inform Scott");
  const blank = actionRowExpansion({ ...action, context: "   " }, new Set([action.id]));
  assert.equal(blank.sentence, null);
  assert.equal(blank.meetingFallback, true);
});

test("context sentence comes from the action detail and is not invented", () => {
  assert.equal(
    contextSentenceFromDetail("Send the updated proposal to Lisa Hamilton and Chris by Friday."),
    "Send the updated proposal to Lisa and Christopher by Friday.",
  );
  assert.equal(contextSentenceFromDetail(""), undefined);
  assert.equal(contextSentenceFromDetail("   "), undefined);
  const long = Array.from({ length: CONTEXT_WORD_LIMIT + 8 }, (_, i) => `word${i}`).join(" ");
  const capped = contextSentenceFromDetail(long);
  assert.ok(capped);
  assert.equal(capped.split(/\s+/).length, CONTEXT_WORD_LIMIT);
  assert.match(capped, /^word0\b/);
  assert.match(capped, /\.$/);
  assert.equal(capped.includes("word25"), false);
});

test("extraction stores one source sentence and omits context when the line has no detail", async () => {
  delete process.env.XAI_API_KEY;
  const text = `
Next steps

☐ [Lisa Hamilton] Email Proposal: Send the updated proposal to Lisa Hamilton and Chris by Friday.
☐ [Tess] Inform Scott about the door move

Details
`;
  const actions = await extractExplicitActions("m-1", "2026-10-29", "Development meeting", text);
  const lisa = actions.find((action) => action.owner === "Lisa");
  const tess = actions.find((action) => action.owner === "Tess");
  assert.ok(lisa);
  assert.equal(lisa.text, "Email Proposal");
  assert.equal(lisa.context, "Send the updated proposal to Lisa and Christopher by Friday.");
  assert.ok(tess);
  assert.equal(tess.text, "Inform Scott about the door move");
  assert.equal(tess.context, undefined);
  const collapsed = actionRowExpansion(lisa, new Set());
  assert.equal(collapsed.sentence, null);
  const opened = actionRowExpansion(lisa, new Set([lisa.id]));
  assert.equal(opened.sentence, lisa.context);
  const tessOpen = actionRowExpansion(tess, new Set([tess.id]));
  assert.equal(tessOpen.sentence, null);
  assert.equal(tessOpen.meetingFallback, true);
});

test("admin loaders do not await action extraction", () => {
  const minutes = readFileSync(new URL("../../routes/admin.minutes.index.tsx", import.meta.url), "utf8");
  const today = readFileSync(new URL("../../routes/admin.index.tsx", import.meta.url), "utf8");
  assert.equal(minutes.includes("extractAllActions"), false);
  assert.equal(today.includes("extractAllActions"), false);
  const minutesLoader = minutes.slice(minutes.indexOf("loader:"), minutes.indexOf("pendingComponent"));
  assert.equal(minutesLoader.includes("extractAllActions"), false);
  assert.match(minutesLoader, /fetchMeetingList/);
  const minutesSource = readFileSync(new URL("../today/sources/minutes.ts", import.meta.url), "utf8");
  assert.match(minutesSource, /listMeetings/);
});
