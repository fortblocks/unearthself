import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  component: AboutPage,
  head: () => ({
    meta: [
      { title: "About - Unearth Self" },
      {
        name: "description",
        content: "A four-partner house in Drumheller. Basecamp, Haven, Badlands Bootcamp.",
      },
    ],
  }),
});

const partners = [
  {
    name: "Tess Hamilton",
    line: "The work. Product, the expedition, and the language underneath it.",
  },
  {
    name: "Lisa Hamilton",
    line: "The house. Guests, the day, and how the place actually runs.",
  },
  {
    name: "Norah Hamilton",
    line: "The numbers and the treatments. Practitioners, spa, the books.",
  },
  {
    name: "Christopher Mair",
    line: "The surface. Systems, brand, the site, and selling it with Tess.",
  },
];

function AboutPage() {
  return (
    <main className="bg-coal text-fossil">
      <section className="relative h-[55vh] min-h-[24rem] overflow-hidden">
        <img
          src="/images/basecamp/building.jpg"
          alt="Basecamp in Drumheller"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </section>

      <section className="px-6 pt-16 pb-16">
        <div className="mx-auto max-w-3xl">
          <p className="mb-4 text-[0.72rem] tracking-[0.28em] text-sandstone uppercase">Drumheller</p>
          <h1 className="font-display mb-6 text-[clamp(2.6rem,7vw,5rem)] leading-[0.9] uppercase">
            A house on deep time.
          </h1>
          <p className="mb-4 max-w-[46ch] text-lg text-fossil/80">
            Unearth Self is a self-orientation practice that begins as a place. Basecamp is the HQ and
            the spa. Haven is four suites on the same block. Badlands Bootcamp is the expedition we take
            people on.
          </p>
          <p className="max-w-[46ch] text-lg text-fossil/80">
            Four partners. No chief. The long game is more than one location and a language people keep
            using after they leave. Year one is this town and this canyon.
          </p>
        </div>
      </section>

      <section className="border-t border-fossil/10 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <p className="mb-3 text-[0.7rem] tracking-[0.22em] text-sandstone uppercase">Partners</p>
          <h2 className="font-display mb-12 text-4xl uppercase">Who holds the house.</h2>
          <div className="grid gap-10 md:grid-cols-2">
            {partners.map((p) => (
              <article key={p.name} className="border-t border-fossil/15 pt-5">
                <h3 className="font-display mb-3 text-3xl uppercase">{p.name}</h3>
                <p className="max-w-[40ch] text-fossil/70">{p.line}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-fossil/10 px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <p className="mb-3 text-[0.7rem] tracking-[0.22em] text-sandstone uppercase">Why here</p>
          <h2 className="font-display mb-6 text-4xl uppercase">Not Banff. Not a gym with a view.</h2>
          <p className="mb-4 text-lg text-fossil/80">
            Drumheller is small and the landscape is not. Coulees, hoodoos, a river, winter that means it.
            We did not pick it as a backdrop. The work needs a place that will not flatter you.
          </p>
          <p className="text-lg text-fossil/80">
            Locals use the spa. Teams come for the expedition. Overnight guests take a suite and walk
            next door. One ecosystem. Three doors.
          </p>
          <Link to="/visit" className="mt-8 inline-block text-sandstone hover:text-fossil">
            How to get here →
          </Link>
        </div>
      </section>

      <section className="bg-fossil px-6 py-16 text-coal">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-[0.7rem] tracking-[0.2em] text-shale uppercase">Start with a date</p>
            <h2 className="font-display text-4xl uppercase">Hold the house for a team.</h2>
          </div>
          <Link to="/for/teams" className="inline-flex rounded-[2px] bg-ember px-8 py-3.5 font-semibold text-white">
            For teams
          </Link>
        </div>
      </section>
    </main>
  );
}
