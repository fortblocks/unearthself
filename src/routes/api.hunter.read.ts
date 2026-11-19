import { createFileRoute } from "@tanstack/react-router";
import { handleHunterRead } from "@/lib/hunter-read";

/**
 * Read-only Hunter snapshot for the Grok Bot.
 * Authorization: Bearer $HUNTER_READ_TOKEN. The token stays unset until Chris sets it.
 */
export const Route = createFileRoute("/api/hunter/read")({
  server: {
    handlers: {
      GET: async ({ request }) => handleHunterRead(request),
    },
  },
});
