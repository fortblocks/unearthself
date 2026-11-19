import { createFileRoute } from "@tanstack/react-router";
import { runNightlyCron } from "@/lib/hunter-nightly";

/**
 * Hunter's nightly local sweep. Vercel cron hits this with Authorization: Bearer $CRON_SECRET.
 * The schedule lives in vite.config.ts, not vercel.json. The path is unchanged.
 */
export { runNightlyCron };

export const Route = createFileRoute("/api/cron/leads-scout")({
  server: {
    handlers: {
      GET: async ({ request }) => runNightlyCron(request),
    },
  },
});
