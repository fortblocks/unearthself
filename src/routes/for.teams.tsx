import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/for/teams")({
  component: TeamsLander,
  head: () => ({
    meta: [{ title: "PACE for teams — Unearth Self" }],
  }),
});

function TeamsLander() {
  return (
    <main className="bg-coal text-fossil">
      <section className="relative flex min-h-[78vh] items-end overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "linear-gradient(to top, rgba(22,23,24,0.92) 0%, rgba(22,23,24,0.4) 50%), url('/images/exp-hoodoos.jpg')",
          }}
        />
        <div className="relative z-10 mx-auto w-full max-w-4xl px-6 pb-16 pt-28">
          <p className="mb-4 text-[0.72rem] tracking-[0.28em] text-sandstone uppercase">
            For HR · Ops · Calgary & Edmonton
          </p>
          <h1 className="font-display mb-5 text-[clamp(2.8rem,8vw,5.5rem)] leading-[0.92] uppercase">
            Three days.
            <br />
            A team that
            <br />
            leaves different.
          </h1>
          <p className="mb-8 max-w-[36ch] text-lg text-fossil/85">
            Badlands Bootcamp is a PACE expedition on the Drumheller land. Not a ropes course with a
            slideshow. Not therapy.
          </p>
          <Link
            to="/book/retreat"
            className="inline-flex rounded-[2px] bg-ember px-8 py-3.5 text-[0.95rem] font-semibold text-white"
          >
            Hold a date
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-6 py-20 md:grid-cols-3">
        {[
          ["Play", "Shared work against the land. The room changes because the ground does."],
          ["Adaptability", "Plans break. The team watches how it handles that."],
          ["Connection", "Not icebreakers. People who have carried something together."],
          ["Existence", "A last day that is quiet on purpose."],
        ].map(([name, line]) => (
          <article key={name}>
            <p className="mb-2 text-[0.7rem] tracking-[0.2em] text-sandstone uppercase">{name}</p>
            <p className="text-fossil/80">{line}</p>
          </article>
        ))}
      </section>

      <section className="border-t border-fossil/10 px-6 py-16">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-[0.7rem] tracking-[0.2em] text-sandstone uppercase">Working offer</p>
            <h2 className="font-display text-4xl uppercase">8–16 people · 3 days</h2>
            <p className="mt-3 max-w-[42ch] text-fossil/70">
              Haven on site, Canalta when you outgrow four keys. Price sits with the partners until D01
              is signed — hold the date first.
            </p>
          </div>
          <Link
            to="/book/retreat"
            className="inline-flex rounded-[2px] bg-ember px-8 py-3.5 font-semibold text-white"
          >
            Hold a date
          </Link>
        </div>
      </section>
    </main>
  );
}
