import { createFileRoute, Link } from "@tanstack/react-router";
import { POSTS } from "@/data/journal";

export const Route = createFileRoute("/journal/")({
  component: JournalIndex,
  head: () => ({
    meta: [
      { title: "Journal - Unearth Self" },
      {
        name: "description",
        content: "Field notes from Drumheller. The town, the land, the work underneath.",
      },
    ],
  }),
});

function JournalIndex() {
  return (
    <main className="bg-coal text-fossil">
      <section className="px-6 pt-32 pb-12">
        <div className="mx-auto max-w-3xl">
          <p className="mb-4 text-[0.72rem] tracking-[0.28em] text-sandstone uppercase">Journal</p>
          <h1 className="font-display mb-6 text-[clamp(2.6rem,7vw,5rem)] leading-[0.9] uppercase">
            Field notes.
          </h1>
          <p className="max-w-[46ch] text-lg text-fossil/80">
            The town. The land. The language we are still writing. Not a blog.
          </p>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-3">
          {POSTS.map((p) => (
            <article key={p.slug} className="border-t border-fossil/15 pt-5">
              <Link to="/journal/$slug" params={{ slug: p.slug }} className="block group">
                <div className="mb-5 aspect-[3/2] overflow-hidden bg-shale">
                  <img
                    src={p.image}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </div>
                <p className="mb-2 text-[0.7rem] tracking-[0.18em] text-sandstone uppercase">
                  {p.kicker} · {p.date}
                </p>
                <h2 className="font-display mb-3 text-3xl uppercase">{p.title}</h2>
                <p className="text-fossil/65">{p.dek}</p>
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
