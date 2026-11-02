import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/venue-rentals")({
  component: VenueRentals,
  head: () => ({
    meta: [
      { title: "Venue rentals - Unearth Self" },
      {
        name: "description",
        content:
          "Lease the entire property in Drumheller: Basecamp with its spa facilities, the meeting areas and all four Haven suites. Ninety minutes from Calgary.",
      },
    ],
  }),
});

const FACTS = [
  { k: "Package", v: "The whole property" },
  { k: "From Calgary", v: "90 minutes" },
  { k: "Sleep", v: "Four Haven suites" },
  { k: "Recovery", v: "Basecamp, next door" },
];

const INCLUDED = [
  { title: "Basecamp", body: "The entire Basecamp suite, including the spa facilities." },
  { title: "Meeting areas", body: "Room to gather, teach and work, on your own schedule." },
  { title: "The Haven", body: "All four suites, so your guests sleep on site." },
];

const CLIENTS = [
  {
    title: "Your own retreat.",
    body: "You run retreats that are yours, not ours: yoga, or anything else you have in mind. Take the whole property and shape the days to your own requirements.",
    image: "/images/basecamp/lounge.jpg",
  },
  {
    title: "Writing retreats and facilitated events.",
    body: "You organise writing retreats, training or other facilitated events and want a lovely environment to hold them in, with suites on site for your guests.",
    image: "/images/haven/elowen/elowen-01.jpg",
  },
  {
    title: "Classes.",
    body: "You want to put on classes. The property is yours for the run of them, with the meeting areas, Basecamp and the suites to hand.",
    image: "/images/basecamp/reception.jpg",
  },
];

const RUNES = ["play", "adaptability", "connection", "experience"];

function VenueRentals() {
  return (
    <main className="overflow-hidden bg-coal text-fossil">
      <section className="relative min-h-[100dvh] px-6 pt-32 pb-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            maskImage: "linear-gradient(to bottom, transparent 0%, black 20%, black 70%, transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 20%, black 70%, transparent 100%)",
          }}
        >
          <img src="/topo.png" alt="" className="h-full w-full object-cover" />
        </div>
        <div className="relative z-10 mx-auto flex max-w-7xl flex-col gap-12">
          <div className="flex items-center gap-4">
            <span aria-hidden="true" className="h-1 w-12 rounded-full bg-ember" />
            <p className="text-[0.72rem] tracking-[0.28em] text-sandstone uppercase">Venue rentals</p>
          </div>
          <h1 className="font-display text-[clamp(4.5rem,19vw,17rem)] leading-[0.82] tracking-tight uppercase">
            Venue<span className="text-ember">.</span>
          </h1>
          <div className="grid gap-10 md:grid-cols-[1.1fr_1fr] md:items-end">
            <p className="max-w-[34ch] text-xl leading-relaxed text-fossil/85 md:text-2xl">
              Lease the entire property for your own requirements: Basecamp and its spa, the meeting areas and all four suites.
            </p>
            <div className="relative aspect-[16/10] overflow-hidden rounded-[4px] border border-fossil/10">
              <img src="/images/basecamp/building.jpg" alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-coal/60 to-transparent" />
            </div>
          </div>
          <div aria-hidden="true" className="flex gap-6">
            {RUNES.map((r) => (
              <img key={r} src={`/runes/${r}.svg`} alt="" className="size-8 opacity-50 brightness-0 invert" />
            ))}
          </div>
        </div>
      </section>

      <section aria-label="At a glance" className="border-y border-ember/30 bg-coal px-6 py-8">
        <ul className="mx-auto flex max-w-7xl flex-wrap justify-between gap-x-10 gap-y-6">
          {FACTS.map((f) => (
            <li key={f.k} className="flex flex-col">
              <span className="text-[0.7rem] tracking-[0.18em] text-sandstone uppercase">{f.k}</span>
              <span className="font-display text-2xl uppercase">{f.v}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <p className="mb-3 text-[0.7rem] tracking-[0.22em] text-ember uppercase">The whole property</p>
          <h2 className="font-display mb-6 text-4xl uppercase">Yours, end to end.</h2>
          <p className="mb-4 text-lg text-fossil/80">
            A venue rental means leasing the entire property for your own requirements. You get the whole of it: the
            Basecamp suite with its spa facilities, the meeting areas, and all four suites at the Haven.
          </p>
          <p className="text-lg text-fossil/80">
            The Haven is at 356 4 Street West, Drumheller, ninety minutes from Calgary, and Basecamp is next door.
          </p>
        </div>
      </section>

      <section className="px-6 pb-8">
        <div className="mx-auto max-w-7xl">
          <p className="mb-3 text-[0.7rem] tracking-[0.22em] text-ember uppercase">What’s included</p>
          <ul className="grid gap-8 md:grid-cols-3">
            {INCLUDED.map((x) => (
              <li key={x.title} className="border-t border-ember/30 pt-6">
                <h3 className="font-display mb-3 text-3xl uppercase">{x.title}</h3>
                <p className="text-lg text-fossil/80">{x.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="px-6 py-24 md:py-32">
        <div className="mx-auto flex max-w-7xl flex-col gap-24 md:gap-32">
          {CLIENTS.map((r, i) => (
            <article key={r.title} className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
              <div className={i % 2 === 1 ? "md:order-2" : undefined}>
                <p className="font-display mb-4 text-[clamp(4rem,10vw,8rem)] leading-none text-ember">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h2 className="font-display mb-5 text-[clamp(2rem,4vw,3.25rem)] leading-[0.95] uppercase">{r.title}</h2>
                <p className="max-w-[46ch] text-lg leading-relaxed text-fossil/80">{r.body}</p>
              </div>
              <div className={`aspect-[4/5] overflow-hidden rounded-[4px] ${i % 2 === 1 ? "md:order-1" : ""}`}>
                <img src={r.image} alt="" className="h-full w-full object-cover" />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="px-6 py-24">
        <div className="mx-auto flex max-w-7xl flex-col gap-10 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="font-display text-[clamp(2.5rem,6vw,5rem)] leading-[0.9] uppercase">The whole property. Drumheller.</h2>
            <p className="mt-5 max-w-[46ch] text-lg text-fossil/75">Tell us what you are planning and when.</p>
            <p className="mt-4 text-lg text-fossil/75">
              See the suites at <Link to="/haven" className="text-ember hover:underline">the Haven</Link>.
            </p>
          </div>
          <Link
            to="/book/retreat"
            className="inline-flex shrink-0 rounded-[2px] bg-ember px-8 py-4 text-[0.85rem] font-semibold tracking-[0.16em] text-coal uppercase transition hover:shadow-[0_0_32px_rgba(242,104,76,0.45)]"
          >
            Start a conversation
          </Link>
        </div>
      </section>
    </main>
  );
}
