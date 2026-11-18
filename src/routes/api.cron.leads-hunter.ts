import { createFileRoute } from "@tanstack/react-router";
import { runHunterBatch } from "@/lib/leads-hunter";

/**
 * Vercel cron hits this with Authorization: Bearer $CRON_SECRET.
 * The schedule lives in the Nitro config in vite.config.ts.
 */
export const Route = createFileRoute("/api/cron/leads-hunter")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = process.env.CRON_SECRET?.trim();
        const auth = request.headers.get("authorization")?.trim();
        if (!secret || auth !== `Bearer ${secret}`) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        const result = await runHunterBatch();
        return Response.json(result, { status: result.ok ? 200 : 500 });
      },
    },
  },
});
