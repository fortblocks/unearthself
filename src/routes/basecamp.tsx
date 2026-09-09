import { createFileRoute, Link } from "@tanstack/react-router";
import { TREATMENT_GROUPS, TREATMENTS } from "@/data/treatments";

export const Route = createFileRoute("/basecamp")({
  component: BasecampPage,
  head: () => ({
    meta: [
      { title: "Basecamp - Unearth Self" },
      {
        name: "description",
        content:
          "Treatments, heat and cold, and the house next to Haven. Day guests welcome. Drumheller.",
      },
    ],
  }),
});

function BasecampPage() {
  return (
    <main className="bg-coal text-fossil">
      <section className="relative flex min-h-[70vh] items-end overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "linear-gradient(to top, rgba(22,23,24,0.88) 0%, rgba(22,23,24,0.3) 50%), url('/images/haven/exterior/exterior-01.jpg')",
          }}
        />
        <div className="relative z-10 mx-auto w-full max-w-5xl px-6 pb-16 pt-28">
          <p className="mb-4 text-[0.72rem] tracking-[0.28em] text-sandstone uppercase">
            Drumheller - treatments and the house
          </p>
          <h1 className="font-display mb-5 text-[clamp(2.6rem,7vw,5.2rem)] leading-[0.9] uppercase">
            Come in from
            <br />
            the land.
          </h1>
          <p className="mb-8 max-w-[40ch] text-lg text-fossil/85">
            Basecamp is heat, cold, hands and quiet. Open to guests in Haven and to anyone driving in
            for the day.
          </p>
          <Link
            to="/book/treatment"
            className="inline-flex rounded-[2px] bg-ember px-8 py-3.5 font-semibold text-white"
          >
            Request a treatment
          </Link>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <p className="mb-3 text-[0.7rem] tracking-[0.22em] text-sandstone uppercase">The house</p>
          <h2 className="font-display mb-6 text-4xl uppercase">Not a gym floor with a candle.</h2>
          <p className="mb-4 text-lg text-fossil/80">
            Fire and Ice for sauna, steam and plunge. Tables for bodywork and facials. A room for a
            small class. Haven is the other door of the same building if you want to sleep here.
          </p>
          <p className="text-lg text-fossil/80">
            Locals and day guests use the same rooms as people on a Bootcamp. We keep the diaries
            apart so a private group is not sharing the steam with the town.
          </p>
        </div>
      </section>

      <section id="menu" className="border-t border-fossil/10 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <p className="mb-3 text-[0.7rem] tracking-[0.22em] text-sandstone uppercase">The menu</p>
          <h2 className="font-display mb-4 text-4xl uppercase">What we do here.</h2>
          <p className="mb-12 max-w-[46ch] text-fossil/70">
            Request a time. We send the rate and confirm the room before anything is charged.
          </p>
          <div className="grid gap-16">
            {TREATMENT_GROUPS.map((g) => (
              <div key={g.id}>
                <h3 className="font-display mb-2 text-2xl uppercase">{g.title}</h3>
                <p className="mb-6 max-w-[46ch] text-fossil/60">{g.line}</p>
                <ul className="grid gap-px border-t border-fossil/10 sm:grid-cols-2">
                  {TREATMENTS.filter((t) => t.group === g.id).map((t) => (
                    <li key={t.id} className="flex items-baseline justify-between gap-4 border-b border-fossil/10 py-4">
                      <div>
                        <p className="text-fossil">{t.name}</p>
                        <p className="text-sm text-fossil/50">{t.line}</p>
                      </div>
                      <p className="shrink-0 text-sm text-sandstone">{t.mins}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <Link
            to="/book/treatment"
            className="mt-12 inline-flex rounded-[2px] bg-ember px-8 py-3.5 font-semibold text-white"
          >
            Request a treatment
          </Link>
        </div>
      </section>
    </main>
  );
}
