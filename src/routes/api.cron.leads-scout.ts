import { createFileRoute } from "@tanstack/react-router";
import { holdHunterForDay, recordHunterEffort } from "@/lib/leads-hunter";
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
        if (!gate.ok) return Response.json({ error: gate.error }, { status: 500 });
        if (!gate.proceed) return Response.json({ ok: true, skipped: gate.skipped });
        const result = await runNightlyScout();
        await recordHunterEffort({
          calls: result.called ? 1 : 0,
          contactReady: result.ok ? result.contactReady : 0,
          note: result.ok
            ? `Nightly sweep. Contact-ready cards this run: ${result.contactReady}.`
            : result.error,
        });
        return Response.json(result, { status: result.ok ? 200 : 500 });
      },
    },
  },
});
