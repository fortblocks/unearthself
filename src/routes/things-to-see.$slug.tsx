import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { sightBySlug } from "@/data/sights";

export const Route = createFileRoute("/things-to-see/$slug")({
  loader: ({ params }) => {
    const sight = sightBySlug(params.slug);
    if (!sight) throw notFound();
    return sight;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.name ?? "Things to See"} - Unearth Self` },
      { name: "description", content: loaderData?.line ?? "" },
    ],
  }),
  component: SightPage,
});

function SightPage() {
  const sight = Route.useLoaderData();

  return (
    <main className="bg-coal text-fossil">
      <article className="px-6 pt-32 pb-24">
        <div className="mx-auto max-w-3xl">
          <p className="mb-4 text-[0.72rem] tracking-[0.28em] text-sandstone uppercase">{sight.area}</p>
          <h1 className="font-display mb-8 text-[clamp(2.4rem,6vw,4.5rem)] leading-[0.9] uppercase">
            {sight.name}
          </h1>
          {sight.image ? (
            <img
              src={sight.image}
              alt={sight.imageAlt ?? ""}
              className="mb-8 aspect-[16/9] w-full object-cover"
            />
          ) : null}
          {sight.paragraphs.map((paragraph) => (
            <p key={paragraph} className="mb-4 text-lg leading-relaxed text-fossil/80">
              {paragraph}
            </p>
          ))}
          <a
            href={sight.website}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex rounded-[2px] bg-ember px-7 py-3.5 text-[0.78rem] font-semibold tracking-[0.16em] text-white uppercase"
          >
            {sight.websiteLabel}
          </a>
          <p className="mt-10">
            <Link
              to="/things-to-see"
              className="text-[0.85rem] font-semibold tracking-[0.12em] text-ember uppercase hover:underline"
            >
              All the things to see
            </Link>
          </p>
        </div>
      </article>
    </main>
  );
}
