import { createFileRoute, Link } from "@tanstack/react-router";
import { SIGHTS } from "@/data/sights";

export const Route = createFileRoute("/things-to-see/")({
  component: ThingsToSee,
  head: () => ({
    meta: [
      { title: "Things to See - Unearth Self" },
      {
        name: "description",
        content:
          "Museums, canyons, bridges and other sights around Drumheller. Each note sends you on to the place that keeps it.",
      },
    ],
  }),
});

function ThingsToSee() {
  return (
    <main className="bg-coal text-fossil">
      <section className="px-6 pt-32 pb-12">
        <div className="mx-auto max-w-3xl">
          <p className="mb-4 text-[0.72rem] tracking-[0.28em] text-sandstone uppercase">Around the valley</p>
          <h1 className="font-display mb-6 text-[clamp(2.6rem,7vw,5rem)] leading-[0.9] uppercase">
            Things to see
          </h1>
          <p className="max-w-[46ch] text-lg text-fossil/80">
            These are places around Drumheller that other people keep. A museum, a mine, a ferry, a
            line of bridges, and the land itself. Each note says where it sits, and sends you on to
            the official page.
          </p>
        </div>
      </section>

      <section className="px-6 pb-16">
        <ul className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2">
          {SIGHTS.map((sight) => (
            <li key={sight.slug}>
              <Link
                to="/things-to-see/$slug"
                params={{ slug: sight.slug }}
                className="group flex h-full flex-col border-t-2 border-ember bg-fossil/[0.03] p-6"
              >
                <p className="text-[0.7rem] tracking-[0.18em] text-sandstone uppercase">{sight.area}</p>
                <h2 className="font-display mt-3 text-3xl uppercase group-hover:text-ember">{sight.name}</h2>
                <p className="mt-3 flex-1 text-lg text-fossil/75">{sight.line}</p>
                <span className="mt-6 text-[0.8rem] font-semibold tracking-[0.16em] text-ember uppercase">
                  Read the note
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="px-6 pb-24">
        <p className="mx-auto max-w-3xl text-lg text-fossil/60">
          Unearth Self does not run these places or sell tickets to them. Hours, prices and seasons
          live on each official page.
        </p>
      </section>
    </main>
  );
}
