"use client";

import { useEffect } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { MENU_NOTE, PLACE_HEADLINE, PLACE_LABEL, PLACE_PARAGRAPHS } from "@/data/basecampCopy";
import { cad, TREATMENT_GROUPS, TREATMENTS } from "@/data/treatments";
import { useBooking } from "@/lib/booking/context";

export function TreatmentBook() {
  const { addTreatment, setOpen, lines } = useBooking();
  const hash = useRouterState({ select: (s) => s.location.hash });
  const [lead, ...rest] = PLACE_PARAGRAPHS;

  useEffect(() => {
    if (hash.replace("#", "") !== "menu") return;
    document.getElementById("menu")?.scrollIntoView();
  }, [hash]);

  return (
    <>
      <section className="relative flex min-h-[70vh] items-end overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "linear-gradient(to top, rgba(22,23,24,0.88) 0%, rgba(22,23,24,0.45) 48%, rgba(22,23,24,0.28) 100%), url('/images/basecamp/lounge.jpg')",
          }}
        />
        <div className="relative z-10 mx-auto w-full max-w-5xl px-6 pb-16 pt-28">
          <p className="mb-4 text-[0.72rem] tracking-[0.28em] text-sandstone uppercase">{PLACE_LABEL}</p>
          <h1 className="font-display mb-5 max-w-[16ch] text-[clamp(2.6rem,7vw,5.2rem)] leading-[0.9] uppercase">
            {PLACE_HEADLINE}
          </h1>
          <p className="mb-8 max-w-[42ch] text-lg text-fossil/85">{lead}</p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex rounded-[2px] bg-ember px-8 py-3.5 font-semibold text-white"
          >
            Book
          </button>
        </div>
      </section>

      <section className="px-6 pt-16 pb-4">
        <div className="mx-auto max-w-3xl space-y-4 text-lg text-fossil/80">
          {rest.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
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

      <section id="menu" className="scroll-mt-24 border-t border-fossil/10 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <p className="mb-3 text-[0.7rem] tracking-[0.22em] text-sandstone uppercase">The menu</p>
          <h2 className="font-display mb-4 text-4xl uppercase">What we do here.</h2>
          <p className="mb-14 max-w-[46ch] text-fossil/70">{MENU_NOTE}</p>
          <div className="grid gap-16">
            {TREATMENT_GROUPS.map((g) => (
              <div key={g.id}>
                <h3 className="font-display mb-2 text-2xl uppercase">{g.title}</h3>
                <p className="mb-8 max-w-[46ch] text-fossil/55">{g.line}</p>
                <ul className="grid gap-x-16 gap-y-1 md:grid-cols-2">
                  {TREATMENTS.filter((t) => t.group === g.id).map((t) => {
                    const added = lines.some((l) => l.treatmentId === t.id);
                    return (
                      <li key={t.id} className="border-b border-fossil/10">
                        <div className="flex items-center gap-3">
                          <Link
                            to="/basecamp/$slug"
                            params={{ slug: t.id }}
                            className="group flex min-w-0 flex-1 items-center gap-3 py-4 text-left outline-none hover:text-sandstone focus-visible:text-sandstone focus-visible:underline"
                          >
                            <span className="min-w-0 flex-1">
                              <span className="block group-hover:text-sandstone group-focus-visible:text-sandstone">{t.name}</span>
                              <span className="mt-1 block text-sm text-fossil/45">
                                {t.mins} · {t.line}
                              </span>
                            </span>
                            <span className="w-14 shrink-0 text-right text-sm tabular-nums text-sandstone">
                              {cad(t.price)}
                            </span>
                          </Link>
                          <button
                            type="button"
                            onClick={() => addTreatment(t)}
                            aria-label={added ? `${t.name} is in the booking` : `Add ${t.name}`}
                            aria-pressed={added}
                            className={
                              "flex h-8 w-8 shrink-0 items-center justify-center text-lg leading-none " +
                              (added
                                ? "bg-ember text-white"
                                : "border border-fossil/20 text-fossil/80 hover:border-ember hover:text-ember")
                            }
                          >
                            +
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
