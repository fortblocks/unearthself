import { createFileRoute } from "@tanstack/react-router";
import { handleOutreach } from "@/lib/hunter-outreach";

/**
 * Coco writes one outreach event at a time.
 * Authorization: Bearer $HUNTER_WRITE_TOKEN. The token stays unset until Christopher sets it.
 */
export const Route = createFileRoute("/api/hunter/outreach")({
  server: {
    handlers: {
      GET: async ({ request }) => handleOutreach(request),
      POST: async ({ request }) => handleOutreach(request),
    },
  },
});
