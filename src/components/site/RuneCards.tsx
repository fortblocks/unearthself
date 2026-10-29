import { useEffect, useRef, useState } from "react";

type Rune = { name: string; slug: string; line: string };

const DETAIL: Record<string, { paras: string[]; layer: string }> = {
  play: {
    paras: [
      "Play gets lost in everyday life. Somewhere between the calendar and the commute, most of us stop trying things just to see what happens.",
      "Out on the land, the usual rules loosen. There is no right answer to protect yet, so you can start before you are ready.",
      "That is where ideas come from. Not from forcing them, but from freeing yourself from the everyday mindset long enough to notice what turns up.",
    ],
    layer: "Play opens the door. Everything else walks through it.",
  },
  adaptability: {
    paras: [
      "In the modern world, the ability to change and adapt matters, at work and at home. Plans shift. People shift. The ground shifts.",
      "The badlands make this plain. The route you pictured rarely survives the first coulee, and that is information, not failure.",
      "Adaptability is noticing what has changed and choosing again, without needing the plan to have been perfect.",
    ],
    layer: "Adaptability builds on Play. The freedom to try becomes the steadiness to adjust.",
  },
  connection: {
    paras: [
      "Connection starts with yourself. Noticing how you respond, what you reach for, what you avoid. Not digging for answers, just seeing a little more clearly.",
      "Then it widens to the people beside you. You find out who you are with when the map and the weather disagree.",
      "And it reaches the place itself. The land, the light, the quiet. Connecting to your environment is part of knowing where you stand.",
    ],
    layer: "Connection builds on Play and Adaptability. Open and steady, you can meet yourself and others as you are.",
  },
  experience: {
    paras: [
      "Experience is presence. Being there, in the moment, rather than in the story you brought from the car.",
      "Most days we are half somewhere else. Out here there is room to arrive: to feel the ground, hear the wind, and let the day be the day.",
      "Nothing to fix. Nothing to achieve. Just noticing what is actually happening, while it happens.",
    ],
    layer: "Experience holds all three. Play, Adaptability and Connection, lived in the present.",
  },
};

export function RuneCards({ runes }: { runes: Rune[] }) {
  const [open, setOpen] = useState<Rune | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      triggerRef.current?.focus();
    };
  }, [open]);

  return (
    <>
      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
        {runes.map((r) => (
          <button
            key={r.name}
            type="button"
            aria-haspopup="dialog"
            onClick={(e) => {
              triggerRef.current = e.currentTarget;
              setOpen(r);
            }}
            className="flex flex-col rounded-[4px] border border-fossil/10 bg-fossil/[0.03] p-6 text-left transition duration-300 hover:border-ember/60 hover:shadow-[0_0_32px_rgba(242,104,76,0.35)] focus-visible:border-ember/60 focus-visible:shadow-[0_0_32px_rgba(242,104,76,0.35)] focus-visible:outline-none"
          >
            <span className="mb-3 flex flex-col items-start gap-4">
              <img src={`/runes/${r.slug}.svg`} alt="" className="size-12 shrink-0 brightness-0 invert" />
              <span className="font-display text-3xl uppercase">{r.name}</span>
            </span>
            <span className="block max-w-[40ch] text-fossil/70">{r.line}</span>
          </button>
        ))}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-coal/85 p-3 md:p-6"
          onClick={() => setOpen(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="rune-dialog-title"
            className="relative max-h-[94vh] w-full overflow-y-auto rounded-[4px] border border-ember/40 bg-coal p-8 text-fossil shadow-[0_0_48px_rgba(242,104,76,0.25)] md:max-h-[88vh] md:w-[min(92vw,64rem)] md:p-16"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              ref={closeRef}
              type="button"
              aria-label="Close"
              onClick={() => setOpen(null)}
              className="absolute top-4 right-4 flex size-9 items-center justify-center text-fossil/70 transition-colors hover:text-ember focus-visible:outline-2 focus-visible:outline-ember"
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
            <div className="mb-8 flex items-center gap-5 md:mb-10 md:gap-6">
              <img src={`/runes/${open.slug}.svg`} alt="" className="size-16 shrink-0 brightness-0 invert md:size-20" />
              <h3 id="rune-dialog-title" className="font-display text-4xl uppercase md:text-6xl">
                {open.name}
              </h3>
            </div>
            <div className="max-w-prose space-y-5 text-lg leading-relaxed text-fossil/85 md:text-xl">
              {DETAIL[open.slug].paras.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
            <p className="mt-8 max-w-prose text-lg leading-relaxed text-fossil md:text-xl">{DETAIL[open.slug].layer}</p>
            <p className="mt-8 text-[0.7rem] tracking-[0.18em] text-sandstone uppercase">
              Four elements. Each stands alone. Each layers on the last.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
