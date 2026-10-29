// Parked from src/routes/bootcamp.tsx. Not imported anywhere. Render <EchoHam /> to restore.
export function EchoHam() {
  return (
        <section className="px-6 py-20">
          <div className="mx-auto grid max-w-6xl gap-14 md:grid-cols-2">
            <div>
              <p className="mb-3 text-[0.7rem] tracking-[0.22em] text-sandstone uppercase">Echo</p>
              <h2 className="font-display mb-4 text-3xl uppercase">What the day sends back.</h2>
              <p className="mb-4 text-fossil/75">
                Echo is how the work looks back at you. Short prompts after time on the land. Pattern,
                not diagnosis. Self-awareness lives here.
              </p>
              <p className="text-fossil/75">The canyon does the coaching. The notes are yours.</p>
            </div>
            <div>
              <p className="mb-3 text-[0.7rem] tracking-[0.22em] text-sandstone uppercase">HAM</p>
              <h2 className="font-display mb-4 text-3xl uppercase">Human Adaptation Model</h2>
              <p className="mb-4 text-fossil/75">
                How we protect, adapt, and choose again. The language a group keeps after they drive
                home — and the body of work that will travel further when it is ready.
              </p>
              <p className="text-fossil/75">Trail Quest carries some of this in the field. Paper if the phone dies.</p>
            </div>
          </div>
        </section>
  );
}
