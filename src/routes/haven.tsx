import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/haven")({ component: Page });

function Page() {
  return (
    <>
      <section className="relative flex min-h-[60vh] items-end px-4 pb-16 text-white">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "linear-gradient(to top, rgba(22,23,24,.75), rgba(40,18,6,.35)), url('/images/exp-rolling.jpg')",
          }}
        />
        <div className="relative z-10 mx-auto w-full max-w-7xl">
          <p className="mb-3 text-[0.8rem] font-semibold tracking-[0.12em] text-sandstone uppercase">Experiences</p>
          <h1 className="font-display mb-3 text-[clamp(2.5rem,6.5vw,4.5rem)] tracking-wide uppercase">Haven</h1>
          <p className="max-w-[40ch] text-lg text-fossil/90">
            Short stays and hospitality. A softer layer of the same philosophy and place.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-3xl px-4 py-20">
        <p className="text-lg text-shale">
          Overnight rooms as a quieter doorway into Unearthself — for those who want the land and the rest,
          without a full programme.
        </p>
      </section>
    </>
  );
}
