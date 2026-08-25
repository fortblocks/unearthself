import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/journal")({ component: Page });

function Page() {
  return (
    <section className="mx-auto max-w-3xl px-4 pt-32 pb-24">
      <h1 className="font-display mb-6 text-[clamp(2.5rem,6vw,4rem)]">Journal</h1>
      <p className="text-lg text-shale">
        Field notes, research, participant reflections, and modality developments.
      </p>
    </section>
  );
}
