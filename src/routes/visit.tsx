import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/visit")({
  component: VisitPage,
  head: () => ({
    meta: [
      { title: "Visit - Unearth Self" },
      {
        name: "description",
        content: "How to reach Basecamp and Haven in Drumheller, Alberta. Seasons, packing, overflow.",
      },
    ],
  }),
});

function VisitPage() {
  return (
    <main className="bg-coal text-fossil">
      <section className="relative flex min-h-[60vh] items-end overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "linear-gradient(to top, rgba(22,23,24,0.88) 0%, rgba(22,23,24,0.3) 50%), url('/images/basecamp/building.jpg')",
          }}
        />
        <div className="relative z-10 mx-auto w-full max-w-5xl px-6 pb-16 pt-28">
          <p className="mb-4 text-[0.72rem] tracking-[0.28em] text-sandstone uppercase">Drumheller</p>
          <h1 className="font-display mb-4 text-[clamp(2.6rem,7vw,5rem)] leading-[0.9] uppercase">
            Ninety minutes
            <br />
            from Calgary.
          </h1>
          <p className="max-w-[40ch] text-lg text-fossil/85">
            Drumheller is a small town on deep time, which is why the work lives here.
          </p>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <p className="mb-3 text-[0.7rem] tracking-[0.22em] text-sandstone uppercase">Getting here</p>
          <h2 className="font-display mb-6 text-4xl uppercase">You drive in. You do not fly into the canyon.</h2>
          <p className="mb-4 text-lg text-fossil/80">
            Calgary International is the usual airport. From there you take Highway 9, or the Trans-Canada
            and then north. Allow two hours if you have not driven the last stretch in winter.
          </p>
          <p className="text-lg text-fossil/80">
            Edmonton is longer. There is no useful passenger rail. We do not run a shuttle in year one.
            If the group needs one, say so and we will point you at a van.
          </p>
        </div>
      </section>

      <section className="border-t border-fossil/10 px-6 py-20">
        <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-2">
          <div>
            <p className="mb-3 text-[0.7rem] tracking-[0.22em] text-sandstone uppercase">Sleep</p>
            <h2 className="font-display mb-4 text-3xl uppercase">Haven first, then Canalta if you overflow.</h2>
            <p className="mb-4 text-fossil/75">
              Four suites sit on the same block as Basecamp: Elowen, Hidden Hollow, River Blossom and Water
              Mark. They have kitchens, and the place next door has heat and cold. Direct rates start from
              $165 a night.
            </p>
            <p className="text-fossil/75">
              Groups larger than the four suites go to Canalta. We hold those rooms; you do not book them
              as a separate holiday.
            </p>
            <Link to="/haven" className="mt-6 inline-block text-sandstone hover:text-fossil">
              See the suites →
            </Link>
          </div>
          <div>
            <p className="mb-3 text-[0.7rem] tracking-[0.22em] text-sandstone uppercase">Seasons</p>
            <h2 className="font-display mb-4 text-3xl uppercase">The land stays open through the year.</h2>
            <ul className="space-y-4 text-fossil/75">
              <li>
                <strong className="block text-fossil">Spring / autumn.</strong> Best for teams. Cool mornings,
                workable days, fewer tourists than July.
              </li>
              <li>
                <strong className="block text-fossil">Summer.</strong> Heat, the river and longer light, so book early.
              </li>
              <li>
                <strong className="block text-fossil">Winter.</strong> Short days, ice and snowshoe country. It is still a working house, so dress for it.
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="border-t border-fossil/10 px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <p className="mb-3 text-[0.7rem] tracking-[0.22em] text-sandstone uppercase">Pack</p>
          <h2 className="font-display mb-6 text-4xl uppercase">What to bring.</h2>
          <ul className="space-y-3 text-lg text-fossil/80">
            <li>Bring boots you can walk in for hours, the kind you would actually wear on a trail.</li>
            <li>Bring a layer that cuts the wind. The coulees do not follow a forecast app.</li>
            <li>Bring a water bottle, and a head torch if you are here in winter.</li>
            <li>Bring something to swim in if you want the plunge.</li>
            <li>Bring a notebook if you write things down. We do not hand out branded ones.</li>
          </ul>
          <p className="mt-8 text-fossil/60">
            Outdoor days are sold only after insurance and a named facilitator are in place. Until then we
            take holds, not deposits against a canyon day.
          </p>
        </div>
      </section>
    </main>
  );
}
