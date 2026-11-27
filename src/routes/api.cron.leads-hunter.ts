import { createFileRoute } from "@tanstack/react-router";
import { predraftFiledLeads } from "@/lib/coco-predraft";
import { clearLeakedDrafts } from "@/lib/hunter-outreach";
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
        try {
          await clearLeakedDrafts();
        } catch {
          console.info(JSON.stringify({ coco: "cleared-leaked-drafts", error: "failed" }));
        }
        const result = await runHunterBatch();
        const filed = result.ok && (!("skipped" in result) || result.skipped === "cards");
        if (filed) {
          try {
            await predraftFiledLeads();
          } catch {
            console.info(JSON.stringify({ coco: "predraft", error: "failed" }));
          }
        }
        return Response.json(result, { status: result.ok ? 200 : 500 });
      },
    },
  },
});
