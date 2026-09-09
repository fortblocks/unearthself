import { createFileRoute, Link } from "@tanstack/react-router";
import { StayRequest } from "@/components/haven/StayRequest";
import { HAVEN_PHOTOS } from "@/data/havenPhotos";
import { HAVEN_ADDRESS, HAVEN_SHARED, ROOMS } from "@/data/rooms";

export const Route = createFileRoute("/haven/")({
  component: HavenPage,
  head: () => ({
    meta: [
      { title: "Haven - Unearth Self" },
      {
        name: "description",
        content:
          "Four suites in a heritage building in downtown Drumheller. Kitchens, fireplaces, and a quiet stay next to the Badlands.",
      },
    ],
  }),
});

function HavenPage() {
  const hero = HAVEN_PHOTOS.exterior[0] ?? ROOMS[0].images[0];

  return (
    <>
      <section className="relative flex min-h-[70vh] items-end overflow-hidden px-4 pb-16 text-white">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `linear-gradient(to top, rgba(22,23,24,.78), rgba(22,23,24,.25)), url('${hero}')`,
          }}
        />
        <div className="relative z-10 mx-auto w-full max-w-7xl">
          <p className="mb-3 text-[0.8rem] font-semibold tracking-[0.12em] text-sandstone uppercase">
            Drumheller - four suites
          </p>
          <h1 className="font-display mb-3 text-[clamp(2.5rem,6.5vw,4.5rem)] tracking-wide uppercase">Haven</h1>
          <p className="mb-8 max-w-[40ch] text-lg text-fossil/90">
            A heritage house in downtown Drumheller. Four apartments with kitchens and fireplaces.
            Walk to the valley. Sleep here whether or not you are on a Bootcamp.
          </p>
          <a
            href="#stay"
            className="inline-flex rounded-[2px] bg-ember px-8 py-3.5 font-semibold text-white hover:bg-ember-soft"
          >
            Request a stay
          </a>
        </div>
      </section>

      <section className="px-4 py-20">
        <div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-[1.3fr_1fr] md:items-end">
          <div>
            <p className="mb-3 text-[0.8rem] font-semibold tracking-[0.12em] text-sandstone uppercase">
              The house
            </p>
            <h2 className="font-display mb-5 text-[clamp(2rem,4vw,3rem)]">Stay with the land, not a programme.</h2>
            <p className="max-w-[48ch] text-lg text-shale">
              Full kitchens, fireplaces, air conditioning. On-site parking. Downtown Drumheller.
              Basecamp spa is next door when you want heat or hands.
            </p>
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

      <section id="rooms" className="bg-white px-4 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-3 text-[0.8rem] font-semibold tracking-[0.12em] text-sandstone uppercase">
                The rooms
              </p>
              <h2 className="font-display text-[clamp(2rem,4vw,3rem)]">Four suites</h2>
            </div>
            <p className="max-w-[36ch] text-shale">
              Pick a room. Request dates. We confirm what is free and send the rate before anything is charged.
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
                  <p className="mb-6 max-w-[42ch] text-shale">{room.tagline}</p>
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

      <section id="stay" className="bg-coal px-4 py-24 text-fossil">
        <div className="mx-auto grid max-w-7xl gap-14 md:grid-cols-[1fr_1.1fr]">
          <div>
            <p className="mb-3 text-[0.8rem] font-semibold tracking-[0.12em] text-sandstone uppercase">
              Booking
            </p>
            <h2 className="font-display mb-4 text-[clamp(2rem,4vw,3rem)]">Request a stay</h2>
            <p className="mb-6 max-w-[40ch] text-fossil/75">
              Choose dates and a room if you have a preference. We confirm what is free and send the rate
              before anything is charged.
            </p>
            <p className="text-sm text-fossil/55">{HAVEN_ADDRESS}</p>
          </div>
          <StayRequest tone="dark" />
        </div>
      </section>
    </>
  );
}
