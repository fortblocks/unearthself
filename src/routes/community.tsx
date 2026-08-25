import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/community")({ component: Page });

function Page() {
  return (
    <section className="mx-auto max-w-3xl px-4 pt-32 pb-24">
      <h1 className="font-display mb-6 text-[clamp(2.5rem,6vw,4rem)]">Community</h1>
      <p className="text-lg text-shale">
        A living space for participants, alumni, practitioners and the curious. Stories, field notes, and
        the work after the land.
      </p>
    </section>
  );
}
