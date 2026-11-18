import { createFileRoute } from "@tanstack/react-router";
import { readHunterDesk } from "@/lib/leads-hunter";
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
        const hunter = await readHunterDesk();
        if (hunter.paused) return Response.json({ ok: true, skipped: "paused" });
        const result = await runNightlyScout();
        return Response.json(result, { status: result.ok ? 200 : 500 });
      },
    },
  },
});
