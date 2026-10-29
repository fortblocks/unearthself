import { useEffect, useRef, useState } from "react";

type Rune = { name: string; slug: string; line: string };

const DETAIL: Record<string, string> = {
  play: "Play gets lost in everyday life. Freed from your everyday mindset, ideas start to come.",
  adaptability: "In the modern world, the ability to change and adapt matters, at work and at home.",
  connection:
    "Connecting to yourself, so you can truly understand yourself. Connecting to others. Connecting to your environment.",
  experience: "Presence. Being there, in the moment.",
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
          className="fixed inset-0 z-[60] flex items-center justify-center bg-coal/80 px-6"
          onClick={() => setOpen(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="rune-dialog-title"
            className="relative w-full max-w-lg rounded-[4px] border border-ember/40 bg-coal p-8 text-fossil shadow-[0_0_48px_rgba(242,104,76,0.25)]"
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
            <div className="mb-5 flex items-center gap-4">
              <img src={`/runes/${open.slug}.svg`} alt="" className="size-12 shrink-0 brightness-0 invert" />
              <h3 id="rune-dialog-title" className="font-display text-3xl uppercase">
                {open.name}
              </h3>
            </div>
            <p className="mb-6 text-lg text-fossil/85">{DETAIL[open.slug]}</p>
            <p className="text-[0.7rem] tracking-[0.18em] text-sandstone uppercase">
              Four elements. Each stands alone. Each layers on the last.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
