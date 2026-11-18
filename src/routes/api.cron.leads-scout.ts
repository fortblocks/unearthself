import { createFileRoute } from "@tanstack/react-router";
import { apolloApiKey } from "@/lib/apollo";
import { appendHunterRun, hunterRunEntry, type HunterRunOutcome } from "@/lib/hunter-runs";
import { enrichUnderApolloCap, holdHunterForDay, recordHunterEffort } from "@/lib/leads-hunter";
import { runNightlyScout } from "@/lib/leads-scout";

/**
 * Hunter's nightly local sweep. Vercel cron hits this with Authorization: Bearer $CRON_SECRET.
 * The schedule lives in vite.config.ts, not vercel.json. The path is unchanged.
 */
export const Route = createFileRoute("/api/cron/leads-scout")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = process.env.CRON_SECRET?.trim();
        const auth = request.headers.get("authorization")?.trim();
        if (!secret || auth !== `Bearer ${secret}`) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        const gate = await holdHunterForDay();
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
            }),
          );
          return Response.json({ error: gate.error }, { status: 500 });
        }
        if (!gate.proceed) {
          const outcome: HunterRunOutcome =
            gate.skipped === "paused" ? "skipped-paused" : gate.skipped === "cards" ? "skipped-target-met" : "capped-budget";
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
            }),
          );
          return Response.json({ ok: true, skipped: gate.skipped });
        }
        const result = await runNightlyScout({
          enrich: (companies, domains, today) =>
            enrichUnderApolloCap({ companies, domains, today, limit: 15 }),
        });
        await recordHunterEffort({
          calls: result.called ? 1 : 0,
          contactReady: result.ok ? result.contactReady : 0,
          note: result.ok
            ? `Nightly sweep. Contact-ready cards this run: ${result.contactReady}.`
            : result.error,
        });
        await appendHunterRun(
          hunterRunEntry({
            run: "nightly",
            outcome: result.ok ? "fired" : "error",
            modelCalls: result.called ? 1 : 0,
            candidates: result.ok ? result.candidates : 0,
            cardsFiled: result.ok ? result.stored : 0,
            contactReady: result.ok ? result.contactReady : 0,
            apolloSearches: result.ok ? result.apolloSearches : 0,
            apolloReveals: result.ok ? result.apolloReveals : 0,
            error: result.ok ? result.apolloNote : nightlyNote(result.error),
          }),
        );
        return Response.json(result, { status: result.ok ? 200 : 500 });
      },
    },
  },
});

function nightlyNote(extra = "") {
  const off = apolloApiKey() ? "" : "Apollo off: no key";
  return [extra.trim(), off].filter(Boolean).join(" ");
}
