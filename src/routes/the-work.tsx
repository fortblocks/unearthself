import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/the-work")({
  component: TheWorkPage,
  head: () => ({
    meta: [
      { title: "The Work - Unearth Self" },
      {
        name: "description",
        content: "PACE is the path. Unearth Self is the purpose. Echo and HAM are living work, not a finished course.",
      },
    ],
  }),
});

const runes = [
  {
    name: "Play",
    slug: "play",
    line: "Start before you have the right answer. The land rewards people who will try the next step.",
  },
  {
    name: "Adaptability",
    slug: "adaptability",
    line: "The plan will not survive the coulee. That is information, not failure.",
  },
  {
    name: "Connection",
    slug: "connection",
    line: "You find out who you are with when the map and the weather disagree.",
  },
  {
    name: "Experience",
    slug: "experience",
    line: "Be in the thing that is happening. Not the story you brought from the car.",
  },
];

function TheWorkPage() {
  return (
    <main className="bg-coal text-fossil">
      <section className="relative h-[70vh] min-h-[28rem] overflow-hidden">
        <img
          src="/images/work/horseshoe.jpg"
          alt="A small group walking the floor of Horseshoe Canyon"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </section>

      <section className="px-6 pt-16 pb-16">
        <div className="mx-auto max-w-3xl">
          <p className="mb-4 text-[0.72rem] tracking-[0.28em] text-sandstone uppercase">The Work</p>
          <h1 className="font-display mb-6 text-[clamp(2.6rem,7vw,5rem)] leading-[0.9] uppercase">
            PACE is the path.
            <br />
            Unearth Self is the purpose.
          </h1>
          <p className="max-w-[46ch] text-lg text-fossil/80">
            The live product is the expedition. What follows is the language underneath it — still being
            forged. We do not sell a finished methodology on this page.
          </p>
        </div>
      </section>

      <section className="border-t border-fossil/10 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <p className="mb-3 text-[0.7rem] tracking-[0.22em] text-sandstone uppercase">PACE</p>
          <h2 className="font-display mb-12 text-4xl uppercase">Four Runes. One expedition.</h2>
          <div className="grid gap-10 md:grid-cols-2">
            {runes.map((r) => (
              <article key={r.name} className="border-t border-fossil/15 pt-5">
                <div className="mb-3 flex items-center gap-4">
                  <img
                    src={`/runes/${r.slug}.svg`}
                    alt=""
                    className="size-12 shrink-0 brightness-0 invert"
                  />
                  <h3 className="font-display text-3xl uppercase">{r.name}</h3>
                </div>
                <p className="max-w-[40ch] text-fossil/70">{r.line}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-fossil/10 px-6 py-20">
        <div className="mx-auto grid max-w-6xl gap-14 md:grid-cols-2">
          <div>
            <p className="mb-3 text-[0.7rem] tracking-[0.22em] text-sandstone uppercase">Echo</p>
            <h2 className="font-display mb-4 text-3xl uppercase">A mirror. Not a clinic.</h2>
            <p className="mb-4 text-fossil/75">
              Echo is how the work looks back at you. Short prompts after time on the land. Pattern,
              not diagnosis. Self-awareness lives here — it is not a fifth Rune.
            </p>
            <p className="text-fossil/75">
              There is no guest-facing coach in your pocket while you walk. The canyon does that job.
            </p>
          </div>
          <div>
            <p className="mb-3 text-[0.7rem] tracking-[0.22em] text-sandstone uppercase">HAM</p>
            <h2 className="font-display mb-4 text-3xl uppercase">Human Adaptation Model</h2>
            <p className="mb-4 text-fossil/75">
              How we protect, adapt, and choose again. Tess leads it. It is not a course you can buy
              this month. When it is ready it will travel as language people keep after they leave.
            </p>
            <p className="text-fossil/75">Trail Quest will carry some of this in the field from mid-October. Paper first if the phone dies.</p>
          </div>
        </div>
      </section>

      <section className="bg-fossil px-6 py-16 text-coal">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-[0.7rem] tracking-[0.2em] text-shale uppercase">Do the work on the land</p>
            <h2 className="font-display text-4xl uppercase">The expedition is the product.</h2>
          </div>
          <Link to="/bootcamp" className="inline-flex rounded-[2px] bg-ember px-8 py-3.5 font-semibold text-white">
            Badlands Bootcamp
          </Link>
        </div>
      </section>
    </main>
  );
}
