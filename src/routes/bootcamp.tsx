import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/bootcamp")({
  component: BootcampPage,
  head: () => ({
    meta: [
      { title: "Badlands Bootcamp - Unearth Self" },
      {
        name: "description",
        content:
          "A 2 to 5 day expedition in the Canadian Badlands for groups of 6 to 30. Land, PACE, recovery at Basecamp. Drumheller.",
      },
    ],
  }),
});

const facts = [
  { k: "Group", v: "6–30 people" },
  { k: "Length", v: "2–5 days" },
  { k: "From Calgary", v: "90 minutes" },
  { k: "Sleep", v: "Haven + Canalta" },
];

const runes = [
  {
    name: "Play",
    slug: "play",
    line: "Start before you have the right answer. The land rewards people who will try the next step.",
  },
  {
    name: "Adaptability",
    slug: "adaptability",
    line: "The plan will not survive the coulee. That is information, not failure.",
  },
  {
    name: "Connection",
    slug: "connection",
    line: "You find out who you are with when the map and the weather disagree.",
  },
  {
    name: "Experience",
    slug: "experience",
    line: "Be in the thing that is happening. Not the story you brought from the car.",
  },
];

function BootcampPage() {
  return (
    <main className="bg-coal text-fossil">
      <section className="relative flex min-h-[70vh] items-end overflow-hidden">
        <img
          src="/images/bootcamp-crew.jpg"
          alt="Four people walking into the badlands canyon"
          className="absolute inset-0 h-full w-full object-cover object-[center_42%]"
          style={{
            maskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-coal via-coal/65 to-transparent" />
        <div className="relative z-10 mx-auto w-full max-w-5xl px-6 pb-16 pt-28">
          <p className="mb-4 text-[0.72rem] tracking-[0.28em] text-sandstone uppercase">
            Drumheller — the expedition
          </p>
          <h1 className="font-display mb-5 text-[clamp(2.6rem,7vw,5.2rem)] leading-[0.9] uppercase">
            Badlands
            <br />
            Bootcamp
          </h1>
          <p className="mb-8 max-w-[40ch] text-lg text-fossil/85">
            A group goes onto the land. They work a sequence. They come back in. That is the product.
          </p>
          <Link
            to="/book/retreat"
            className="inline-flex rounded-[2px] bg-ember px-8 py-3.5 font-semibold text-white"
          >
            Hold a date
          </Link>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <p className="mb-3 text-[0.7rem] tracking-[0.22em] text-sandstone uppercase">What it is</p>
          <h2 className="font-display mb-6 text-4xl uppercase">Not a race. Not a spa weekend. Not a classroom.</h2>
          <p className="mb-4 text-lg text-fossil/80">
            Badlands Bootcamp is a 2–5 day expedition for a group of six to thirty. Teams first —
            Calgary and Edmonton companies, clubs, families, the people who need to be useful to each
            other when the plan dies.
          </p>
          <p className="mb-4 text-lg text-fossil/80">
            Days are on hoodoo country and the Red Deer valley. The sequence is PACE: Play,
            Adaptability, Connection, Experience. Each Rune is revealed, practised on the ground, then
            carried. Nights are at Haven or Canalta. Recovery is next door at Basecamp — heat, cold,
            hands.
          </p>
          <p className="text-lg text-fossil/80">
            The point is not who is fittest. The point is a group that can see its own patterns and
            choose again. Ninety minutes from Calgary. The town is small. The land is not.
          </p>
        </div>
      </section>

      <section className="border-t border-fossil/10 px-6 py-16">
        <div className="mx-auto grid max-w-5xl gap-8 sm:grid-cols-2 md:grid-cols-4">
          {facts.map((f) => (
            <div key={f.k} className="border-t border-fossil/15 pt-4">
              <p className="mb-1 text-[0.7rem] tracking-[0.18em] text-sandstone uppercase">{f.k}</p>
              <p className="font-display text-2xl uppercase">{f.v}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-fossil/10 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <p className="mb-3 text-[0.7rem] tracking-[0.22em] text-sandstone uppercase">A typical three days</p>
          <h2 className="font-display mb-10 text-4xl uppercase">Arrive as a roster. Leave as a crew.</h2>
          <div className="grid gap-8 md:grid-cols-3">
            <article className="border-t border-fossil/15 pt-5">
              <p className="mb-2 text-[0.7rem] tracking-[0.18em] text-sandstone uppercase">Day one — Play</p>
              <h3 className="font-display mb-2 text-2xl uppercase">Onto the land</h3>
              <p className="text-fossil/70">
                Arrive, drop the office, start before anyone has the right answer. Out of the meeting
                and into the place.
              </p>
            </article>
            <article className="border-t border-fossil/15 pt-5">
              <p className="mb-2 text-[0.7rem] tracking-[0.18em] text-sandstone uppercase">Day two — Adapt + Connect</p>
              <h3 className="font-display mb-2 text-2xl uppercase">The plan will not survive</h3>
              <p className="text-fossil/70">
                A longer day on the ground. Weather, route, each other. Who you are with when the map
                and the weather disagree.
              </p>
            </article>
            <article className="border-t border-fossil/15 pt-5">
              <p className="mb-2 text-[0.7rem] tracking-[0.18em] text-sandstone uppercase">Day three — Experience</p>
              <h3 className="font-display mb-2 text-2xl uppercase">A quiet close</h3>
              <p className="text-fossil/70">
                Be in the thing that happened. Name what you will carry. Eat. Drive home before the
                spell is talked to death.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="border-t border-fossil/10 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <p className="mb-3 text-[0.7rem] tracking-[0.22em] text-sandstone uppercase">PACE</p>
          <h2 className="font-display mb-6 text-4xl uppercase">Four Runes. One expedition.</h2>
          <p className="mb-4 max-w-[58ch] text-lg text-fossil/80">
            A Rune is a mark for a way of moving through the Badlands — a capacity you practise on the
            land, then carry when you leave.
          </p>
          <p className="mb-12 max-w-[58ch] text-fossil/65">
            PACE is the sequence: Play, Adaptability, Connection, Experience. Each day of Bootcamp
            reveals one, puts you inside it, and asks you to choose again. The four marks below are how
            that sequence is held — on the wall at Basecamp, in Trail Quest, on the thing you take home.
          </p>
          <div className="grid gap-10 md:grid-cols-2">
            {runes.map((r) => (
              <article key={r.name} className="border-t border-fossil/15 pt-5">
                <div className="mb-3 flex items-center gap-4">
                  <img
                    src={`/runes/${r.slug}.svg`}
                    alt=""
                    className="size-12 shrink-0 brightness-0 invert"
                  />
                  <h3 className="font-display text-3xl uppercase">{r.name}</h3>
                </div>
                <p className="max-w-[40ch] text-fossil/70">{r.line}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-fossil/10 px-6 py-20">
        <div className="mx-auto grid max-w-6xl gap-14 md:grid-cols-2">
          <div>
            <p className="mb-3 text-[0.7rem] tracking-[0.22em] text-sandstone uppercase">Echo</p>
            <h2 className="font-display mb-4 text-3xl uppercase">What the day sends back.</h2>
            <p className="mb-4 text-fossil/75">
              Echo is how the work looks back at you. Short prompts after time on the land. Pattern,
              not diagnosis. Self-awareness lives here.
            </p>
            <p className="text-fossil/75">The canyon does the coaching. The notes are yours.</p>
          </div>
          <div>
            <p className="mb-3 text-[0.7rem] tracking-[0.22em] text-sandstone uppercase">HAM</p>
            <h2 className="font-display mb-4 text-3xl uppercase">Human Adaptation Model</h2>
            <p className="mb-4 text-fossil/75">
              How we protect, adapt, and choose again. The language a group keeps after they drive
              home — and the body of work that will travel further when it is ready.
            </p>
            <p className="text-fossil/75">Trail Quest carries some of this in the field. Paper if the phone dies.</p>
          </div>
        </div>
      </section>

      <section className="border-t border-fossil/10 px-6 py-20">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-3">
          <Link to="/for/teams" className="border-t border-fossil/15 pt-5 hover:text-sandstone">
            <p className="mb-2 text-[0.7rem] tracking-[0.18em] text-sandstone uppercase">Teams</p>
            <h3 className="font-display mb-2 text-2xl uppercase">Written for the person who books it</h3>
            <p className="text-fossil/65">Same expedition. Calendar-invite language.</p>
          </Link>
          <Link to="/haven" className="border-t border-fossil/15 pt-5 hover:text-sandstone">
            <p className="mb-2 text-[0.7rem] tracking-[0.18em] text-sandstone uppercase">Sleep</p>
            <h3 className="font-display mb-2 text-2xl uppercase">Haven, then Canalta</h3>
            <p className="text-fossil/65">Four suites on the block. Overflow held for groups of 30.</p>
          </Link>
          <Link to="/basecamp" className="border-t border-fossil/15 pt-5 hover:text-sandstone">
            <p className="mb-2 text-[0.7rem] tracking-[0.18em] text-sandstone uppercase">After the day</p>
            <h3 className="font-display mb-2 text-2xl uppercase">Basecamp</h3>
            <p className="text-fossil/65">Heat, cold and hands. The house next door.</p>
          </Link>
        </div>
      </section>

      <section className="bg-fossil px-6 py-16 text-coal">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-[0.7rem] tracking-[0.2em] text-shale uppercase">Hold a date</p>
            <h2 className="font-display text-4xl uppercase">6 to 30 people. Two to five days.</h2>
            <p className="mt-3 max-w-[42ch] text-coal/70">
              Tell us who is coming and when you can travel. Availability and a figure come back by email.
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
