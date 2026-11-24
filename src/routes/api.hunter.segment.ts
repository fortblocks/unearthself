import { createFileRoute } from "@tanstack/react-router";
import { handleHunterSegment } from "@/lib/hunter-segment";

/**
 * Hunter chooses the active segment.
 * Authorization: Bearer $HUNTER_WRITE_TOKEN.
 */
export const Route = createFileRoute("/api/hunter/segment")({
  server: {
    handlers: {
      GET: async ({ request }) => handleHunterSegment(request),
      POST: async ({ request }) => handleHunterSegment(request),
    },
  },
});
