import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { PackagesHero } from "@/components/site/PackagesHero";
import { getPackage } from "@/lib/packages";

export const Route = createFileRoute("/packages/$slug")({
  loader: ({ params }) => {
    const pkg = getPackage(params.slug);
    if (!pkg) throw notFound();
    return pkg;
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.title ?? "Package"} — Unearth Self` }, { name: "description", content: loaderData?.line ?? "" }],
  }),
  component: PackagePlaceholder,
});

function PackagePlaceholder() {
  const pkg = Route.useLoaderData();
  return (
    <main className="overflow-hidden bg-coal text-fossil">
      <PackagesHero eyebrow="Packages" word={pkg.title} lede={pkg.line} image={pkg.image} />
      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <p className="mb-8 text-lg text-fossil/80">The day-by-day for this package is not written on this page yet.</p>
          <Link to="/packages" className="text-[0.85rem] font-semibold tracking-[0.12em] text-ember uppercase hover:underline">
            ← All packages
          </Link>
        </div>
      </section>
    </main>
  );
}
