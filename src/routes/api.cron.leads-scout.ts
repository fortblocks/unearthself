import { createFileRoute } from "@tanstack/react-router";
import { runNightlyScout } from "@/lib/leads-scout";

/**
 * Vercel cron hits this with Authorization: Bearer $CRON_SECRET.
 * The schedule in vercel.json only runs after this branch is merged to main.
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
        const result = await runNightlyScout();
        return Response.json(result, { status: result.ok ? 200 : 500 });
      },
    },
  },
});
