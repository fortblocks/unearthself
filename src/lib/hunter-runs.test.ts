import assert from "node:assert/strict";
import test from "node:test";
import {
  HUNTER_RUN_KEEP,
  HUNTER_RUNS_KEY,
  appendHunterRun,
  hunterRunEntry,
  logHunterRunLine,
  parseHunterRun,
} from "./hunter-runs.ts";

test("the run summary logs Apollo counts without a name or an email", () => {
  const lines: string[] = [];
  const original = console.log;
  console.log = (line?: unknown) => {
    lines.push(String(line ?? ""));
  };
  try {
    logHunterRunLine({
      runId: "run-1",
      run: "always-on",
      startedAt: "2026-11-20T12:00:00.000Z",
      endedAt: "2026-11-20T12:01:00.000Z",
      passes: 1,
      calls: 3,
      funnel: null,
      cardsFiled: 2,
      spendActual: 0,
      spendEstimated: 0,
      alarms: [],
      outcome: "fired",
      apollo: { searches: 4, reveals: 2, verifiedEmails: 1, contactReady: 1, failures: { unverified: 1, "http-429": 1 } },
    });
  } finally {
    console.log = original;
  }
  const logged = JSON.parse(lines[0] ?? "{}") as { hunterRun?: { apollo?: { searches: number; reveals: number; verifiedEmails: number; contactReady: number; failures: Record<string, number> } } };
  assert.equal(logged.hunterRun?.apollo?.searches, 4);
  assert.equal(logged.hunterRun?.apollo?.reveals, 2);
  assert.equal(logged.hunterRun?.apollo?.verifiedEmails, 1);
  assert.equal(logged.hunterRun?.apollo?.contactReady, 1);
  assert.equal(logged.hunterRun?.apollo?.failures.unverified, 1);
  assert.equal(lines[0]?.includes("@"), false);
});

test("a run log entry keeps the model error and the Apollo counts", async () => {
  const entry = hunterRunEntry({
    at: "2026-11-18T15:04:00.000Z",
    run: "always-on",
    outcome: "error",
    modelCalls: 1,
    candidates: 0,
    cardsFiled: 0,
    contactReady: 0,
    apolloSearches: 0,
    apolloReveals: 0,
    error: "xAI HTTP 410: Live search is deprecated. Please switch to the Agent Tools API. Apollo off: no key",
  });
  assert.equal(entry.outcome, "error");
  assert.match(entry.error, /xAI HTTP 410/);
  assert.match(entry.error, /Apollo off: no key/);

  const stored: unknown[] = [];
  let trimmed: [number, number] | null = null;
  await appendHunterRun(entry, {
    lpush: async (key, value) => {
      assert.equal(key, HUNTER_RUNS_KEY);
      stored.unshift(value);
    },
    ltrim: async (_key, start, stop) => {
      trimmed = [start, stop];
    },
    lrange: async () => stored,
  });
  assert.deepEqual(stored[0], entry);
  assert.deepEqual(trimmed, [0, HUNTER_RUN_KEEP - 1]);
  assert.equal(HUNTER_RUN_KEEP, 90 * 24 * 60);
  assert.equal(parseHunterRun(JSON.stringify(entry))?.run, "always-on");
});
