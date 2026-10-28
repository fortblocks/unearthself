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

function Home() {
  return (
    <main className="bg-coal text-fossil">
      <section className="relative flex min-h-[100dvh] items-end overflow-hidden">
        <video
          className="absolute inset-0 h-full w-full object-cover object-[center_65%]"
          autoPlay
          muted
          loop
          playsInline
          poster="/images/exp-hoodoos.jpg"
        >
          <source src="/images/hero-clouds.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-t from-coal via-coal/55 to-coal/10" />
        <div className="relative z-10 mx-auto w-full max-w-5xl px-6 pb-16 pt-28">
          <p className="mb-4 text-[0.72rem] tracking-[0.28em] text-sandstone uppercase">
            Canadian Badlands · Drumheller, AB
          </p>
          <h1 className="font-display mb-5 text-[clamp(2.8rem,8vw,5.6rem)] leading-[0.9] uppercase">
            Come for
            <br />
            the land.
          </h1>
          <p className="max-w-[38ch] text-lg text-fossil/85">
            Immersive adventure wellness retreats for corporate teams and private groups
          </p>
        </div>
      </section>

      <section className="relative flex h-[100dvh] items-center overflow-hidden bg-coal">
        {/* Topographic backdrop with soft right-to-left + top/bottom edge fades */}
        <div 
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%), linear-gradient(to right, transparent 0%, transparent 35%, rgba(0,0,0,0.5) 60%, rgba(0,0,0,0.85) 75%, black 100%)',
            maskComposite: 'intersect',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%), linear-gradient(to right, transparent 0%, transparent 35%, rgba(0,0,0,0.5) 60%, rgba(0,0,0,0.85) 75%, black 100%)',
            WebkitMaskComposite: 'source-in'
          }}
        >
          <img
            src="/topo.png"
            alt=""
            className="h-full w-full object-cover object-right"
          />
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-coal to-transparent" />
        <div className="relative z-10 mx-auto w-full max-w-5xl px-6 py-24">
          <div className="max-w-[52ch]">
            <p className="mb-4 text-[0.72rem] tracking-[0.28em] text-sandstone uppercase">
              The expedition
            </p>
            <h2 className="font-display mb-8 text-[clamp(2rem,4.5vw,3.5rem)] leading-[0.95] uppercase">
              Badlands Bootcamp
            </h2>
            <p className="mb-6 text-[0.82rem] tracking-[0.16em] text-sandstone uppercase sm:text-[0.95rem]">
              Three days · Two nights · Groups of 6–30 · 90 minutes from Calgary
            </p>
            <p className="text-lg leading-relaxed text-fossil/85">
              Our flagship experience combines outdoor quests, guided reflection and
              restorative wellness to help people reset, reconnect and respond to
              challenge with greater flexibility and choice.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                to="/builder"
                className="inline-flex rounded-[2px] bg-ember px-7 py-3.5 text-[0.78rem] font-semibold tracking-[0.16em] text-white uppercase"
              >
                Build retreat
              </Link>
              <Link
                to="/bootcamp"
                className="inline-flex rounded-[2px] border border-fossil/25 px-7 py-3.5 text-[0.78rem] font-semibold tracking-[0.16em] text-fossil uppercase hover:border-sandstone hover:text-sandstone"
              >
                Explore bootcamp
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="h-24 bg-coal" aria-hidden="true" />

      {/* Haven section */}
      <section className="relative h-[78vh] min-h-[480px] overflow-hidden bg-coal">
        <img
          src="/images/haven/exterior/exterior-01.jpg"
          alt="Haven heritage house"
          className="absolute inset-0 h-full w-full object-cover object-center"
          style={{
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 30%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 30%)'
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-coal via-coal/65 to-transparent" />
        <div className="relative z-10 mx-auto flex h-full w-full max-w-5xl items-end px-6 pb-16">
          <div className="max-w-[48ch]">
            <p className="mb-4 text-[0.72rem] tracking-[0.28em] text-sandstone uppercase">The house</p>
            <h2 className="font-display mb-6 text-[clamp(2.2rem,5vw,4rem)] leading-[0.95] uppercase">Haven</h2>
            <p className="mb-8 text-lg text-fossil/85">
              Four suites. Sleep here whether you came for the land or the quiet.
            </p>
            <Link
              to="/haven"
              className="inline-flex rounded-[2px] border border-fossil/25 px-7 py-3.5 text-[0.78rem] font-semibold tracking-[0.16em] text-fossil uppercase hover:border-sandstone hover:text-sandstone"
            >
              Explore Haven
            </Link>
          </div>
        </div>
      </section>

      <div className="h-24 bg-coal" aria-hidden="true" />

      {/* Basecamp section */}
      <section className="relative h-[78vh] min-h-[480px] overflow-hidden bg-coal">
        <img
          src="/images/basecamp/building.jpg"
          alt="Basecamp building"
          className="absolute inset-0 h-full w-full object-cover object-center"
          style={{
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 30%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 30%)'
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-coal via-coal/65 to-transparent" />
        <div className="relative z-10 mx-auto flex h-full w-full max-w-5xl items-end px-6 pb-16">
          <div className="max-w-[48ch]">
            <p className="mb-4 text-[0.72rem] tracking-[0.28em] text-sandstone uppercase">Treatments</p>
            <h2 className="font-display mb-6 text-[clamp(2.2rem,5vw,4rem)] leading-[0.95] uppercase">Basecamp</h2>
            <p className="mb-8 text-lg text-fossil/85">
              Heat, cold and hands. Day guests welcome.
            </p>
            <Link
              to="/basecamp"
              className="inline-flex rounded-[2px] border border-fossil/25 px-7 py-3.5 text-[0.78rem] font-semibold tracking-[0.16em] text-fossil uppercase hover:border-sandstone hover:text-sandstone"
            >
              Explore Basecamp
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
