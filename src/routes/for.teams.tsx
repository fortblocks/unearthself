import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/for/teams")({
  component: TeamsLander,
  head: () => ({
    meta: [
      { title: "PACE for teams \u2014 Unearth Self" },
      {
        name: "description",
        content:
          "A three-day PACE expedition in the Canadian Badlands for teams who are done with hotel ballrooms.",
      },
    ],
  }),
});

const runes = [
  {
    name: "Play",
    line: "The body goes first. Shared work against the land, not a trust fall on carpet.",
  },
  {
    name: "Adaptability",
    line: "The plan will break. You watch how the team handles that, in weather that does not care about the agenda.",
  },
  {
    name: "Connection",
    line: "Not icebreakers. People who have carried something together and still have to look each other in the eye.",
  },
  {
    name: "Experience",
    line: "A last day that is quiet on purpose. What remains when the role falls away.",
  },
];

function TeamsLander() {
  return (
    <main className="bg-coal text-fossil">
      <section className="relative flex min-h-[88vh] items-end overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "linear-gradient(to top, rgba(22,23,24,0.94) 0%, rgba(22,23,24,0.35) 48%), url('/images/exp-hoodoos.jpg')",
          }}
        />
        <div className="relative z-10 mx-auto w-full max-w-5xl px-6 pb-16 pt-28">
          <p className="mb-4 text-[0.72rem] tracking-[0.28em] text-sandstone uppercase">
            Drumheller \u00b7 Canadian Badlands \u00b7 Teams from Calgary and Edmonton
          </p>
          <h1 className="font-display mb-6 text-[clamp(2.8rem,8vw,6rem)] leading-[0.9] uppercase">
            The land
            <br />
            does the work
            <br />
            a ballroom can't.
          </h1>
          <p className="mb-8 max-w-[40ch] text-lg text-fossil/88">
            Badlands Bootcamp is a three-day PACE expedition. Hoodoos, wind, silence, and a method that
            notices how your people actually behave when the script ends.
          </p>
          <Link
            to="/book/retreat"
            className="inline-flex rounded-[2px] bg-ember px-8 py-3.5 text-[0.95rem] font-semibold text-white"
          >
            Hold a date
          </Link>
        </div>
      </section>

      <section className="border-b border-fossil/10 px-6 py-20">
        <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-2">
          <div>
            <p className="mb-3 text-[0.7rem] tracking-[0.22em] text-sandstone uppercase">The place</p>
            <h2 className="font-display mb-4 text-4xl uppercase">Ninety minutes from Calgary. A different planet.</h2>
            <p className="mb-4 text-fossil/75">
              The Alberta Badlands are not a backdrop. Layered rock, river valley, sky that does not
              flatter you. Teams arrive as job titles. They spend three days in a landscape that is older
              than the company.
            </p>
            <p className="text-fossil/75">
              Basecamp and four Haven suites sit in Drumheller. When you outgrow four keys, Canalta takes
              the overflow. The work still happens on the land.
            </p>
          </div>
          <div>
            <p className="mb-3 text-[0.7rem] tracking-[0.22em] text-sandstone uppercase">The proposition</p>
            <h2 className="font-display mb-4 text-4xl uppercase">Not a ropes course with a slide deck.</h2>
            <p className="mb-4 text-fossil/75">
              PACE is the path: Play, Adaptability, Connection, Experience. Each day has a Rune, a
              challenge, and an Echo Mirror. A short, structured noticing of what just happened. It is
              not therapy. We notice. We do not excavate.
            </p>
            <p className="text-fossil/75">
              You leave with a team that has a shared vocabulary for pressure, and a few people who
              finally said the true thing.
            </p>
          </div>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <p className="mb-3 text-[0.7rem] tracking-[0.22em] text-sandstone uppercase">Four Runes</p>
          <h2 className="font-display mb-10 text-4xl uppercase">What the three days are for</h2>
          <div className="grid gap-8 sm:grid-cols-2">
            {runes.map((r) => (
              <article key={r.name} className="border-t border-fossil/15 pt-5">
                <h3 className="font-display text-2xl uppercase">{r.name}</h3>
                <p className="mt-2 text-fossil/70">{r.line}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-fossil/10 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <p className="mb-3 text-[0.7rem] tracking-[0.22em] text-sandstone uppercase">Who this is for</p>
          <h2 className="font-display mb-6 text-4xl uppercase">HR and ops leads who are tired of the offsite that changes nothing.</h2>
          <ul className="grid max-w-3xl gap-3 text-fossil/75">
            <li>Leadership groups of 8 to 16 who need friction, not a tasting menu.</li>
            <li>Teams that collaborate on paper and stall in the room.</li>
            <li>People who can travel from Calgary or Edmonton on a Thursday and be on the land by lunch.</li>
          </ul>
          <p className="mt-6 max-w-3xl text-sm text-fossil/55">
            We are not a clinic. We do not sell a finished methodology called HAM on this page. The live
            product is the expedition.
          </p>
        </div>
      </section>

      <section className="bg-fossil px-6 py-16 text-coal">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-[0.7rem] tracking-[0.2em] text-shale uppercase">Working offer</p>
            <h2 className="font-display text-4xl uppercase">8 to 16 people. 3 days.</h2>
            <p className="mt-3 max-w-[46ch] text-coal/70">
              Price sits with the partners until it is signed. Hold the date. Tess and Christopher read
              every request.
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
