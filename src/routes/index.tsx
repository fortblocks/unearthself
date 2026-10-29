import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

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

const GALLERY = [
  { src: "/images/bootcamp-crew.jpg", alt: "Bootcamp crew" },
  { src: "/images/exp-canyon.jpg", alt: "Canyon" },
  { src: "/images/exp-hoodoos.jpg", alt: "Hoodoos" },
  { src: "/images/exp-rolling.jpg", alt: "Rolling badlands" },
  { src: "/images/hero-badlands-dusk.jpg", alt: "Badlands at dusk" },
  { src: "/images/basecamp/lounge.jpg", alt: "Basecamp lounge" },
  { src: "/images/haven/elowen/elowen-01.jpg", alt: "Haven Elowen suite" },
];

function HomeGallery() {
  const [index, setIndex] = useState(0);
  const count = GALLERY.length;
  const prev = () => setIndex((i) => (i - 1 + count) % count);
  const next = () => setIndex((i) => (i + 1) % count);

  return (
    <section className="bg-coal px-6 pb-[150px]" aria-roledescription="carousel">
      <div className="relative mx-auto max-w-[58rem]">
        <div className="aspect-[16/9] overflow-hidden bg-shale">
          <div
            className="flex h-full transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            {GALLERY.map((img, i) => (
              <img
                key={img.src}
                src={img.src}
                alt={img.alt}
                aria-hidden={i !== index}
                className="h-full w-full shrink-0 object-cover"
              />
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={prev}
          aria-label="Previous image"
          className="absolute top-1/2 left-3 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-coal/70 text-fossil transition-colors hover:bg-ember hover:text-white focus-visible:outline-2 focus-visible:outline-ember"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <button
          type="button"
          onClick={next}
          aria-label="Next image"
          className="absolute top-1/2 right-3 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-coal/70 text-fossil transition-colors hover:bg-ember hover:text-white focus-visible:outline-2 focus-visible:outline-ember"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>
    </section>
  );
}

function Home() {
  return (
    <main className="bg-coal text-fossil">
      <section className="relative flex min-h-[100dvh] items-end">
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
              Three days · Two nights · Groups of 6–30
              <br />
              90 minutes from Calgary
            </p>
            <p className="text-lg leading-relaxed text-fossil/85">
              Our flagship experience combines outdoor quests, guided reflection and
              restorative wellness to help people reset, reconnect and respond to
              challenge with greater flexibility and choice.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                to="/bootcamp"
                className="inline-flex rounded-[2px] bg-ember px-7 py-3.5 text-[0.78rem] font-semibold tracking-[0.16em] text-white uppercase"
              >
                Explore bootcamp
              </Link>
              <Link
                to="/builder"
                className="inline-flex rounded-[2px] border border-fossil/25 px-7 py-3.5 text-[0.78rem] font-semibold tracking-[0.16em] text-fossil uppercase hover:border-sandstone hover:text-sandstone"
              >
                Build retreat
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Haven and Basecamp cards */}
      <section className="px-6 pt-[150px] pb-[150px]">
        <div className="mx-auto grid max-w-[58rem] gap-6 md:grid-cols-2">
          <Link to="/basecamp" className="group block">
            <div className="aspect-[4/3] overflow-hidden bg-shale">
              <img 
                src="/images/basecamp/lounge.jpg" 
                alt="" 
                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" 
              />
            </div>
            <p className="mt-4 text-[0.68rem] tracking-[0.18em] text-sandstone uppercase">Spa & Wellness Center</p>
            <h3 className="font-display mt-1 text-3xl uppercase">Basecamp</h3>
            <p className="mt-2 text-fossil/65">Come experience our newly refurbished spa facility in the heart of downtown Drumheller. We offer red light therapy, body wraps, massage, cold plunge, infrared saunas and more.</p>
          </Link>
          <Link to="/haven" className="group block">
            <div className="aspect-[4/3] overflow-hidden bg-shale">
              <img 
                src="/images/haven/elowen/elowen-01.jpg" 
                alt="" 
                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" 
              />
            </div>
            <p className="mt-4 text-[0.68rem] tracking-[0.18em] text-sandstone uppercase">Boutique Hotel</p>
            <h3 className="font-display mt-1 text-3xl uppercase">The Haven</h3>
            <p className="mt-2 text-fossil/65">Drumheller's premier hotel accommodation. Four luxury apartment suites conveniently located within a short walking distance of downtown's bars, restaurants and shopping.</p>
          </Link>
        </div>
      </section>

      <HomeGallery />
    </main>
  );
}
