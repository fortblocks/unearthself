import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/d14/seam")({ component: Seam });

function Seam() {
  return (
    <main className="bg-coal text-fossil">
      <section className="relative flex min-h-[92vh] items-end overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "linear-gradient(to top, rgba(22,23,24,0.92) 0%, rgba(22,23,24,0.35) 45%, rgba(22,23,24,0.2) 100%), url('/images/hero-badlands-dusk.jpg')",
          }}
        />
        <div className="relative z-10 w-full max-w-4xl px-6 pb-16 pt-28">
          <p className="mb-4 text-[0.72rem] tracking-[0.28em] text-sandstone uppercase">
            Drumheller · Canadian Badlands
          </p>
          <h1 className="font-display mb-5 text-[clamp(3.2rem,10vw,7rem)] leading-[0.9] uppercase">
            Find your
            <br />
            PACE
          </h1>
          <p className="mb-8 max-w-[28ch] text-lg text-fossil/85">
            Three days on the land. Four Runes. A team that leaves different.
          </p>
          <Link
            to="/bootcamp"
            className="inline-flex rounded-[2px] bg-ember px-8 py-3.5 text-[0.95rem] font-semibold text-white"
          >
            Book a stay
          </Link>
        </div>
      </section>

      <section className="grid md:grid-cols-3">
        <Door href="/basecamp" img="/images/exp-canyon.jpg" name="Basecamp" line="Treatments. Day guests. The house." />
        <Door href="/bootcamp" img="/images/exp-hoodoos.jpg" name="Bootcamp" line="The expedition. PACE in three days." />
        <Door href="/haven" img="/images/exp-rolling.jpg" name="Haven" line="Four suites. Elowen to Water Mark." />
      </section>
    </main>
  );
}

function Door({
  href,
  img,
  name,
  line,
}: {
  href: "/basecamp" | "/bootcamp" | "/haven";
  img: string;
  name: string;
  line: string;
}) {
  return (
    <Link to={href} className="group relative block min-h-[280px] overflow-hidden">
      <img src={img} alt="" className="absolute inset-0 h-full w-full object-cover saturate-[0.75] transition-transform duration-700 group-hover:scale-105" />
      <div className="absolute inset-0 bg-coal/55" />
      <div className="relative z-10 flex h-full min-h-[280px] flex-col justify-end p-6">
        <h2 className="font-display text-3xl">{name}</h2>
        <p className="text-sm text-fossil/70">{line}</p>
      </div>
    </Link>
  );
}
