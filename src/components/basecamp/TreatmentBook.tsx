"use client";

import { cad, TREATMENT_GROUPS, TREATMENTS } from "@/data/treatments";
import { useBooking } from "@/lib/booking/context";

export function TreatmentBook() {
  const { addTreatment, setOpen } = useBooking();

  return (
    <>
      <section className="relative flex min-h-[70vh] items-end overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "linear-gradient(to top, rgba(22,23,24,0.82) 0%, rgba(22,23,24,0.28) 55%), url('/images/basecamp/lounge.jpg')",
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
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex rounded-[2px] bg-ember px-8 py-3.5 font-semibold text-white"
          >
            Book
          </button>
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
        <div className="mx-auto max-w-5xl">
          <p className="mb-3 text-[0.7rem] tracking-[0.22em] text-sandstone uppercase">The menu</p>
          <h2 className="font-display mb-4 text-4xl uppercase">What we do here.</h2>
          <p className="mb-14 max-w-[46ch] text-fossil/70">
            Prices in CAD. Add what you want. Book opens the same panel.
          </p>
          <div className="grid gap-16">
            {TREATMENT_GROUPS.map((g) => (
              <div key={g.id}>
                <h3 className="font-display mb-2 text-2xl uppercase">{g.title}</h3>
                <p className="mb-8 max-w-[46ch] text-fossil/55">{g.line}</p>
                <ul className="grid gap-x-16 gap-y-1 md:grid-cols-2">
                  {TREATMENTS.filter((t) => t.group === g.id).map((t) => (
                    <li key={t.id} className="border-b border-fossil/10">
                      <div className="flex items-center gap-3 py-4">
                        <span className="min-w-0 flex-1">
                          <span className="block text-fossil">{t.name}</span>
                          <span className="mt-1 block text-sm text-fossil/45">
                            {t.mins} · {t.line}
                          </span>
                        </span>
                        <span className="w-14 shrink-0 text-right text-sm tabular-nums text-sandstone">
                          {cad(t.price)}
                        </span>
                        <button
                          type="button"
                          onClick={() => addTreatment(t)}
                          aria-label={`Add ${t.name}`}
                          className="flex h-8 w-8 shrink-0 items-center justify-center border border-fossil/20 text-lg leading-none text-fossil/80 hover:border-ember hover:text-ember"
                        >
                          +
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
