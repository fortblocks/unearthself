import { apolloApiKey } from "./apollo.ts";
import { acquireHunterLock, releaseHunterLock } from "./hunter-lock.ts";
import { HUNTER_MODEL_ID } from "./hunter-config.ts";
import { appendHunterRun, clearRunStarted, hunterRunEntry, logHunterRunLine, markRunStarted, readUnfinishedRun, type HunterRunOutcome } from "./hunter-runs.ts";
import { enrichUnderApolloCap, gateNightly, loadDoNotContact, markNightlySwept, publishHunterAlarms, recordHunterEffort } from "./leads-hunter.ts";
import { dncBlocks, makeRunClock } from "./hunter-phase.ts";
import { getRedisClient } from "./leads-book.ts";
import { edmontonToday } from "./lead-score.ts";
import { runNightlyScout } from "./leads-scout.ts";

/**
 * Nightly local sweep. The route is a thin wrapper. Vercel cron sends Authorization: Bearer $CRON_SECRET.
 */
function logNightly(outcome: string, startedAt: string) {
  logHunterRunLine({
    runId: "nightly",
    run: "nightly",
    startedAt,
    endedAt: new Date().toISOString(),
    passes: 0,
    calls: 0,
    funnel: null,
    cardsFiled: 0,
    spendActual: 0,
    spendEstimated: 0,
    alarms: [],
    outcome,
  });
}

export async function runNightlyCron(request: Request, now = new Date()) {
  const startedAt = now.toISOString();
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization")?.trim();
  if (!secret || auth !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const gate = await gateNightly(now);
  if (!gate.ok) {
    await appendHunterRun(
      hunterRunEntry({
        run: "nightly",
        outcome: "error",
        modelCalls: 0,
        candidates: 0,
        cardsFiled: 0,
        contactReady: 0,
        apolloSearches: 0,
        apolloReveals: 0,
        error: nightlyNote(gate.error),
        model: HUNTER_MODEL_ID,
      }),
    );
    logNightly("error", startedAt);
    return Response.json({ error: gate.error }, { status: 500 });
  }
  if (!gate.proceed) {
    const outcome: HunterRunOutcome =
      gate.skipped === "paused"
        ? "skipped-paused"
        : gate.skipped === "cards"
          ? "skipped-target-met"
          : gate.skipped === "killed"
            ? "skipped-killed"
            : gate.skipped === "not-4am"
              ? "skipped-not-4am"
              : gate.skipped === "already-swept"
                ? "skipped-already-swept"
                : "capped-budget";
    await appendHunterRun(
      hunterRunEntry({
        run: "nightly",
        outcome,
        modelCalls: 0,
        candidates: 0,
        cardsFiled: 0,
        contactReady: 0,
        apolloSearches: 0,
        apolloReveals: 0,
        error: nightlyNote(),
        model: HUNTER_MODEL_ID,
      }),
    );
    logNightly(outcome, startedAt);
    return Response.json({ ok: true, skipped: gate.skipped });
  }
  const redis = await getRedisClient();
  if (!redis) return Response.json({ error: "Redis is not configured" }, { status: 500 });
  const token = crypto.randomUUID();
  const gotLock = await acquireHunterLock(redis, token);
  if (!gotLock) {
    await appendHunterRun(
      hunterRunEntry({
        run: "nightly",
        outcome: "skipped-busy",
        modelCalls: 0,
        candidates: 0,
        cardsFiled: 0,
        contactReady: 0,
        apolloSearches: 0,
        apolloReveals: 0,
        error: nightlyNote(),
        model: HUNTER_MODEL_ID,
      }),
    );
    logNightly("skipped-busy", startedAt);
    return Response.json({ ok: true, skipped: "busy" });
  }
  const runClock = makeRunClock(() => Date.now());
  try {
    const unfinished = await readUnfinishedRun();
    if (unfinished && unfinished.id !== token) {
      await publishHunterAlarms(["A previous run started and never finished."], now.toISOString(), "nightly");
      await clearRunStarted(unfinished.id);
    }
    await markRunStarted("nightly", token, startedAt);
    const today = edmontonToday(now);
    const dnc = await loadDoNotContact(redis);
    const result = await runNightlyScout({
      now,
      timeLeft: () => runClock.clip(90_000),
      skip: (row) => dncBlocks(dnc, row.domain, row.email ?? "", today),
      enrich: (companies, domains, day) =>
        enrichUnderApolloCap({ companies, domains, today: day, limit: 15, timeLeft: () => runClock.clip(20_000) }),
    });
    await recordHunterEffort({
      calls: 0,
      contactReady: result.ok ? result.contactReady : 0,
      note: result.ok ? `Nightly sweep. Contact-ready cards this run: ${result.contactReady}.` : result.error,
    });
    if (result.ok) await markNightlySwept(result.date);
    const alarms: string[] = [];
    if (!result.ok && result.error.includes("Monthly dollar cap")) alarms.push("Monthly dollar cap reached. Calling resumes next month.");
    if (!result.ok && /xAI|search failed|Stopped for time/i.test(result.error) && !result.error.includes("Monthly dollar cap")) {
      alarms.push(result.timedOut || result.error.includes("Stopped for time") ? "Stopped early for time." : "xAI search failed.");
    }
    if (result.ok && result.apolloFailed) alarms.push("Apollo request failed.");
    if (result.ok && result.timedOut) alarms.push("Stopped early for time.");
    if (alarms.length) await publishHunterAlarms(alarms, now.toISOString(), "nightly");
    const outcome = result.ok ? (result.timedOut ? "stopped-time" : "fired") : result.timedOut ? "stopped-time" : "error";
    await appendHunterRun(
      hunterRunEntry({
        run: "nightly",
        outcome,
        modelCalls: result.attempts,
        candidates: result.ok ? result.candidates : 0,
        cardsFiled: result.ok ? result.stored : 0,
        contactReady: result.ok ? result.contactReady : 0,
        apolloSearches: result.ok ? result.apolloSearches : 0,
        apolloReveals: result.ok ? result.apolloReveals : 0,
        error: result.ok ? result.apolloNote : nightlyNote(result.error),
        model: HUNTER_MODEL_ID,
        alarms,
        dollars: result.ok ? result.dollars : null,
        estimatedDollars: result.ok ? result.estimatedDollars : 0,
      }),
    );
    logHunterRunLine({
      runId: token,
      run: "nightly",
      startedAt,
      endedAt: new Date().toISOString(),
      passes: result.attempts,
      calls: result.attempts,
      funnel: null,
      cardsFiled: result.ok ? result.stored : 0,
      spendActual: result.ok && result.dollars != null ? result.dollars : 0,
      spendEstimated: result.ok ? result.estimatedDollars : 0,
      alarms,
      outcome,
    });
    return Response.json(result, { status: result.ok ? 200 : 500 });
  } catch (error) {
    const alarms = ["Nightly run crashed."];
    await publishHunterAlarms(alarms, now.toISOString(), "nightly");
    await appendHunterRun(
      hunterRunEntry({
        run: "nightly",
        outcome: "error",
        modelCalls: 0,
        candidates: 0,
        cardsFiled: 0,
        contactReady: 0,
        apolloSearches: 0,
        apolloReveals: 0,
        error: nightlyNote("Nightly run crashed."),
        model: HUNTER_MODEL_ID,
        alarms,
      }),
    );
    logHunterRunLine({
      runId: token,
      run: "nightly",
      startedAt,
      endedAt: new Date().toISOString(),
      passes: 0,
      calls: 0,
      funnel: null,
      cardsFiled: 0,
      spendActual: 0,
      spendEstimated: 0,
      alarms,
      outcome: "error",
    });
    void error;
    return Response.json({ error: "Nightly run crashed." }, { status: 500 });
  } finally {
    await clearRunStarted(token);
    await releaseHunterLock(redis, token);
  }
}

function nightlyNote(extra = "") {
  const off = apolloApiKey() ? "" : "Apollo off: no key";
  return [extra.trim(), off].filter(Boolean).join(" ");
}
