"use client";

import { Link } from "@tanstack/react-router";
import { cad, TREATMENT_GROUPS, type Treatment } from "@/data/treatments";
import { useBooking } from "@/lib/booking/context";

const PARAGRAPH_BREAK = /\n\s*\n/;

export function TreatmentDetail({ treatment }: { treatment: Treatment }) {
  const { addTreatment } = useBooking();
  const group = TREATMENT_GROUPS.find((item) => item.id === treatment.group);
  const description = treatment.description?.trim() ?? "";
  const paragraphs = description ? description.split(PARAGRAPH_BREAK) : [];

  return (
    <main className="bg-coal text-fossil">
      <article className="px-6 pt-28 pb-24">
        <div className="mx-auto max-w-3xl">
          <Link
            to="/basecamp"
            hash="menu"
            className="mb-10 inline-block text-[0.7rem] tracking-[0.22em] text-sandstone uppercase outline-none hover:text-fossil focus-visible:text-fossil"
          >
            ← Basecamp menu
          </Link>
          <p className="mb-3 text-[0.7rem] tracking-[0.22em] text-sandstone uppercase">
            {group?.title ?? "Basecamp"}
          </p>
          <h1 className="font-display mb-6 text-[clamp(2.6rem,7vw,5.2rem)] leading-[0.9] uppercase">
            {treatment.name}
          </h1>
          <p className="text-lg text-fossil/80">
            {treatment.mins}
            <span className="mx-3 text-fossil/30" aria-hidden="true">
              ·
            </span>
            <span className="text-sandstone">{cad(treatment.price)}</span>
          </p>
          {treatment.line ? (
            <p className="mt-6 max-w-[46ch] text-lg text-fossil/70">{treatment.line}</p>
          ) : null}
          {paragraphs.length > 0 ? (
            <div className="mt-8 max-w-[52ch] space-y-4 text-lg leading-relaxed text-fossil/80">
              {paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => addTreatment(treatment)}
            className="mt-10 inline-flex rounded-[2px] bg-ember px-8 py-3.5 font-semibold text-white"
          >
            Book
          </button>
        </div>
      </article>
    </main>
  );
}
