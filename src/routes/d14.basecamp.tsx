import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/d14/basecamp")({ component: BasecampRoute });

const suites = [
  { name: "Elowen", sleeps: "5", img: "/images/haven/elowen-1.jpg" },
  { name: "Hidden Hollow", sleeps: "4", img: "/images/haven/hidden-hollow-1.jpg" },
  { name: "River Blossom", sleeps: "4", img: "/images/haven/river-blossom-1.jpg" },
  { name: "Water Mark", sleeps: "4", img: "/images/haven/water-mark-1.jpg" },
];

const treatments = [
  { name: "Deep tissue", mins: "60 / 90", who: "In-house + day guest" },
  { name: "Red light", mins: "20", who: "Day guest" },
  { name: "Contrast", mins: "45", who: "In-house" },
];

function BasecampRoute() {
  return (
    <main className="bg-fossil text-coal">
      <header className="border-b border-coal/10 px-6 py-8">
        <p className="mb-1 text-[0.7rem] tracking-[0.22em] text-shale uppercase">Route C · inventory first</p>
        <h1 className="font-display text-4xl md:text-5xl">Haven + spa</h1>
        <p className="mt-2 max-w-[42ch] text-shale">
          Four suites. Treatments on the same book. Locals welcome. Rates on request until D01.
        </p>
      </header>

      <section className="px-6 py-10">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="font-display text-2xl">Suites</h2>
          <span className="text-sm text-shale">4 keys · downtown Drumheller</span>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {suites.map((s) => (
            <article key={s.name} className="border border-coal/10 bg-white">
              <div className="aspect-[4/3] overflow-hidden bg-shale">
                <img src={s.img} alt="" className="h-full w-full object-cover" />
              </div>
              <div className="flex items-center justify-between p-4">
                <div>
                  <h3 className="font-display text-xl">{s.name}</h3>
                  <p className="text-sm text-shale">Sleeps {s.sleeps}</p>
                </div>
                <Link
                  to="/haven"
                  className="rounded-[2px] bg-ember px-3 py-2 text-[0.75rem] font-semibold text-white"
                >
                  Book
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="px-6 pb-14">
        <h2 className="font-display mb-4 text-2xl">Treatments</h2>
        <div className="border border-coal/10 bg-white">
          {treatments.map((t, i) => (
            <div
              key={t.name}
              className={`flex flex-wrap items-center justify-between gap-3 px-4 py-4 ${
                i !== treatments.length - 1 ? "border-b border-coal/10" : ""
              }`}
            >
              <div>
                <p className="font-semibold">{t.name}</p>
                <p className="text-sm text-shale">{t.who}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-shale">{t.mins} min</span>
                <button
                  type="button"
                  className="rounded-[2px] border border-coal/20 px-3 py-2 text-[0.75rem] font-semibold"
                >
                  Request
                </button>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[0.8rem] text-shale">
          Mixed-use house. Spa day guests share the building with overnight stays. Before you book:
          contraindications live with the practitioner, not in the hero.
        </p>
      </section>
    </main>
  );
}
