import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/d14/")({ component: D14Index });

function D14Index() {
  return (
    <main className="min-h-[calc(100vh-3rem)] bg-coal px-6 py-16 text-fossil">
      <div className="mx-auto max-w-3xl">
        <p className="mb-3 text-[0.75rem] tracking-[0.2em] text-sandstone uppercase">Decision D14</p>
        <h1 className="font-display mb-4 text-[clamp(2.5rem,6vw,4rem)] leading-none">Three temperatures. One system.</h1>
        <p className="mb-12 max-w-[46ch] text-fossil/70">
          Same tokens. Different spatial attitude. Click a route. This is not the public site — it is
          the review surface for the hybrid lock.
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          <Card
            to="/d14/seam"
            kicker="Route A"
            title="Seam"
            body="Home and Bootcamp. Land first. One Ember pin. Photograph does the selling."
          />
          <Card
            to="/d14/basecamp"
            kicker="Route C"
            title="Basecamp"
            body="Haven, spa, checkout. Inventory visible. Cards, slots, suite facts."
          />
          <Card
            to="/d14/specimen"
            kicker="Route B"
            title="Specimen"
            body="The Work and Journal. Quiet paper. Runes as plates. Philosophy only here."
          />
        </div>
      </div>
    </main>
  );
}

function Card({
  to,
  kicker,
  title,
  body,
}: {
  to: "/d14/seam" | "/d14/basecamp" | "/d14/specimen";
  kicker: string;
  title: string;
  body: string;
}) {
  return (
    <Link
      to={to}
      className="border border-fossil/15 p-6 transition-colors hover:border-ember"
    >
      <p className="mb-2 text-[0.7rem] tracking-widest text-sandstone uppercase">{kicker}</p>
      <h2 className="font-display mb-2 text-2xl">{title}</h2>
      <p className="text-[0.9rem] text-fossil/65">{body}</p>
    </Link>
  );
}
