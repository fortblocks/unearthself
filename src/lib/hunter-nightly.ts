import { HUNTER_MODEL_ID } from "./hunter-config.ts";
import { appendHunterRun, hunterRunEntry, logHunterRunLine } from "./hunter-runs.ts";

/**
 * The nightly sweep stopped on 20th November 2026.
 * The route stays so an old schedule cannot start a search. It does not search.
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

export async function runNightlyCron(request: Request, _now = new Date()) {
  const startedAt = new Date().toISOString();
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization")?.trim();
  if (!secret || auth !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  await appendHunterRun(
    hunterRunEntry({
      run: "nightly",
      outcome: "stopped-sweep",
      modelCalls: 0,
      candidates: 0,
      cardsFiled: 0,
      contactReady: 0,
      apolloSearches: 0,
      apolloReveals: 0,
      error: "Nightly sweep stopped on 20th November 2026. It is not part of the campaign.",
      model: HUNTER_MODEL_ID,
    }),
  );
  logNightly("stopped-sweep", startedAt);
  return Response.json({ ok: true, stopped: true });
}
