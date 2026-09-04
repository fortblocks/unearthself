import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <>
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden text-center text-white">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "linear-gradient(to bottom, rgba(22,23,24,0.28), rgba(40,18,6,0.55)), url('/images/hero-badlands-dusk.jpg')",
          }}
        />
        <div className="relative z-10 max-w-3xl px-6 py-16">
          <img
            src="/logo.svg"
            alt=""
            width={72}
            height={72}
            className="mx-auto mb-6 size-16 brightness-0 invert md:size-20"
          />
          <h1 className="font-display mb-6 text-[clamp(3.5rem,8vw,6.5rem)] leading-none font-medium tracking-[0.08em] uppercase">
            UNEARTHSELF
          </h1>
          <p className="mx-auto mb-8 max-w-[32ch] text-[clamp(1.1rem,2.2vw,1.4rem)] text-fossil/90">
            A modality for becoming more fully yourself in the world.
          </p>
          <Link
            to="/the-work"
            className="inline-flex rounded-[2px] bg-ember px-8 py-3.5 font-semibold text-white hover:bg-ember-soft"
          >
            Explore the Work
          </Link>
        </div>
      </section>

      <section className="px-4 py-24 text-center">
        <p className="mx-auto max-w-[42ch] text-[1.35rem] text-shale">
          Unearthself is the quiet, grounded source from which everything else emerges — a precise
          and living philosophy for deeper self-awareness, resilient adaptation, and purposeful
          presence in the world.
        </p>
      </section>

      <section id="work" className="bg-coal px-4 py-32 text-fossil">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h2 className="font-display mb-4 text-[clamp(2.25rem,5vw,3.5rem)]">The Work</h2>
            <p className="mx-auto max-w-[50ch] text-lg text-fossil/75">
              The Echo System and Human Adaptation Model form the intellectual and embodied centre of
              Unearthself.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                t: "Echo System",
                d: "A symbolic and somatic language for recognising adaptive patterns and reclaiming presence.",
              },
              {
                t: "Human Adaptation Model",
                d: "A rigorous yet warmly human framework for understanding how we adapt, protect, and grow.",
              },
              {
                t: "Ten Principles",
                d: "Living geometric markers of Super Self-Awareness, Radical Authenticity, Deep Nature Attunement and more.",
              },
            ].map((c) => (
              <article
                key={c.t}
                className="rounded border border-fossil/10 px-6 py-10 text-center"
              >
                <h3 className="font-display mb-2 text-[1.35rem]">{c.t}</h3>
                <p className="mx-auto text-[0.95rem] text-fossil/70">{c.d}</p>
              </article>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link
              to="/the-work"
              className="inline-flex rounded-[2px] border border-fossil/40 px-8 py-3.5 font-semibold text-white"
            >
              Enter the modality
            </Link>
          </div>
        </div>
      </section>

      <section id="experiences" className="bg-fossil px-4 py-32">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h2 className="font-display mb-4 text-[clamp(2.25rem,5vw,3.5rem)]">Experiences</h2>
            <p className="text-lg text-shale">Three distinct pathways within one coherent ecosystem.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <ExpCard
              href="/basecamp"
              img="/images/exp-canyon.jpg"
              title="Basecamp"
              body="Wellness retreats & treatments. Intimate, restorative, deeply grounded in the land."
              cta="Explore Basecamp →"
            />
            <ExpCard
              href="/bootcamp"
              img="/images/exp-hoodoos.jpg"
              title="Badlands Bootcamp"
              body="Corporate & group experiential programmes. Challenge, reflection, and lasting adaptation."
              cta="Explore Bootcamp →"
            />
            <ExpCard
              href="/haven"
              img="/images/exp-rolling.jpg"
              title="Haven"
              body="Four rooms in downtown Drumheller. Short stays, kitchens, fireplaces — a quieter doorway into the land."
              cta="Explore Haven →"
            />
          </div>
        </div>
      </section>

      <section className="bg-coal px-4 py-24 text-center text-fossil">
        <h2 className="font-display mb-4 text-[clamp(2.25rem,5vw,3.5rem)]">Begin where you are ready</h2>
        <p className="mx-auto mb-8 max-w-[36ch] text-fossil/90">
          Design a custom programme in the retreat builder, or start with the modality.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            to="/builder"
            className="inline-flex rounded-[2px] bg-ember px-8 py-3.5 font-semibold text-white hover:bg-ember-soft"
          >
            Open Retreat Builder
          </Link>
          <Link
            to="/the-work"
            className="inline-flex rounded-[2px] border border-fossil/50 px-8 py-3.5 font-semibold text-white"
          >
            Begin with the Work
          </Link>
        </div>
      </section>
    </>
  );
}

function ExpCard({
  href,
  img,
  title,
  body,
  cta,
}: {
  href: "/basecamp" | "/bootcamp" | "/haven";
  img: string;
  title: string;
  body: string;
  cta: string;
}) {
  return (
    <article className="overflow-hidden rounded bg-white shadow-[0_4px_24px_rgba(22,23,24,0.06)] transition-transform hover:-translate-y-1.5">
      <div className="aspect-[4/3] overflow-hidden bg-shale">
        <img src={img} alt="" className="h-full w-full object-cover saturate-[0.78] contrast-[1.05] brightness-[0.93]" />
      </div>
      <div className="p-6">
        <h3 className="font-display mb-1 text-2xl">{title}</h3>
        <p className="mb-4 text-[0.95rem] text-shale">{body}</p>
        <Link to={href} className="text-[0.85rem] font-semibold text-ember hover:text-ember-soft">
          {cta}
        </Link>
      </div>
    </article>
  );
}
