import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/basecamp")({ component: Page });

function Page() {
  return (
    <>
      <section className="relative flex min-h-[60vh] items-end px-4 pb-16 text-white">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "linear-gradient(to top, rgba(22,23,24,.75), rgba(40,18,6,.35)), url('/images/exp-canyon.jpg')",
          }}
        />
        <div className="relative z-10 mx-auto w-full max-w-7xl">
          <p className="mb-3 text-[0.8rem] font-semibold tracking-[0.12em] text-sandstone uppercase">Experiences</p>
          <h1 className="font-display mb-3 text-[clamp(2.5rem,6.5vw,4.5rem)] tracking-wide uppercase">Basecamp</h1>
          <p className="max-w-[40ch] text-lg text-fossil/90">
            Wellness retreats and treatments. Intimate, restorative, deeply grounded in the land.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-3xl px-4 py-20">
        <p className="mb-6 text-lg text-shale">
          Couples, stagettes, small groups and private restoratives. Treatments, gathering rooms, and a
          venue that feels like a retreat centre rather than a gym.
        </p>
        <Link to="/builder" className="font-semibold text-ember">
          Prefer a custom programme? Open the Retreat Builder →
        </Link>
      </section>
    </>
  );
}
