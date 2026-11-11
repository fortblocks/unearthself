import { createFileRoute, Link } from "@tanstack/react-router";
import { Divider } from "@/components/site/Divider";

export const Route = createFileRoute("/about")({
  component: AboutPage,
  head: () => ({
    meta: [
      { title: "About - Unearth Self" },
      {
        name: "description",
        content:
          "Unearth Self in downtown Drumheller: Basecamp the spa and centre, Haven the suites, and Badlands Bootcamp the expedition.",
      },
    ],
  }),
});

function AboutPage() {
  return (
    <main className="bg-coal text-fossil">
      <section className="relative flex min-h-[70vh] items-end overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "linear-gradient(to top, rgba(22,23,24,0.78) 0%, rgba(22,23,24,0.12) 50%), url('/images/basecamp/building.jpg')",
          }}
        />
        <div className="relative z-10 mx-auto w-full max-w-5xl px-6 pb-16 pt-28">
          <p className="mb-4 text-[0.72rem] tracking-[0.28em] text-sandstone uppercase">Drumheller</p>
          <h1 className="font-display mb-5 text-[clamp(2.6rem,7vw,5.2rem)] leading-[0.9] min-h-[1.8em] uppercase">
            Unearth
            <br />
            Self
          </h1>
          <p className="max-w-[40ch] text-lg text-fossil/85">
            You come for the spa, a suite, or a few days on the land.
          </p>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <p className="mb-3 text-[0.7rem] tracking-[0.22em] text-sandstone uppercase">The place</p>
          <h2 className="font-display mb-6 text-4xl uppercase">A spa, four suites, and an expedition.</h2>
          <p className="mb-4 text-lg text-fossil/80">
            Basecamp is the spa and the centre, in downtown Drumheller. You come in for heat and cold, and
            you can finish on a treatment table. If you live in town, or you are only here for the day, you
            are welcome.
          </p>
          <p className="mb-4 text-lg text-fossil/80">
            Haven is four suites in a heritage house, in downtown Drumheller. Book one on its own, or stay
            while you are here with a group. When the group is larger than the four suites, the extra rooms
            are at Canalta.
          </p>
          <p className="text-lg text-fossil/80">
            Badlands Bootcamp is two to five days on the land, for a group of six to thirty. It is built
            first for teams, and private groups come the same way. A small group of partners runs the place.
          </p>
        </div>
      </section>

      <Divider />

      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <p className="mb-3 text-[0.7rem] tracking-[0.22em] text-sandstone uppercase">The idea</p>
          <h2 className="font-display mb-6 text-4xl uppercase">A language you keep after you leave.</h2>
          <p className="mb-4 text-lg text-fossil/80">
            On a Bootcamp the sequence is PACE: Play, Adaptability, Connection, Experience. You practise each
            one on the ground, then you carry it. PACE is the path. Unearth Self is the purpose.
          </p>
          <p className="mb-4 text-lg text-fossil/80">
            You notice what you do when the plan changes, and you choose again. Notice, don't excavate.
            Passing on sharing is always available.
          </p>
          <p className="text-lg text-fossil/80">
            The longer aim is a language you keep using after you leave. Year one is this town and this
            canyon.
          </p>
        </div>
      </section>

      <Divider />

      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <p className="mb-3 text-[0.7rem] tracking-[0.22em] text-sandstone uppercase">The land</p>
          <h2 className="font-display mb-6 text-4xl uppercase">A place that will not flatter you.</h2>
          <p className="mb-4 text-lg text-fossil/80">
            Drumheller is small and the land is not. There are coulees, hoodoos, a river, and a winter that
            means it. The work needs a place that will not flatter you.
          </p>
          <p className="text-lg text-fossil/80">You are ninety minutes from Calgary.</p>
          <Link to="/visit" className="mt-8 inline-block text-sandstone hover:text-fossil">
            How to get here →
          </Link>
        </div>
      </section>

      <section className="bg-fossil px-6 py-16 text-coal">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-[0.7rem] tracking-[0.2em] text-shale uppercase">Book or enquire</p>
            <h2 className="font-display text-4xl uppercase">Tell us when you want to come.</h2>
            <p className="mt-3 max-w-[46ch] text-coal/70">
              A group on the land, an afternoon at Basecamp, or a night at Haven.
            </p>
          </div>
          <div className="flex flex-col items-start gap-4">
            <Link
              to="/book/retreat"
              className="inline-flex rounded-[2px] bg-ember px-8 py-3.5 font-semibold text-white"
            >
              Hold a date
            </Link>
            <Link to="/book/treatment" className="font-semibold text-ember hover:text-coal">
              Request a treatment
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
