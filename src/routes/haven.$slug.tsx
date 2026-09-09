import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { StayRequest } from "@/components/haven/StayRequest";
import { getRoom, HAVEN_ADDRESS, HAVEN_SHARED, type RoomSlug } from "@/data/rooms";

export const Route = createFileRoute("/haven/$slug")({
  component: RoomPage,
  loader: ({ params }) => {
    const room = getRoom(params.slug);
    if (!room) throw notFound();
    return { room };
  },
  head: ({ params }) => {
    const room = getRoom(params.slug);
    return {
      meta: [
        { title: room ? `${room.name} - Haven` : "Haven" },
        {
          name: "description",
          content: room?.tagline ?? "A room at Haven, Drumheller.",
        },
      ],
    };
  },
});

function RoomPage() {
  const { room } = Route.useLoaderData();
  const [active, setActive] = useState(0);
  const image = room.images[active] ?? room.images[0];

  return (
    <>
      <section className="relative min-h-[62vh] overflow-hidden bg-coal text-fossil">
        <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-coal via-coal/40 to-coal/20" />
        <div className="relative z-10 mx-auto flex min-h-[62vh] max-w-7xl flex-col justify-end px-4 pb-10 pt-28">
          <Link to="/haven" className="text-[0.8rem] font-semibold tracking-[0.12em] text-sandstone uppercase">
            Haven
          </Link>
          <h1 className="font-display mt-4 text-[clamp(2.5rem,6vw,4.5rem)] tracking-wide uppercase">{room.name}</h1>
          <p className="mt-2 max-w-[48ch] text-lg text-fossil/80">{room.tagline}</p>
        </div>
      </section>

      <section className="bg-coal px-4 pb-16">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-3 md:grid-cols-4">
          {room.images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(i)}
              className={
                "overflow-hidden border " +
                (i === active ? "border-sandstone" : "border-transparent opacity-70 hover:opacity-100")
              }
              aria-label={`Photo ${i + 1}`}
              aria-pressed={i === active}
            >
              <img src={src} alt="" className="aspect-[3/2] h-full w-full object-cover" />
            </button>
          ))}
        </div>
      </section>

      <section className="px-4 py-20">
        <div className="mx-auto grid max-w-7xl gap-14 md:grid-cols-[1fr_1fr]">
          <div>
            <p className="mb-3 text-[0.8rem] font-semibold tracking-[0.12em] text-sandstone uppercase">The room</p>
            <p className="mb-8 max-w-[46ch] text-lg text-shale">{room.story}</p>
            <dl className="mb-8 grid grid-cols-2 gap-4 text-sm">
              <div className="border border-coal/10 px-4 py-3">
                <dt className="text-[0.72rem] font-semibold tracking-[0.12em] text-shale uppercase">Sleeps</dt>
                <dd className="mt-1 text-lg">{room.sleeps}</dd>
              </div>
              <div className="border border-coal/10 px-4 py-3">
                <dt className="text-[0.72rem] font-semibold tracking-[0.12em] text-shale uppercase">Layout</dt>
                <dd className="mt-1 text-lg">{room.bedrooms}</dd>
              </div>
              {room.size && (
                <div className="border border-coal/10 px-4 py-3">
                  <dt className="text-[0.72rem] font-semibold tracking-[0.12em] text-shale uppercase">Size</dt>
                  <dd className="mt-1 text-lg">{room.size}</dd>
                </div>
              )}
              {room.floor && (
                <div className="border border-coal/10 px-4 py-3">
                  <dt className="text-[0.72rem] font-semibold tracking-[0.12em] text-shale uppercase">Floor</dt>
                  <dd className="mt-1 text-lg">{room.floor}</dd>
                </div>
              )}
            </dl>
            <p className="text-sm text-shale/80">{HAVEN_ADDRESS}</p>
            <ul className="mt-8 flex flex-wrap gap-2">
              {HAVEN_SHARED.map((item) => (
                <li key={item} className="border border-coal/10 px-3 py-1.5 text-sm text-shale">
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div id="stay" className="border border-coal/10 bg-white p-6 md:p-8">
            <h2 className="font-display mb-2 text-2xl uppercase">Request {room.name}</h2>
            <p className="mb-6 text-sm text-shale">
              Tell us the dates. We confirm what is free and send the rate before anything is charged.
            </p>
            <StayRequest presetSlug={room.slug as RoomSlug} />
          </div>
        </div>
      </section>
    </>
  );
}
