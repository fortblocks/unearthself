import { createFileRoute, Link } from "@tanstack/react-router";
import { RuneTape } from "@/components/site/RuneTape";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "Unearth Self" },
      {
        name: "description",
        content: "Badlands Bootcamp, Haven and Basecamp in Drumheller, Alberta.",
      },
    ],
  }),
});

const doors = [
  {
    to: "/bootcamp" as const,
    kicker: "The expedition",
    title: "Bootcamp",
    line: "Two to five days on the land. Groups of six to thirty.",
    img: "/images/exp-hoodoos.jpg",
  },
  {
    to: "/haven" as const,
    kicker: "The house",
    title: "Haven",
    line: "Four suites. Sleep here whether you came for the land or the quiet.",
    img: "/images/haven/elowen/elowen-01.jpg",
  },
  {
    to: "/basecamp" as const,
    kicker: "Treatments",
    title: "Basecamp",
    line: "Heat, cold and hands. Day guests welcome.",
    img: "/images/basecamp/lounge.jpg",
  },
];

function Home() {
  return (
    <main className="bg-coal text-fossil">
      <section className="relative flex min-h-[100dvh] items-end overflow-hidden">
        <img
          src="/images/exp-hoodoos.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[center_65%]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-coal via-coal/55 to-coal/10" />
        <div className="relative z-10 mx-auto w-full max-w-5xl px-6 pb-16 pt-28">
          <p className="mb-4 text-[0.72rem] tracking-[0.28em] text-sandstone uppercase">
            Canadian Badlands · Drumheller
          </p>
          <h1 className="font-display mb-5 text-[clamp(2.8rem,8vw,5.6rem)] leading-[0.9] uppercase">
            Come for
            <br />
            the land.
          </h1>
          <p className="max-w-[38ch] text-lg text-fossil/85">
            An expedition, four suites, and a house for heat and cold. Ninety minutes from Calgary.
          </p>
        </div>
      </section>

      <RuneTape />

      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <p className="mb-3 text-[0.7rem] tracking-[0.22em] text-sandstone uppercase">Three doors</p>
          <h2 className="font-display mb-12 text-4xl uppercase">Pick how you arrive.</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {doors.map((d) => (
              <Link key={d.to} to={d.to} className="group block">
                <div className="aspect-[4/3] overflow-hidden bg-shale">
                  <img src={d.img} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                </div>
                <p className="mt-4 text-[0.68rem] tracking-[0.18em] text-sandstone uppercase">{d.kicker}</p>
                <h3 className="font-display mt-1 text-3xl uppercase">{d.title}</h3>
                <p className="mt-2 text-fossil/65">{d.line}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
