import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { POSTS, postBySlug } from "@/data/journal";

export const Route = createFileRoute("/journal/$slug")({
  loader: ({ params }) => {
    const post = postBySlug(params.slug);
    if (!post) throw notFound();
    return post;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData.title} - Journal - Unearth Self` },
      { name: "description", content: loaderData.dek },
    ],
  }),
  component: JournalArticle,
});

function JournalArticle() {
  const post = Route.useLoaderData();
  const others = POSTS.filter((p) => p.slug !== post.slug);

  return (
    <main className="bg-coal text-fossil">
      <section className="relative h-[60vh] min-h-[22rem] overflow-hidden">
        <img src={post.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
      </section>

      <article className="px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <p className="mb-4 text-[0.72rem] tracking-[0.28em] text-sandstone uppercase">
            {post.kicker} · {post.date}
          </p>
          <h1 className="font-display mb-6 text-[clamp(2.4rem,6vw,4.4rem)] leading-[0.9] uppercase">
            {post.title}
          </h1>
          <p className="mb-12 max-w-[46ch] text-lg text-fossil/80">{post.dek}</p>
          <div className="space-y-6 text-lg leading-relaxed text-fossil/80">
            {post.body.map((para) => (
              <p key={para.slice(0, 32)}>{para}</p>
            ))}
          </div>
          <Link to="/journal" className="mt-14 inline-block text-sandstone hover:text-fossil">
            ← Journal
          </Link>
        </div>
      </article>

      <section className="border-t border-fossil/10 px-6 py-16">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
          {others.map((p, i) => (
            <Link
              key={p.slug}
              to="/journal/$slug"
              params={{ slug: p.slug }}
              className={`block max-w-[20rem] hover:text-sandstone ${i === 1 ? "sm:text-right sm:ml-auto" : ""}`}
            >
              <p className="mb-2 text-[0.7rem] tracking-[0.18em] text-sandstone uppercase">{p.kicker}</p>
              <h2 className="font-display text-3xl uppercase">{p.title}</h2>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
