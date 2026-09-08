import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/d14/specimen")({ component: Specimen });

const plates = [
  { rune: "P", name: "Play", line: "The body remembers how to begin." },
  { rune: "A", name: "Adaptability", line: "Friction is information." },
  { rune: "C", name: "Connection", line: "A team is a weather system." },
  { rune: "E", name: "Existence", line: "What remains when the role falls away." },
];

function Specimen() {
  return (
    <main className="min-h-[calc(100vh-3rem)] bg-fossil text-coal">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <p className="mb-6 text-[0.68rem] tracking-[0.28em] text-sandstone uppercase">
          Plate 01 · The Work · living
        </p>
        <h1 className="font-display mb-6 text-[clamp(2.4rem,6vw,3.8rem)] leading-[1.05]">
          PACE is the path.
          <br />
          Unearth Self is the purpose.
        </h1>
        <p className="mb-4 max-w-[46ch] text-[1.05rem] text-shale">
          Runes offer orientation. Challenges create friction. The Echo Mirror reveals our response.
          Awareness creates choice.
        </p>
        <p className="mb-14 max-w-[46ch] border-l-2 border-sandstone pl-4 text-sm text-shale">
          This surface is marked as living work. It is not therapy. Notice, don’t excavate.
        </p>

        <div className="grid gap-px bg-sandstone/40 sm:grid-cols-2">
          {plates.map((p) => (
            <article key={p.name} className="bg-fossil p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center border border-coal/30 font-display text-xl">
                {p.rune}
              </div>
              <h2 className="font-display text-xl">{p.name}</h2>
              <p className="mt-1 text-sm text-shale">{p.line}</p>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
