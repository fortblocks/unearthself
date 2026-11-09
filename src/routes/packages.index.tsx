import { createFileRoute, Link } from "@tanstack/react-router";
import { PackagesHero } from "@/components/site/PackagesHero";
import { PACKAGES } from "@/lib/packages";

export const Route = createFileRoute("/packages/")({
  head: () => ({
    meta: [
      { title: "Packages — Unearth Self" },
      { name: "description", content: "Themed retreats in the Drumheller badlands: wellness, hunting, photography, night sky, fossils and geology, and writing." },
    ],
  }),
  component: PackagesIndex,
});

function PackagesIndex() {
  return (
    <main className="overflow-hidden bg-coal text-fossil">
      <PackagesHero eyebrow="Experiences · Drumheller badlands" word="Packages" lede="Six ways to spend a few days on the land." />
      <section className="px-6 py-20 md:py-28">
        <ul className="mx-auto grid max-w-7xl gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {PACKAGES.map((p) => (
            <li key={p.slug} className="flex flex-col overflow-hidden rounded-[4px] border border-fossil/10">
              <div className="aspect-[4/3] overflow-hidden">
                <img src={p.image} alt={p.alt} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.03]" />
              </div>
              <div className="flex flex-1 flex-col gap-4 p-6">
                <h2 className="font-display text-3xl uppercase">{p.title}</h2>
                <p className="flex-1 text-lg text-fossil/80">{p.line}</p>
                <Link to="/packages/$slug" params={{ slug: p.slug }} className="text-[0.85rem] font-semibold tracking-[0.12em] text-ember uppercase hover:underline">
                  Learn more →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
