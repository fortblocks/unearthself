import type { ReactNode } from "react";

const RUNES = ["play", "adaptability", "connection", "experience"];

export function PackagesHero({ eyebrow, word, lede, image, children }: { eyebrow: string; word: string; lede: string; image?: string; children?: ReactNode }) {
  return (
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
          <p className="text-[0.72rem] tracking-[0.28em] text-sandstone uppercase">{eyebrow}</p>
        </div>
        <h1 className="font-display text-[clamp(3.5rem,13vw,12rem)] leading-[0.82] tracking-tight uppercase">
          {word}
          <span className="text-ember">.</span>
        </h1>
        <div className={`grid gap-10 md:items-end ${image ? "md:grid-cols-[1.1fr_1fr]" : ""}`}>
          <p className="max-w-[34ch] text-xl leading-relaxed text-fossil/85 md:text-2xl">{lede}</p>
          {image ? (
            <div className="relative aspect-[16/10] overflow-hidden rounded-[4px] border border-fossil/10">
              <img src={image} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-coal/60 to-transparent" />
            </div>
          ) : null}
        </div>
        {children}
        <div aria-hidden="true" className="flex gap-6">
          {RUNES.map((r) => (
            <img key={r} src={`/runes/${r}.svg`} alt="" className="size-8 opacity-50 brightness-0 invert" />
          ))}
        </div>
      </div>
    </section>
  );
}
