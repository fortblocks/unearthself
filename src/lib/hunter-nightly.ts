import { apolloApiKey } from "./apollo.ts";
import { acquireHunterLock, releaseHunterLock } from "./hunter-lock.ts";
import { HUNTER_MODEL_ID } from "./hunter-config.ts";
import { appendHunterRun, hunterRunEntry, type HunterRunOutcome } from "./hunter-runs.ts";
import { enrichUnderApolloCap, gateNightly, loadDoNotContact, markNightlySwept, publishHunterAlarms, recordHunterEffort } from "./leads-hunter.ts";
import { dncBlocks } from "./hunter-phase.ts";
import { getRedisClient } from "./leads-book.ts";
import { edmontonToday } from "./lead-score.ts";
import { runNightlyScout } from "./leads-scout.ts";

/**
 * Nightly local sweep. The route is a thin wrapper. Vercel cron sends Authorization: Bearer $CRON_SECRET.
 */
export async function runNightlyCron(request: Request, now = new Date()) {
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
    return Response.json({ ok: true, skipped: "busy" });
  }
  try {
    const today = edmontonToday(now);
    const dnc = await loadDoNotContact(redis);
    const result = await runNightlyScout({
      now,
      skip: (row) => dncBlocks(dnc, row.domain, row.email ?? "", today),
      enrich: (companies, domains, day) => enrichUnderApolloCap({ companies, domains, today: day, limit: 15 }),
    });
    await recordHunterEffort({
      calls: 0,
      contactReady: result.ok ? result.contactReady : 0,
      note: result.ok ? `Nightly sweep. Contact-ready cards this run: ${result.contactReady}.` : result.error,
    });
    if (result.ok) await markNightlySwept(result.date);
    if (!result.ok && result.error.includes("Monthly dollar cap")) {
      await publishHunterAlarms(["Monthly dollar cap reached. Calling resumes next month."], now.toISOString(), "nightly");
    }
    await appendHunterRun(
      hunterRunEntry({
        run: "nightly",
        outcome: result.ok ? "fired" : "error",
        modelCalls: result.attempts,
        candidates: result.ok ? result.candidates : 0,
        cardsFiled: result.ok ? result.stored : 0,
        contactReady: result.ok ? result.contactReady : 0,
        apolloSearches: result.ok ? result.apolloSearches : 0,
        apolloReveals: result.ok ? result.apolloReveals : 0,
        error: result.ok ? result.apolloNote : nightlyNote(result.error),
        model: HUNTER_MODEL_ID,
      }),
    );
    return Response.json(result, { status: result.ok ? 200 : 500 });
  } finally {
    await releaseHunterLock(redis, token);
  }
}

function nightlyNote(extra = "") {
  const off = apolloApiKey() ? "" : "Apollo off: no key";
  return [extra.trim(), off].filter(Boolean).join(" ");
}
