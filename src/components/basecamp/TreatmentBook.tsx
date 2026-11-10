"use client";

import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import {
  HERO_KICKER,
  HERO_SENTENCE,
  MENU_HEADING,
  MENU_LABEL,
  MENU_NOTE,
  STORY_LABEL,
  WHAT_IT_IS,
  WHAT_IT_IS_PARAGRAPHS,
} from "@/data/basecampCopy";
import { cad, TREATMENT_GROUPS, TREATMENTS, type Treatment } from "@/data/treatments";
import { useBooking } from "@/lib/booking/context";

const PARAGRAPH_BREAK = /\n\s*\n/;

export function TreatmentBook() {
  const { addTreatment, setOpen, lines } = useBooking();
  const [openId, setOpenId] = useState<string | null>(null);
  const hash = useRouterState({ select: (s) => s.location.hash });

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
              "linear-gradient(to top, rgba(22,23,24,0.78) 0%, rgba(22,23,24,0.12) 50%), url('/images/basecamp/lounge.jpg')",
          }}
        />
        <div className="relative z-10 mx-auto w-full max-w-5xl px-6 pb-16 pt-28">
          <p className="mb-4 text-[0.72rem] tracking-[0.28em] text-sandstone uppercase">{HERO_KICKER}</p>
          <h1 className="font-display mb-5 text-[clamp(2.6rem,7vw,5.2rem)] leading-[0.9] min-h-[1.8em] uppercase">
            Badlands
            <br />
            Basecamp
          </h1>
          <p className="mb-8 min-h-[5.25rem] max-w-[40ch] text-lg text-fossil/85">{HERO_SENTENCE}</p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex rounded-[2px] bg-ember px-8 py-3.5 font-semibold text-white"
          >
            Book your visit
          </button>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <p className="mb-3 text-[0.7rem] tracking-[0.22em] text-sandstone uppercase">{STORY_LABEL}</p>
          <h2 className="font-display mb-6 text-4xl uppercase">{WHAT_IT_IS}</h2>
          {WHAT_IT_IS_PARAGRAPHS.map((paragraph, index) => (
            <p
              key={paragraph}
              className={
                index === WHAT_IT_IS_PARAGRAPHS.length - 1
                  ? "text-lg text-fossil/80"
                  : "mb-4 text-lg text-fossil/80"
              }
            >
              {paragraph}
            </p>
          ))}
        </div>
      </section>

      <section id="menu" className="scroll-mt-24 border-t border-fossil/10 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <p className="mb-3 text-[0.7rem] tracking-[0.22em] text-sandstone uppercase">{MENU_LABEL}</p>
          <h2 className="font-display mb-4 text-4xl uppercase">{MENU_HEADING}</h2>
          <p className="mb-14 max-w-[46ch] text-fossil/70">{MENU_NOTE}</p>
          <div className="grid gap-16">
            {TREATMENT_GROUPS.map((g) => (
              <div key={g.id}>
                <h3 className="font-display mb-2 text-2xl uppercase">{g.title}</h3>
                <p className="mb-8 max-w-[46ch] text-fossil/55">{g.line}</p>
                <ul className="grid gap-x-16 gap-y-1 md:grid-cols-2">
                  {TREATMENTS.filter((t) => t.group === g.id).map((t) => (
                    <TreatmentRow
                      key={t.id}
                      treatment={t}
                      open={openId === t.id}
                      added={lines.some((l) => l.treatmentId === t.id)}
                      onToggle={() => setOpenId((current) => (current === t.id ? null : t.id))}
                      onBook={() => addTreatment(t)}
                    />
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

function TreatmentRow({
  treatment,
  open,
  added,
  onToggle,
  onBook,
}: {
  treatment: Treatment;
  open: boolean;
  added: boolean;
  onToggle: () => void;
  onBook: () => void;
}) {
  const description = treatment.description?.trim() ?? "";
  const paragraphs = description ? description.split(PARAGRAPH_BREAK) : [];
  const panelId = `treatment-${treatment.id}`;
  const buttonId = `${panelId}-button`;

  return (
    <li className="border-b border-fossil/10">
      <div className="flex items-center gap-3">
        <button
          type="button"
          id={buttonId}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="group flex min-w-0 flex-1 items-center gap-3 py-4 text-left outline-none hover:text-sandstone focus-visible:text-sandstone focus-visible:underline"
        >
          <span className="min-w-0 flex-1">
            <span className="block group-hover:text-sandstone group-focus-visible:text-sandstone">{treatment.name}</span>
            <span className="mt-1 block text-sm text-fossil/45">{treatment.line}</span>
          </span>
          <span className="w-14 shrink-0 text-right text-sm tabular-nums text-sandstone">{cad(treatment.price)}</span>
        </button>
        <button
          type="button"
          onClick={onBook}
          aria-label={added ? `${treatment.name} is in the booking` : `Add ${treatment.name}`}
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
      <div id={panelId} role="region" aria-labelledby={buttonId} hidden={!open} className="max-w-[46ch] pb-5 pr-11">
        {paragraphs.length > 0 ? (
          <div className="space-y-3 text-base leading-relaxed text-fossil/80">
            {paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        ) : (
          <p className="text-base leading-relaxed text-fossil/75">
            {treatment.mins}
            <span className="mx-2 text-fossil/30" aria-hidden="true">
              ·
            </span>
            {treatment.line}
          </p>
        )}
      </div>
    </li>
  );
}
