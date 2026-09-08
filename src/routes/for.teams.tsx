import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/for/teams")({
  component: TeamsLander,
  head: () => ({
    meta: [
      { title: "Badlands Bootcamp for teams - Unearth Self" },
      {
        name: "description",
        content:
          "A three-day expedition in the Canadian Badlands. Outdoor challenge, honest conversation, and real recovery - ninety minutes from Calgary.",
      },
    ],
  }),
});

function TeamsLander() {
  return (
    <main className="bg-coal text-fossil">
      <section className="relative flex min-h-[88vh] items-end overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "linear-gradient(to top, rgba(22,23,24,0.94) 0%, rgba(22,23,24,0.35) 48%), url('/images/exp-hoodoos.jpg')",
          }}
        />
        <div className="relative z-10 mx-auto w-full max-w-5xl px-6 pb-16 pt-28">
          <p className="mb-4 text-[0.72rem] tracking-[0.28em] text-sandstone uppercase">
            Drumheller, Alberta - ninety minutes from Calgary
          </p>
          <h1 className="font-display mb-6 text-[clamp(2.6rem,7.5vw,5.6rem)] leading-[0.9] uppercase">
            Take the team
            <br />
            somewhere the
            <br />
            job title won't
            <br />
            follow.
          </h1>
          <p className="mb-8 max-w-[42ch] text-lg text-fossil/88">
            Badlands Bootcamp is three days in the Canadian Badlands: hard ground, shared work, and the
            kind of conversation that does not survive a hotel ballroom.
          </p>
          <Link
            to="/book/retreat"
            className="inline-flex rounded-[2px] bg-ember px-8 py-3.5 text-[0.95rem] font-semibold text-white"
          >
            Hold a date
          </Link>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <p className="mb-3 text-[0.7rem] tracking-[0.22em] text-sandstone uppercase">Why go</p>
          <h2 className="font-display mb-6 text-[clamp(2rem,4vw,3.2rem)] uppercase">
            Most offsites change the scenery. Almost none change the team.
          </h2>
          <p className="mb-4 text-lg text-fossil/80">
            You already know the pattern. A rented room. A facilitator with a deck. A dinner that is
            pleasant and forgettable. People fly home as the same group that arrived, with better
            photographs.
          </p>
          <p className="text-lg text-fossil/80">
            Bring them here instead. The Badlands are older than the company and indifferent to the
            org chart. That is the point. Pressure with a horizon. Recovery that is actually quiet.
            A group that has had to rely on each other when the weather, the map, or the plan did not
            cooperate.
          </p>
        </div>
      </section>

      <section className="border-t border-fossil/10 px-6 py-20">
        <div className="mx-auto grid max-w-6xl gap-14 md:grid-cols-2">
          <div>
            <p className="mb-3 text-[0.7rem] tracking-[0.22em] text-sandstone uppercase">What you are buying</p>
            <h2 className="font-display mb-4 text-4xl uppercase">Land, challenge, and a proper close.</h2>
            <p className="mb-4 text-fossil/75">
              Days outside on hoodoo country and the Red Deer valley. Short, structured time after each
              piece of work so the group can say what actually happened - not a therapy session, not a
              circle that never ends.
            </p>
            <p className="text-fossil/75">
              Nights at Haven, our four-suite house on site, or at Canalta when the group is larger.
              Meals. The spa for heat, cold and hands when the day is done. You leave with a team that
              has a shared story, not a tote bag.
            </p>
          </div>
          <div>
            <p className="mb-3 text-[0.7rem] tracking-[0.22em] text-sandstone uppercase">What they take home</p>
            <ul className="space-y-5 text-fossil/80">
              <li>
                <strong className="block font-display text-xl uppercase text-fossil">Honesty under pressure.</strong>
                You see how people decide when the script runs out.
              </li>
              <li>
                <strong className="block font-display text-xl uppercase text-fossil">A bond that is not performed.</strong>
                Shared work on real ground beats a trust exercise on carpet.
              </li>
              <li>
                <strong className="block font-display text-xl uppercase text-fossil">A way to keep talking.</strong>
                A simple language for what showed up - so Monday is not a reset to silence.
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="border-t border-fossil/10 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <p className="mb-3 text-[0.7rem] tracking-[0.22em] text-sandstone uppercase">The three days</p>
          <h2 className="font-display mb-10 text-4xl uppercase">Arrive as a roster. Leave as a crew.</h2>
          <div className="grid gap-8 md:grid-cols-3">
            <article className="border-t border-fossil/15 pt-5">
              <p className="mb-2 text-[0.7rem] tracking-[0.18em] text-sandstone uppercase">Day one</p>
              <h3 className="font-display mb-2 text-2xl uppercase">Out of the car, onto the land</h3>
              <p className="text-fossil/70">
                Arrive, drop the devices that can be dropped, and start with the body. The first hours
                are about getting out of the meeting and into the place.
              </p>
            </article>
            <article className="border-t border-fossil/15 pt-5">
              <p className="mb-2 text-[0.7rem] tracking-[0.18em] text-sandstone uppercase">Day two</p>
              <h3 className="font-display mb-2 text-2xl uppercase">The plan will not survive</h3>
              <p className="text-fossil/70">
                A longer day on the ground. Weather, route, and each other. This is where the useful
                friction lives - and where the group finds out how it actually works.
              </p>
            </article>
            <article className="border-t border-fossil/15 pt-5">
              <p className="mb-2 text-[0.7rem] tracking-[0.18em] text-sandstone uppercase">Day three</p>
              <h3 className="font-display mb-2 text-2xl uppercase">A close that is quiet on purpose</h3>
              <p className="text-fossil/70">
                No forced crescendo. Time to name what matters, eat, and drive home before the spell
                is talked to death.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="border-t border-fossil/10 px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <p className="mb-3 text-[0.7rem] tracking-[0.22em] text-sandstone uppercase">Who this is for</p>
          <h2 className="font-display mb-6 text-4xl uppercase">Leadership groups who need more than a change of hotel.</h2>
          <p className="mb-4 text-fossil/75">
            Eight to sixteen people. Founders, senior teams, crews that collaborate on paper and stall
            in the room. Close enough that Calgary and Edmonton can leave on a Thursday and be on the
            land by lunch.
          </p>
          <p className="text-fossil/75">
            If you want a tasting menu, a speaker and a branded notebook, this is the wrong page. If
            you want your people in a landscape that will not flatter them, hold a date.
          </p>
        </div>
      </section>

      <section className="bg-fossil px-6 py-16 text-coal">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-[0.7rem] tracking-[0.2em] text-shale uppercase">The offer</p>
            <h2 className="font-display text-4xl uppercase">8 to 16 people. Three days. Drumheller.</h2>
            <p className="mt-3 max-w-[46ch] text-coal/70">
              Tell us who is coming and when you can travel. We will come back with availability and a
              figure.
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
