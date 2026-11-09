import { createFileRoute, Link } from "@tanstack/react-router";
import { useBooking } from "@/lib/booking/context";

export const Route = createFileRoute("/events")({
  head: () => ({
    meta: [
      { title: "Events in Drumheller — Unearth Self" },
      {
        name: "description",
        content:
          "The Drumheller valley's annual events, from Cold Bones Fest in February to the Badlands Passion Play in July. Stay at Haven for the dates.",
      },
    ],
  }),
  component: EventsPage,
});

type ValleyEvent = {
  name: string;
  when: string;
  tbc?: boolean;
  venue: string;
  body: string;
  href: string;
};

type Season = { label: string; events: ValleyEvent[] };

// Every entry checked against the organizer's own page (or Travel Drumheller's
// listing) in October 2026. Where next year's dates are not yet published, the
// card shows the typical month and is marked "Dates TBC".
const SEASONS: Season[] = [
  {
    label: "Winter & spring",
    events: [
      {
        name: "Cold Bones Fest",
        when: "19–21 February 2027",
        venue: "Venues across downtown Drumheller",
        body: "A multi-genre, all-ages winter music festival spread across downtown venues. Three days of live sets in the dead of a badlands February.",
        href: "https://coldbonesfest.com/",
      },
      {
        name: "Easter Weekend at the Royal Tyrrell Museum",
        when: "Easter long weekend",
        tbc: true,
        venue: "Royal Tyrrell Museum, Midland Provincial Park",
        body: "The museum stays open through the long weekend, with a self-guided egg hunt running through the galleries.",
        href: "https://www.tyrrellmuseum.com/whats_on/special_events/easter",
      },
    ],
  },
  {
    label: "Summer",
    events: [
      {
        name: "Canada Day in Drumheller",
        when: "1 July, every year",
        venue: "Downtown & Centennial Park",
        body: "A morning parade downtown, a day of music on the Centennial Park stage, and fireworks over the Red Deer River near the World's Largest Dinosaur after dark.",
        href: "https://traveldrumheller.com/events/canada-day-5/",
      },
      {
        name: "Badlands Passion Play",
        when: "Weekends, 2–18 July 2027",
        venue: "Badlands Amphitheatre",
        body: "Now in its 32nd season, performed across more than six acres of hillside on Canada's largest outdoor stage. Evening shows Friday and Saturday, afternoon on Sunday.",
        href: "https://badlandsamp.com/badlands-passion-play/",
      },
      {
        name: "Drumheller Stampede",
        when: "Mid-August",
        tbc: true,
        venue: "Drumheller Agricultural Grounds",
        body: "Two nights of rodeo in the valley, with sheep riding and wild pony racing alongside the main events.",
        href: "https://traveldrumheller.com/events/drumheller-stampede/",
      },
    ],
  },
  {
    label: "Autumn",
    events: [
      {
        name: "I Love Drumheller Valley Days",
        when: "October",
        tbc: true,
        venue: "Across the Drumheller valley",
        body: "A week-long celebration of the valley that runs alongside Tyra's birthday, the World's Largest Dinosaur.",
        href: "https://traveldrumheller.com/events/i-love-druheller-valley-days/",
      },
      {
        name: "Lightfest: Fireworks in the Badlands",
        when: "November",
        tbc: true,
        venue: "Badlands Amphitheatre",
        body: "A fireworks show set to music, fired over the hoodoos and hills of the amphitheatre. It opens the Lightfest season, followed by Journey to Bethlehem, an interactive nativity walk.",
        href: "https://badlandsamp.com/lightfest/",
      },
      {
        name: "Drumheller Festival of Lights",
        when: "Late November",
        tbc: true,
        venue: "Downtown Drumheller",
        body: "A free evening downtown built around the community tree lighting. It marks the start of the valley's winter.",
        href: "https://www.drumhellerfestivaloflights.com/",
      },
    ],
  },
];

function EventsPage() {
  const { openFace } = useBooking();

  return (
    <main className="overflow-hidden bg-coal text-fossil">
      {/* Editorial hero */}
      <section className="relative px-6 pt-32 pb-20">
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
        <div className="relative z-10 mx-auto flex max-w-7xl flex-col gap-10">
          <div className="flex items-center gap-4">
            <span aria-hidden="true" className="h-1 w-12 rounded-full bg-ember" />
            <p className="text-[0.72rem] tracking-[0.28em] text-sandstone uppercase">In the valley</p>
          </div>
          <h1 className="font-display text-[clamp(4.5rem,19vw,17rem)] leading-[0.82] tracking-tight uppercase">
            Events<span className="text-ember">.</span>
          </h1>
          <p className="max-w-[40ch] text-xl leading-relaxed text-fossil/85 md:text-2xl">
            The badlands keep a calendar. Music in February, theatre on the hillsides in July, fireworks
            over the river. Come for the event and stay in the valley.
          </p>
        </div>
      </section>

      {SEASONS.map((season, si) => (
        <section key={season.label} className="px-6 py-20">
          {si > 0 ? <div aria-hidden="true" className="mx-auto mb-20 h-px w-1/2 bg-fossil/15" /> : null}
          <div className="mx-auto max-w-7xl">
            <p className="mb-3 text-[0.7rem] tracking-[0.22em] text-ember uppercase">Season</p>
            <h2 className="font-display mb-12 text-4xl uppercase">{season.label}</h2>
            <ul className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {season.events.map((e) => (
                <li
                  key={e.name}
                  className="relative flex flex-col rounded-[4px] border border-fossil/10 bg-fossil/[0.03] p-6 pt-8"
                >
                  <span
                    aria-hidden="true"
                    className="absolute top-0 left-6 h-1 w-10 -translate-y-1/2 rounded-full bg-ember"
                  />
                  <p className="text-[0.7rem] tracking-[0.22em] text-sandstone uppercase">
                    {e.when}
                    {e.tbc ? <span className="text-ember"> · Dates TBC</span> : null}
                  </p>
                  <h3 className="font-display mt-3 text-2xl leading-tight uppercase">{e.name}</h3>
                  <p className="mt-2 text-[0.7rem] tracking-[0.22em] text-fossil/60 uppercase">{e.venue}</p>
                  <p className="mt-4 flex-1 text-lg leading-relaxed text-fossil/80">{e.body}</p>
                  <a
                    href={e.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-6 text-[0.8rem] font-semibold tracking-[0.16em] text-ember uppercase hover:underline"
                  >
                    Official page ↗
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ))}

      <section className="px-6 pb-12">
        <p className="mx-auto max-w-7xl text-lg text-fossil/60">
          Dates marked TBC follow the usual month; check the official page before you plan. Unearth Self
          isn't the organizer of these events.
        </p>
      </section>

      {/* Haven CTA */}
      <section className="bg-ember px-6 py-24 text-coal">
        <div className="mx-auto flex max-w-7xl flex-col gap-10 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-4 text-[0.72rem] tracking-[0.28em] uppercase">Haven</p>
            <h2 className="font-display text-[clamp(2.5rem,6vw,5rem)] leading-[0.9] uppercase">
              Staying for an event?
            </h2>
            <p className="mt-5 max-w-[46ch] text-lg">
              Pick your event dates and ask about a room at Haven.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-4">
            <button
              type="button"
              onClick={() => openFace("haven")}
              className="inline-flex rounded-[2px] bg-coal px-8 py-4 text-[0.85rem] font-semibold tracking-[0.16em] text-fossil uppercase transition hover:shadow-[0_0_32px_rgba(0,0,0,0.35)]"
            >
              Book a room
            </button>
            <Link
              to="/haven"
              className="inline-flex rounded-[2px] border border-coal px-8 py-4 text-[0.85rem] font-semibold tracking-[0.16em] uppercase"
            >
              See Haven
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
