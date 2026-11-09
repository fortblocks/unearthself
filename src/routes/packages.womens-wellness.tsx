import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { PackagesHero } from "@/components/site/PackagesHero";
import { getPackage } from "@/lib/packages";

const pkg = getPackage("womens-wellness")!;

export const Route = createFileRoute("/packages/womens-wellness")({
  head: () => ({
    meta: [{ title: "Women's Wellness Retreat — Unearth Self" }, { name: "description", content: pkg.line }],
  }),
  component: WomensWellness,
});

const TBC = "To be confirmed";

function Block({ label, title, children }: { label: string; title: string; children: ReactNode }) {
  return (
    <section className="px-6 py-16 md:py-20">
      <div className="mx-auto max-w-3xl">
        <p className="mb-3 text-[0.7rem] tracking-[0.22em] text-ember uppercase">{label}</p>
        <h2 className="font-display mb-6 text-4xl uppercase">{title}</h2>
        <div className="flex flex-col gap-4 text-lg text-fossil/80">{children}</div>
      </div>
    </section>
  );
}

const Placeholder = ({ children }: { children: ReactNode }) => <p className="text-sandstone italic">{children}</p>;

function WomensWellness() {
  return (
    <main className="overflow-hidden bg-coal text-fossil">
      <PackagesHero eyebrow="Packages · Women only" word="Women's Wellness" lede={pkg.line} image={pkg.image} />

      <Block label="The retreat" title="Slow down, on purpose.">
        <p>
          This is a women-only retreat: a few days in the Drumheller badlands to slow down, move, rest well and
          come home steadier than you arrived. The valley sits ninety minutes from Calgary, close enough to reach
          easily and far enough to feel like somewhere else.
        </p>
        <Placeholder>[To refine with Chris: fuller introduction and the tone of the retreat]</Placeholder>
      </Block>

      <Block label="The days" title="What the days hold">
        <p>Time to move, time on the land, and time to rest.</p>
        <Placeholder>[To refine with Chris: daily rhythm, activities and who leads them]</Placeholder>
      </Block>

      <Block label="Stay" title="Where you stay">
        <p>
          Nights are at Haven, four suites in a heritage house in downtown Drumheller, with kitchens and
          fireplaces. Next door is Basecamp, with treatments and heat and cold.
        </p>
        <p>
          <Link to="/haven" className="text-ember hover:underline">The Haven</Link>
          {" · "}
          <Link to="/basecamp" className="text-ember hover:underline">Basecamp</Link>
        </p>
        <Placeholder>[To refine with Chris: which suites and Basecamp sessions are included]</Placeholder>
      </Block>

      <Block label="Who" title="Who it's for">
        <p>Women who want a few quiet days away to slow down, move and rest.</p>
        <Placeholder>[To refine with Chris: experience level, fitness and anything to know before booking]</Placeholder>
      </Block>

      <section aria-label="Practical details" className="border-y border-ember/30 px-6 py-10">
        <ul className="mx-auto flex max-w-7xl flex-wrap justify-between gap-x-10 gap-y-6">
          {[
            ["Group size", TBC],
            ["Length", TBC],
            ["Price", TBC],
            ["Dates", TBC],
          ].map(([k, v]) => (
            <li key={k} className="flex flex-col">
              <span className="text-[0.7rem] tracking-[0.18em] text-sandstone uppercase">{k}</span>
              <span className="font-display text-2xl uppercase">{v}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="px-6 py-24">
        <div className="mx-auto flex max-w-3xl flex-col items-start gap-6">
          <h2 className="font-display text-4xl uppercase">Interested?</h2>
          <p className="text-lg text-fossil/80">Send an enquiry and we'll be in touch when details are set.</p>
          <div className="flex flex-wrap gap-6">
            <Link to="/book/retreat" className="inline-flex rounded-[2px] bg-ember px-8 py-3.5 font-semibold text-white">
              Enquire
            </Link>
            <Link to="/packages" className="self-center text-[0.85rem] font-semibold tracking-[0.12em] text-ember uppercase hover:underline">
              ← All packages
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
