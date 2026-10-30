import { createFileRoute, Link } from "@tanstack/react-router";
import { HomeGallery } from "@/components/site/HomeGallery";
import { RuneCards } from "@/components/site/RuneCards";

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

const audiences = [
  { title: "Teams", line: "Companies and their people.", to: "/for/teams", cta: "For teams" },
  {
    title: "Crews",
    line: "Firefighters, police services, coaching staff. Groups who already work as one.",
    to: "/for/crews",
    cta: "For crews",
  },
  {
    title: "Friends",
    line: "Friends who want the outdoors together.",
    to: "/for/friends",
    cta: "For friends",
  },
] as const;

function BootcampPage() {
  return (
    <main className="bg-coal text-fossil">
      <section className="relative flex min-h-[70vh] items-end overflow-hidden">
        <div
          className="absolute inset-0 bg-cover"
          style={{
            backgroundImage:
              "linear-gradient(to top, rgba(22,23,24,0.78) 0%, rgba(22,23,24,0.12) 50%), url('/images/bootcamp-crew.jpg')",
            backgroundPosition: "58% 72%",
          }}
        />
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
            A group goes out onto the land, works through a sequence together and comes back in. That, simply, is the product.
          </p>
          <Link
            to="/book/retreat"
            className="inline-flex rounded-[2px] bg-ember px-8 py-3.5 font-semibold text-white"
          >
            Request a conversation
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
            The point is not who is fittest; it is a group that can see its own patterns and choose again. It all happens ninety minutes from Calgary, in a town that is small on land that is not.
          </p>
        </div>
      </section>

      <HomeGallery />

      <section className="px-6 py-16">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-y-12 md:grid-cols-4 md:gap-y-0 md:divide-x md:divide-fossil/10">
          {facts.map((f) => (
            <div key={f.k} className="px-4 text-center">
              <p className="mb-2 text-[0.7rem] tracking-[0.18em] text-sandstone uppercase">{f.k}</p>
              <p className="font-display text-2xl uppercase">{f.v}</p>
            </div>
          ))}
        </div>
      </section>

      <div aria-hidden="true" className="px-6">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto h-px w-1/2 bg-fossil/15" />
        </div>
      </div>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <p className="mb-10 text-[0.7rem] tracking-[0.22em] text-sandstone uppercase">Who it's for</p>
          <div className="grid gap-6 md:grid-cols-3">
            {audiences.map((a) => (
              <Link
                key={a.title}
                to={a.to}
                className="group relative flex flex-col rounded-[4px] border border-fossil/10 bg-fossil/[0.03] p-6 pt-8 transition duration-300 hover:border-ember/60 hover:shadow-[0_0_32px_rgba(242,104,76,0.35)] focus-visible:border-ember/60 focus-visible:shadow-[0_0_32px_rgba(242,104,76,0.35)] focus-visible:outline-none"
              >
                <span aria-hidden="true" className="absolute top-0 left-6 h-1 w-10 -translate-y-1/2 rounded-full bg-ember" />
                <h3 className="font-display mb-2 text-2xl uppercase">{a.title}</h3>
                <p className="mb-6 flex-1 text-fossil/70">{a.line}</p>
                <span className="text-[0.85rem] font-semibold text-ember">{a.cta}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div aria-hidden="true" className="px-6">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto h-px w-1/2 bg-fossil/15" />
        </div>
      </div>
      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <p className="mb-3 text-[0.7rem] tracking-[0.22em] text-sandstone uppercase">A typical three days</p>
          <h2 className="font-display mb-10 text-4xl uppercase">Arrive as a roster. Leave as a crew.</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <article className="relative rounded-[4px] border border-fossil/10 bg-fossil/[0.03] p-6 pt-8">
              <span aria-hidden="true" className="absolute top-0 left-6 h-1 w-10 -translate-y-1/2 rounded-full bg-ember" />
              <p className="mb-2 text-[0.7rem] tracking-[0.18em] text-ember uppercase">Day one — Play</p>
              <h3 className="font-display mb-2 text-2xl uppercase">Onto the land</h3>
              <p className="text-fossil/70">
                Arrive, drop the office, start before anyone has the right answer. Out of the meeting
                and into the place.
              </p>
            </article>
            <article className="relative rounded-[4px] border border-fossil/10 bg-fossil/[0.03] p-6 pt-8">
              <span aria-hidden="true" className="absolute top-0 left-6 h-1 w-10 -translate-y-1/2 rounded-full bg-ember" />
              <p className="mb-2 text-[0.7rem] tracking-[0.18em] text-ember uppercase">Day two — Adapt + Connect</p>
              <h3 className="font-display mb-2 text-2xl uppercase">The plan will not survive</h3>
              <p className="text-fossil/70">
                A longer day on the ground, shaped by weather, route and each other, and by who you are with when the map and the weather disagree.
              </p>
            </article>
            <article className="relative rounded-[4px] border border-fossil/10 bg-fossil/[0.03] p-6 pt-8">
              <span aria-hidden="true" className="absolute top-0 left-6 h-1 w-10 -translate-y-1/2 rounded-full bg-ember" />
              <p className="mb-2 text-[0.7rem] tracking-[0.18em] text-ember uppercase">Day three — Experience</p>
              <h3 className="font-display mb-2 text-2xl uppercase">A quiet close</h3>
              <p className="text-fossil/70">
                The last day is for being in the thing that happened: naming what you will carry, sharing a meal and driving home before the spell is talked to death.
              </p>
            </article>
          </div>
        </div>
      </section>

      <div aria-hidden="true" className="px-6">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto h-px w-1/2 bg-fossil/15" />
        </div>
      </div>
      <section className="px-6 py-20">
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
          <RuneCards runes={runes} />
        </div>
      </section>

      <div aria-hidden="true" className="px-6">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto h-px w-1/2 bg-fossil/15" />
        </div>
      </div>
      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <p className="mb-3 text-[0.7rem] tracking-[0.22em] text-sandstone uppercase">Trail Quest</p>
          <h2 className="font-display mb-6 text-4xl uppercase">Trail Quest</h2>
          <div className="max-w-[58ch] space-y-4 border-l-2 border-ember pl-6">
            <p className="text-lg text-fossil/80">
              Trail Quest is the expedition system, a quest companion rather than a wellness dashboard, and most of the retreat happens away from the screen.
            </p>
            <p className="text-fossil/75">
              Each Rune is revealed after the encounter, not before. It works with poor or no signal.
            </p>
            <p className="text-fossil/75">
              There is no guest-facing AI coach and no diagnosis, and private notes stay on your device. If the app ever fights the canyon, paper wins.
            </p>
          </div>
        </div>
      </section>

      <div aria-hidden="true" className="px-6">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto h-px w-1/2 bg-fossil/15" />
        </div>
      </div>
      <section className="px-6 py-20">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-2">
          <Link to="/haven" className="group block">
            <div className="aspect-[16/9] overflow-hidden bg-shale">
              <img
                src="/images/haven/elowen/elowen-01.jpg"
                alt=""
                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
              />
            </div>
            <p className="mt-5 text-[0.7rem] tracking-[0.18em] text-sandstone uppercase">Sleep</p>
            <h3 className="font-display mt-1 text-3xl uppercase">The Haven</h3>
            <p className="mt-2 text-fossil/65">Four suites on the block, with overflow held for groups of 30.</p>
            <p className="mt-1 text-fossil/50">Haven, then Canalta</p>
            <span className="mt-4 inline-block text-[0.85rem] font-semibold text-ember">Explore Haven</span>
          </Link>
          <Link to="/basecamp" className="group block">
            <div className="aspect-[16/9] overflow-hidden bg-shale">
              <img
                src="/images/basecamp/lounge.jpg"
                alt=""
                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
              />
            </div>
            <p className="mt-5 text-[0.7rem] tracking-[0.18em] text-sandstone uppercase">After the day</p>
            <h3 className="font-display mt-1 text-3xl uppercase">Basecamp</h3>
            <p className="mt-2 text-fossil/65">Heat, cold and hands, in the house next door.</p>
            <span className="mt-4 inline-block text-[0.85rem] font-semibold text-ember">Explore Basecamp</span>
          </Link>
        </div>
      </section>

      <section className="bg-fossil px-6 py-16 text-coal">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-[0.7rem] tracking-[0.2em] text-shale uppercase">Start a conversation</p>
            <h2 className="font-display text-4xl uppercase">6 to 30 people. Two to five days.</h2>
            <p className="mt-3 max-w-[42ch] text-coal/70">
              Tell us who is coming and when you can travel. Availability and a figure come back by email.
            </p>
          </div>
          <Link
            to="/book/retreat"
            className="inline-flex rounded-[2px] bg-ember px-8 py-3.5 font-semibold text-white"
          >
            Talk to us
          </Link>
        </div>
      </section>
    </main>
  );
}
