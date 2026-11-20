import { createFileRoute } from "@tanstack/react-router";
import { handleUnsubscribe } from "@/lib/hunter-outreach";

/**
 * Plain-text unsubscribe link. The token is the path, so this response
 * stays out of the site shell, the nav, and any third-party script.
 */
export const Route = createFileRoute("/u/$token")({
  server: {
    handlers: {
      GET: async ({ request }) => handleUnsubscribe(request),
      POST: async ({ request }) => handleUnsubscribe(request),
    },
  },
});
