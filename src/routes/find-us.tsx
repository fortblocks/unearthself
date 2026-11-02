import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { HAVEN_ADDRESS } from "@/data/rooms";

export const Route = createFileRoute("/find-us")({
  head: () => ({
    meta: [
      { title: "Find Us — Unearth Self" },
      { name: "description", content: `Haven and Basecamp, ${HAVEN_ADDRESS}. Directions from Calgary and Edmonton.` },
    ],
  }),
  component: FindUs,
});

// Pin at the centroid of OSM building way 1549132263: the penultimate building on the east side
// of 4 Street West, south of 3 Avenue West, just before the curve into 3 Street West.
const LAT = 51.463113;
const LON = -112.713121;
const BBOX = [LON - 0.004, LAT - 0.002, LON + 0.004, LAT + 0.002].join(",");
const OSM_EMBED = `https://www.openstreetmap.org/export/embed.html?bbox=${BBOX}&layer=mapnik&marker=${LAT},${LON}`;
const Q = encodeURIComponent(HAVEN_ADDRESS);
const GOOGLE = `https://www.google.com/maps/search/?api=1&query=${Q}`;
const APPLE = `https://maps.apple.com/?q=${Q}`;

const FACTS = [
  { k: "From Calgary", v: "90 minutes" },
  { k: "Sleep", v: "Haven" },
  { k: "Recovery", v: "Basecamp, next door" },
  { k: "Parking", v: "On site" },
];

const RUNES = ["play", "adaptability", "connection", "experience"];

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        });
      }}
      className="rounded-[2px] border border-ember px-4 py-2 text-[0.8rem] font-semibold tracking-[0.12em] text-ember uppercase hover:bg-ember hover:text-white"
    >
      {done ? "Copied" : "Copy"}
    </button>
  );
}

function Steps({ items }: { items: string[] }) {
  return (
    <ol className="flex list-decimal flex-col gap-3 pl-6 text-lg text-fossil/80 marker:text-ember">
      {items.map((s) => (
        <li key={s}>{s}</li>
      ))}
    </ol>
  );
}

function FindUs() {
  return (
    <main className="overflow-hidden bg-coal text-fossil">
      <section className="relative px-6 pt-32 pb-16">
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
            <p className="text-[0.72rem] tracking-[0.28em] text-sandstone uppercase">Haven + Basecamp · Drumheller</p>
          </div>
          <h1 className="font-display text-[clamp(4.5rem,19vw,17rem)] leading-[0.82] tracking-tight uppercase">
            Find us<span className="text-ember">.</span>
          </h1>
          <p className="max-w-[34ch] text-xl leading-relaxed text-fossil/85 md:text-2xl">
            A heritage house on 4 Street West in downtown Drumheller, with Basecamp next door.
          </p>
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
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1.4fr_1fr] md:items-start">
          <div className="overflow-hidden rounded-[4px] border border-fossil/15">
            <iframe
              title={`Map showing ${HAVEN_ADDRESS}`}
              src={OSM_EMBED}
              loading="lazy"
              className="block aspect-[4/3] w-full grayscale-[35%] contrast-[1.05]"
            />
            <div className="flex flex-wrap gap-6 border-t border-fossil/15 px-5 py-4 text-[0.85rem] font-semibold tracking-[0.12em] uppercase">
              <a href={GOOGLE} target="_blank" rel="noopener noreferrer" className="text-ember hover:underline">Open in Google Maps ↗</a>
              <a href={APPLE} target="_blank" rel="noopener noreferrer" className="text-ember hover:underline">Open in Apple Maps ↗</a>
            </div>
          </div>
          <div className="rounded-[4px] border border-ember/40 p-6">
            <p className="mb-3 text-[0.7rem] tracking-[0.22em] text-ember uppercase">Type this into your sat nav</p>
            <p className="mb-5 font-mono text-xl break-words text-fossil select-all">{HAVEN_ADDRESS}</p>
            <CopyButton text={HAVEN_ADDRESS} />
            <p className="mt-6 text-lg text-fossil/80">Haven and Basecamp are next door to each other, so one address gets you to both.</p>
          </div>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <p className="mb-3 text-[0.7rem] tracking-[0.22em] text-ember uppercase">From Calgary · about 138 km, 1 hr 30 min</p>
          <h2 className="font-display mb-6 text-4xl uppercase">Driving from Calgary</h2>
          <Steps
            items={[
              "Head north out of the city on Highway 2 (Deerfoot Trail).",
              "Turn east onto Highway 72 towards Beiseker.",
              "At Beiseker, Highway 72 becomes Highway 9. Stay on Highway 9 east across the prairie.",
              "Highway 9 drops into the Red Deer River valley and brings you into Drumheller.",
            ]}
          />
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <p className="mb-3 text-[0.7rem] tracking-[0.22em] text-ember uppercase">From Edmonton · about 280 km, 3 hr</p>
          <h2 className="font-display mb-6 text-4xl uppercase">Driving from Edmonton</h2>
          <Steps
            items={[
              "Head south on Highway 21.",
              "Join Highway 9 east and follow it into Drumheller.",
            ]}
          />
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <p className="mb-3 text-[0.7rem] tracking-[0.22em] text-ember uppercase">In town</p>
          <h2 className="font-display mb-6 text-4xl uppercase">To the door</h2>
          <Steps
            items={[
              "In North Drumheller, turn onto 4 Street West from Riverside Drive West and head south.",
              "Continue past 3 Avenue West to the bottom of the street.",
              "Haven is the second-to-last building, on the left, just before the road curves round into 3 Street West.",
            ]}
          />
          <p className="mt-4 text-lg text-fossil/80">There is on-site parking at Haven.</p>
        </div>
      </section>

      <section className="px-6 pt-8 pb-24">
        <div className="mx-auto flex max-w-3xl flex-wrap gap-6">
          <Link to="/haven" className="inline-flex rounded-[2px] bg-ember px-8 py-3.5 font-semibold text-white">The Haven</Link>
          <Link to="/book/retreat" className="self-center text-[0.85rem] font-semibold tracking-[0.12em] text-ember uppercase hover:underline">Inquiries →</Link>
        </div>
      </section>
    </main>
  );
}
