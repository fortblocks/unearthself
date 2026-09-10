import { createFileRoute, Link } from "@tanstack/react-router";
import { RateTable } from "@/components/haven/RateTable";
import { StayRequest } from "@/components/haven/StayRequest";
import { fromNight, HAVEN_RULES } from "@/data/havenRates";
import { HAVEN_PHOTOS } from "@/data/havenPhotos";
import { HAVEN_ADDRESS, HAVEN_PLACE, HAVEN_SHARED, ROOMS } from "@/data/rooms";
import { cad } from "@/lib/format";

export const Route = createFileRoute("/haven/")({
  component: HavenPage,
  head: () => ({
    meta: [
      { title: "Haven - Unearth Self" },
      {
        name: "description",
        content:
          "Four suites in a heritage house in downtown Drumheller. Kitchens, fireplaces, and a stay next to the Badlands. Direct rates from $165 a night.",
      },
    ],
  }),
});

function HavenPage() {
  const hero = HAVEN_PHOTOS.exterior[0] ?? ROOMS[0].images[0];

  return (
    <main className="bg-coal text-fossil">
      <section className="relative flex min-h-[70vh] items-end overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `linear-gradient(to top, rgba(22,23,24,0.82) 0%, rgba(22,23,24,0.28) 55%), url('${hero}')`,
          }}
        />
        <div className="relative z-10 mx-auto w-full max-w-5xl px-6 pb-16 pt-28">
          <p className="mb-4 text-[0.72rem] tracking-[0.28em] text-sandstone uppercase">
            Drumheller — four suites
          </p>
          <h1 className="font-display mb-5 text-[clamp(2.6rem,7vw,5.2rem)] leading-[0.9] uppercase">
            Haven
          </h1>
          <p className="mb-8 max-w-[42ch] text-lg text-fossil/85">
            A heritage house on 4 Street West. Four apartments with kitchens and fireplaces. Sleep here
            whether or not you are on a Bootcamp.
          </p>
          <a href="#stay" className="inline-flex rounded-[2px] bg-ember px-8 py-3.5 font-semibold text-white">
            Request a stay
          </a>
        </div>
      </section>

      <section className="bg-fossil px-4 py-20 text-coal">
        <div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-[1.3fr_1fr] md:items-end">
          <div>
            <p className="mb-3 text-[0.8rem] font-semibold tracking-[0.12em] text-sandstone uppercase">
              The house
            </p>
            <h2 className="font-display mb-5 text-[clamp(2rem,4vw,3rem)]">A house in town.</h2>
            <p className="max-w-[48ch] text-lg text-shale">{HAVEN_PLACE}</p>
          </div>
          <ul className="grid grid-cols-2 gap-3 text-sm text-shale">
            {HAVEN_SHARED.map((item) => (
              <li key={item} className="border border-coal/10 px-4 py-3">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="rooms" className="bg-white px-4 py-24 text-coal">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-3 text-[0.8rem] font-semibold tracking-[0.12em] text-sandstone uppercase">
                The rooms
              </p>
              <h2 className="font-display text-[clamp(2rem,4vw,3rem)]">Four suites</h2>
            </div>
            <p className="max-w-[36ch] text-shale">
              Pick a room. Request dates. We confirm what is free and send the total before anything is charged.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {ROOMS.map((room) => (
              <article key={room.slug} className="overflow-hidden border border-coal/10 bg-fossil">
                <Link to="/haven/$slug" params={{ slug: room.slug }} className="block">
                  <div className="aspect-[3/2] overflow-hidden bg-shale">
                    <img
                      src={room.images[0]}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.03]"
                    />
                  </div>
                </Link>
                <div className="p-6 md:p-8">
                  <p className="mb-1 text-[0.72rem] font-semibold tracking-[0.14em] text-sandstone uppercase">
                    Sleeps {room.sleeps} / {room.bedrooms}
                    {room.size ? ` / ${room.size}` : ""}
                  </p>
                  <h3 className="font-display mb-2 text-3xl">{room.name}</h3>
                  <p className="mb-4 max-w-[42ch] text-shale">{room.tagline}</p>
                  <p className="mb-6 text-sm text-coal">
                    From {cad(fromNight(room.slug))} a night
                  </p>
                  <Link
                    to="/haven/$slug"
                    params={{ slug: room.slug }}
                    className="text-[0.85rem] font-semibold text-ember hover:text-ember-soft"
                  >
                    View {room.name}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="rates" className="bg-fossil px-4 py-24 text-coal">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 max-w-[48ch]">
            <p className="mb-3 text-[0.8rem] font-semibold tracking-[0.12em] text-sandstone uppercase">
              Direct rates · 2026
            </p>
            <h2 className="font-display mb-4 text-[clamp(2rem,4vw,3rem)]">What a night costs.</h2>
            <p className="text-shale">
              CAD. Cleaning once per stay ($65 or $85, by suite). Weekend is Friday and Saturday night.
              Peak is 20 June to 6 September. We still confirm the total when we confirm the dates.
            </p>
          </div>
          <RateTable />
          <ul className="mt-10 grid gap-3 text-sm text-shale md:grid-cols-2">
            {HAVEN_RULES.map((rule) => (
              <li key={rule} className="border border-coal/10 bg-white px-4 py-3">
                {rule}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="stay" className="bg-coal px-4 py-24 text-fossil">
        <div className="mx-auto grid max-w-7xl gap-14 md:grid-cols-[1fr_1.1fr]">
          <div>
            <p className="mb-3 text-[0.8rem] font-semibold tracking-[0.12em] text-sandstone uppercase">
              Booking
            </p>
            <h2 className="font-display mb-4 text-[clamp(2rem,4vw,3rem)]">Request a stay</h2>
            <p className="mb-6 max-w-[40ch] text-fossil/75">
              Choose dates and a room if you have a preference. We confirm what is free and send the total
              before anything is charged.
            </p>
            <p className="text-sm text-fossil/55">{HAVEN_ADDRESS}</p>
          </div>
          <StayRequest tone="dark" />
        </div>
      </section>
    </main>
  );
}
