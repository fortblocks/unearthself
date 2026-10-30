import { Link } from "@tanstack/react-router";

export type AudienceReason = {
  title: string;
  body: string;
  image: string;
  source?: string;
};

export type AudiencePageProps = {
  word: string;
  eyebrow: string;
  lede: string;
  intro?: string[];
  introLabel?: string;
  introHeading?: string;
  heroImage: string;
  reasons: AudienceReason[];
  quote: string;
  quoteLabel: string;
  closingHeading: string;
  closingLine: string;
};

const FACTS = [
  { k: "Group", v: "6–30 people" },
  { k: "Length", v: "2–5 days" },
  { k: "From Calgary", v: "90 minutes" },
  { k: "Sleep", v: "Haven + Canalta" },
  { k: "Recovery", v: "Basecamp" },
];

const RUNES = ["play", "adaptability", "connection", "experience"];

export function AudiencePage({
  word,
  eyebrow,
  lede,
  intro,
  introLabel,
  introHeading,
  heroImage,
  reasons,
  quote,
  quoteLabel,
  closingHeading,
  closingLine,
}: AudiencePageProps) {
  return (
    <main className="overflow-hidden bg-coal text-fossil">
      {/* Editorial hero */}
      <section className="relative min-h-[100dvh] px-6 pt-32 pb-16">
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
          <h1 className="font-display text-[clamp(4.5rem,19vw,17rem)] leading-[0.82] tracking-tight uppercase">
            {word}
            <span className="text-ember">.</span>
          </h1>
          <div className="grid gap-10 md:grid-cols-[1.1fr_1fr] md:items-end">
            <p className="max-w-[34ch] text-xl leading-relaxed text-fossil/85 md:text-2xl">{lede}</p>
            <div className="relative aspect-[16/10] overflow-hidden rounded-[4px] border border-fossil/10">
              <img src={heroImage} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-coal/60 to-transparent" />
            </div>
          </div>
          <div aria-hidden="true" className="flex gap-6">
            {RUNES.map((r) => (
              <img key={r} src={`/runes/${r}.svg`} alt="" className="size-8 opacity-50 brightness-0 invert" />
            ))}
          </div>
        </div>
      </section>

      {/* Facts ribbon */}
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

      {/* Intro body copy (matches Bootcamp "What it is") */}
      {intro && intro.length > 0 ? (
        <section className="px-6 py-20">
          <div className="mx-auto max-w-3xl">
            {introLabel ? (
              <p className="mb-3 text-[0.7rem] tracking-[0.22em] text-ember uppercase">{introLabel}</p>
            ) : null}
            {introHeading ? (
              <h2 className="font-display mb-6 text-4xl uppercase">{introHeading}</h2>
            ) : null}
            {intro.map((para, i) => (
              <p key={i} className={`${i < intro.length - 1 ? "mb-4 " : ""}text-lg text-fossil/80`}>
                {para}
              </p>
            ))}
          </div>
        </section>
      ) : null}

      {/* Numbered reasons */}
      <section className="px-6 py-24 md:py-32">
        <div className="mx-auto flex max-w-7xl flex-col gap-24 md:gap-32">
          {reasons.map((r, i) => (
            <article key={r.title} className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
              <div className={i % 2 === 1 ? "md:order-2" : undefined}>
                <p className="font-display mb-4 text-[clamp(4rem,10vw,8rem)] leading-none text-ember">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h2 className="font-display mb-5 text-[clamp(2rem,4vw,3.25rem)] leading-[0.95] uppercase">
                  {r.title}
                </h2>
                <p className="max-w-[46ch] text-lg leading-relaxed text-fossil/80">{r.body}</p>
              </div>
              <div className={`aspect-[4/5] overflow-hidden rounded-[4px] ${i % 2 === 1 ? "md:order-1" : ""}`}>
                <img src={r.image} alt="" className="h-full w-full object-cover" />
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Pull quote */}
      <section className="bg-ember px-6 py-24 text-coal">
        <figure className="mx-auto max-w-6xl">
          <blockquote className="font-display text-[clamp(2.5rem,7vw,6rem)] leading-[0.9] uppercase">
            “{quote}”
          </blockquote>
          <figcaption className="mt-8 text-[0.72rem] tracking-[0.28em] uppercase">{quoteLabel}</figcaption>
        </figure>
      </section>

      {/* Closing CTA */}
      <section className="px-6 py-24">
        <div className="mx-auto flex max-w-7xl flex-col gap-10 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="font-display text-[clamp(2.5rem,6vw,5rem)] leading-[0.9] uppercase">{closingHeading}</h2>
            <p className="mt-5 max-w-[46ch] text-lg text-fossil/75">{closingLine}</p>
          </div>
          <Link
            to="/book/retreat"
            className="inline-flex shrink-0 rounded-[2px] bg-ember px-8 py-4 text-[0.85rem] font-semibold tracking-[0.16em] text-coal uppercase transition hover:shadow-[0_0_32px_rgba(242,104,76,0.45)]"
          >
            Start a conversation
          </Link>
        </div>
      </section>
    </main>
  );
}
