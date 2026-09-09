import { createFileRoute, Link } from "@tanstack/react-router";

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
    line: "Three days on the land. Teams who need more than a change of hotel.",
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
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "linear-gradient(to top, rgba(22,23,24,0.9) 0%, rgba(22,23,24,0.2) 45%), url('/images/hero-badlands-dusk.jpg')",
          }}
        />
        <div className="relative z-10 mx-auto w-full max-w-5xl px-6 pb-16 pt-28">
          <p className="mb-4 text-[0.72rem] tracking-[0.28em] text-sandstone uppercase">Drumheller, Alberta</p>
          <h1 className="font-display mb-5 text-[clamp(2.8rem,8vw,5.6rem)] leading-[0.9] uppercase">
            Come for the land.
            <br />
            Leave differently.
          </h1>
          <p className="max-w-[36ch] text-lg text-fossil/85">
            PACE is the path. Unearth Self is the purpose.
          </p>
        </div>
      </section>

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
