import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/bootcamp")({ component: BootcampPage });

function BootcampPage() {
  return (
    <>
      <section className="relative flex min-h-[70vh] items-end overflow-hidden px-4 pb-16 text-white">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "linear-gradient(to top, rgba(22,23,24,.75), rgba(40,18,6,.35)), url('/images/exp-hoodoos.jpg')",
          }}
        />
        <div className="relative z-10 mx-auto w-full max-w-7xl">
          <p className="mb-3 text-[0.8rem] font-semibold tracking-[0.12em] text-sandstone uppercase">
            Experiences · Corporate & Groups
          </p>
          <h1 className="font-display mb-3 text-[clamp(2.5rem,6.5vw,4.5rem)] tracking-wide uppercase">
            Badlands Bootcamp
          </h1>
          <p className="mb-6 max-w-[38ch] text-lg text-fossil/90">
            Experiential programmes for teams in the Canadian Badlands. Then design the exact itinerary in
            the Retreat Builder.
          </p>
          <Link
            to="/builder"
            className="inline-flex rounded-[2px] bg-ember px-8 py-3.5 font-semibold text-white hover:bg-ember-soft"
          >
            Open Retreat Builder
          </Link>
        </div>
      </section>

      <section className="bg-coal px-4 py-24 text-fossil">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-3 text-[0.8rem] font-semibold tracking-[0.12em] text-sandstone uppercase">
            Packages
          </p>
          <h2 className="font-display mb-4 text-[clamp(2.25rem,5vw,3.5rem)]">Choose your intensity</h2>
          <p className="mb-10 text-fossil/75">
            Getaway Day, Trail Quest, Ride & Reflect, Adaptation Lab — or build a custom 2–5 day programme
            by dragging activities into the planner.
          </p>
          <div className="grid gap-4 text-left md:grid-cols-2">
            {[
              ["Getaway Day", "Half or full day. Movement, shared challenge, clean close."],
              ["Trail Quest", "Land-based game woven with the Echo System."],
              ["Ride & Reflect", "Valley cycling with structured reflection."],
              ["Adaptation Lab", "2–3 days of HAM and Echo work on the land."],
            ].map(([t, d]) => (
              <article key={t} className="rounded border border-fossil/12 p-6">
                <h3 className="font-display mb-2 text-xl">{t}</h3>
                <p className="text-fossil/70">{d}</p>
              </article>
            ))}
          </div>
          <Link
            to="/builder"
            className="mt-10 inline-flex rounded-[2px] bg-ember px-8 py-3.5 font-semibold text-white hover:bg-ember-soft"
          >
            Build a custom retreat
          </Link>
        </div>
      </section>
    </>
  );
}
