import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/the-work")({ component: Page });

function Page() {
  return (
    <section className="mx-auto max-w-3xl px-4 pt-32 pb-24">
      <p className="mb-3 text-[0.8rem] font-semibold tracking-[0.12em] text-sandstone uppercase">The Work</p>
      <h1 className="font-display mb-6 text-[clamp(2.5rem,6vw,4rem)]">The modality</h1>
      <p className="mb-6 text-lg text-shale">
        The Echo System and Human Adaptation Model form the intellectual and embodied centre of Unearthself —
        a precise language for how we adapt, protect, and grow.
      </p>
      <p className="text-shale">
        Super Self-Awareness, Radical Authenticity, Deep Nature Attunement and the rest of the Ten Principles
        are living geometric markers, not slogans. The land in Drumheller is where they stop being theory.
      </p>
    </section>
  );
}
