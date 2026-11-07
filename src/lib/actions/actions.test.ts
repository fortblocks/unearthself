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
import {
  bundleFromExtraction,
  formatCompletedWhen,
  groupOpenActions,
  openListState,
  splitByCompletion,
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

test("admin loaders do not await action extraction", () => {
  const minutes = readFileSync(new URL("../../routes/admin.minutes.index.tsx", import.meta.url), "utf8");
  const today = readFileSync(new URL("../../routes/admin.index.tsx", import.meta.url), "utf8");
  assert.equal(minutes.includes("extractAllActions"), false);
  assert.equal(today.includes("extractAllActions"), false);
  assert.match(minutes, /await listMeetings\(\)/);
  const minutesLoader = minutes.slice(minutes.indexOf("loader:"), minutes.indexOf("pendingComponent"));
  assert.equal(minutesLoader.includes("extractAllActions"), false);
  assert.match(minutesLoader, /listMeetings/);
});
