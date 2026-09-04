"use client";

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
        { title: room ? `${room.name} — Haven` : "Haven" },
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
      <section className="bg-coal px-4 pt-28 pb-6 text-fossil">
        <div className="mx-auto max-w-7xl">
          <Link to="/haven" className="text-[0.8rem] font-semibold tracking-[0.12em] text-sandstone uppercase">
            ← Haven
          </Link>
          <h1 className="font-display mt-4 text-[clamp(2.5rem,6vw,4.5rem)] tracking-wide uppercase">{room.name}</h1>
          <p className="mt-2 max-w-[48ch] text-lg text-fossil/75">{room.tagline}</p>
        </div>
      </section>

      <section className="bg-coal px-4 pb-16">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-[1.6fr_0.8fr]">
          <div className="overflow-hidden bg-shale">
            <img
              src={image}
              alt=""
              className="aspect-[3/2] h-full w-full object-cover saturate-[0.78] contrast-[1.05] brightness-[0.93]"
            />
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-1">
            {room.images.map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => setActive(i)}
                className={
                  "overflow-hidden border " +
                  (i === active ? "border-sandstone" : "border-transparent opacity-80 hover:opacity-100")
                }
                aria-label={`Photo ${i + 1}`}
                aria-pressed={i === active}
              >
                <img src={src} alt="" className="aspect-[3/2] h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-20">
        <div className="mx-auto grid max-w-7xl gap-14 md:grid-cols-[1fr_1fr]">
          <div>
            <p className="mb-3 text-[0.8rem] font-semibold tracking-[0.12em] text-sandstone uppercase">The room</p>
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
            <p className="mb-4 max-w-[46ch] text-shale">
              Full-service apartment in the heritage building. Kitchen, fireplace, air conditioning. Rates and a
              longer description will follow — this is the booking frame.
            </p>
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
            <h2 className="font-display mb-6 text-2xl">Request {room.name}</h2>
            <StayRequest presetSlug={room.slug as RoomSlug} />
          </div>
        </div>
      </section>
    </>
  );
}
