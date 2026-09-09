import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/bootcamp")({
  component: BootcampPage,
  head: () => ({
    meta: [
      { title: "Badlands Bootcamp - Unearth Self" },
      {
        name: "description",
        content:
          "A three-day expedition in the Canadian Badlands. Outdoor challenge, honest conversation, real recovery. Drumheller.",
      },
    ],
  }),
});

function BootcampPage() {
  return (
    <main className="bg-coal text-fossil">
      <section className="relative flex min-h-[80vh] items-end overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "linear-gradient(to top, rgba(22,23,24,0.88) 0%, rgba(22,23,24,0.25) 50%), url('/images/exp-hoodoos.jpg')",
          }}
        />
        <div className="relative z-10 mx-auto w-full max-w-5xl px-6 pb-16 pt-28">
          <p className="mb-4 text-[0.72rem] tracking-[0.28em] text-sandstone uppercase">
            Drumheller - three days on the land
          </p>
          <h1 className="font-display mb-5 text-[clamp(2.6rem,7vw,5.2rem)] leading-[0.9] uppercase">
            Badlands
            <br />
            Bootcamp
          </h1>
          <p className="mb-8 max-w-[40ch] text-lg text-fossil/85">
            Hard ground, shared work, and a close that is quiet on purpose. Ninety minutes from Calgary.
          </p>
          <Link
            to="/book/retreat"
            className="inline-flex rounded-[2px] bg-ember px-8 py-3.5 font-semibold text-white"
          >
            Hold a date
          </Link>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <p className="mb-3 text-[0.7rem] tracking-[0.22em] text-sandstone uppercase">The offer</p>
          <h2 className="font-display mb-6 text-4xl uppercase">One expedition. Not four packages.</h2>
          <p className="mb-4 text-lg text-fossil/80">
            Three days. Eight to sixteen people. Days outside on hoodoo country and the Red Deer valley.
            Nights at Haven or Canalta. The spa when the day is done.
          </p>
          <p className="text-lg text-fossil/80">
            This is the live product. The modality sits underneath it. We do not sell a deck called HAM
            on this page.
          </p>
        </div>
      </section>

      <section className="border-t border-fossil/10 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <p className="mb-3 text-[0.7rem] tracking-[0.22em] text-sandstone uppercase">The three days</p>
          <h2 className="font-display mb-10 text-4xl uppercase">Arrive as a roster. Leave as a crew.</h2>
          <div className="grid gap-8 md:grid-cols-3">
            <article className="border-t border-fossil/15 pt-5">
              <p className="mb-2 text-[0.7rem] tracking-[0.18em] text-sandstone uppercase">Day one</p>
              <h3 className="font-display mb-2 text-2xl uppercase">Onto the land</h3>
              <p className="text-fossil/70">
                Arrive, drop what can be dropped, start with the body. Out of the meeting and into the
                place.
              </p>
            </article>
            <article className="border-t border-fossil/15 pt-5">
              <p className="mb-2 text-[0.7rem] tracking-[0.18em] text-sandstone uppercase">Day two</p>
              <h3 className="font-display mb-2 text-2xl uppercase">The plan will not survive</h3>
              <p className="text-fossil/70">
                A longer day on the ground. Weather, route, each other. Useful friction.
              </p>
            </article>
            <article className="border-t border-fossil/15 pt-5">
              <p className="mb-2 text-[0.7rem] tracking-[0.18em] text-sandstone uppercase">Day three</p>
              <h3 className="font-display mb-2 text-2xl uppercase">A quiet close</h3>
              <p className="text-fossil/70">
                Name what matters. Eat. Drive home before the spell is talked to death.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="border-t border-fossil/10 px-6 py-20">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-3">
          <Link to="/for/teams" className="border-t border-fossil/15 pt-5 hover:text-sandstone">
            <p className="mb-2 text-[0.7rem] tracking-[0.18em] text-sandstone uppercase">Teams</p>
            <h3 className="font-display mb-2 text-2xl uppercase">For the people who book it</h3>
            <p className="text-fossil/65">The same three days, written for the person sending the calendar invite.</p>
          </Link>
          <Link to="/haven" className="border-t border-fossil/15 pt-5 hover:text-sandstone">
            <p className="mb-2 text-[0.7rem] tracking-[0.18em] text-sandstone uppercase">Sleep</p>
            <h3 className="font-display mb-2 text-2xl uppercase">Haven</h3>
            <p className="text-fossil/65">Four suites on site. Canalta when the group is larger.</p>
          </Link>
          <Link to="/basecamp" className="border-t border-fossil/15 pt-5 hover:text-sandstone">
            <p className="mb-2 text-[0.7rem] tracking-[0.18em] text-sandstone uppercase">After the day</p>
            <h3 className="font-display mb-2 text-2xl uppercase">Basecamp</h3>
            <p className="text-fossil/65">Heat, cold and hands. Open to the town as well as the group.</p>
          </Link>
        </div>
      </section>

      <section className="bg-fossil px-6 py-16 text-coal">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-[0.7rem] tracking-[0.2em] text-shale uppercase">Hold a date</p>
            <h2 className="font-display text-4xl uppercase">8 to 16 people. Three days.</h2>
            <p className="mt-3 max-w-[42ch] text-coal/70">
              Tell us who is coming and when you can travel. Availability and a figure come back by email.
            </p>
          </div>
          <Link
            to="/book/retreat"
            className="inline-flex rounded-[2px] bg-ember px-8 py-3.5 font-semibold text-white"
          >
            Hold a date
          </Link>
        </div>
      </section>
    </main>
  );
}
