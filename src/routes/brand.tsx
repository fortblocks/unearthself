import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Lockups } from "@/components/brand/Lockups";
import { RuneStudio } from "@/components/brand/RuneStudio";
import { MARK_D } from "@/brand/mark";
import { SWATCHES } from "@/brand/palette";

export const Route = createFileRoute("/brand")({
  component: BrandPage,
  head: () => ({
    meta: [
      { title: "Brand — Unearth Self" },
      {
        name: "description",
        content:
          "Unearth Self brand guidelines. Voice, colour, type, lockups, and the rune studio.",
      },
    ],
  }),
});

const NAV = [
  ["voice", "Voice"],
  ["colour", "Colour"],
  ["type", "Type"],
  ["lockups", "Lockups"],
  ["photography", "Photography"],
  ["runes", "Runes"],
] as const;

function BrandPage() {
  return (
    <div className="min-h-dvh bg-fossil text-coal">
      <header className="sticky top-0 z-20 border-b border-line bg-fossil">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
          <Link to="/brand" className="flex items-center gap-3">
            <svg viewBox="0 0 1 1" className="size-8" aria-hidden>
              <path d={MARK_D} fill="currentColor" />
            </svg>
            <span className="font-display text-2xl leading-none font-black tracking-wide uppercase">
              Brand
            </span>
          </Link>
          <nav className="flex gap-1 overflow-x-auto" aria-label="Guidelines">
            {NAV.map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                className="px-2 py-3 text-xs tracking-widest whitespace-nowrap uppercase hover:text-ember"
              >
                {label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-24">
        <section className="grid gap-8 border-b border-line py-16 md:grid-cols-[1.2fr_0.8fr] md:items-end">
          <div>
            <p className="text-xs tracking-widest text-ember uppercase">Unearth Self · Drumheller</p>
            <h1 className="mt-4 font-display text-7xl leading-none font-black tracking-tight uppercase md:text-8xl">
              The book
            </h1>
            <p className="mt-6 max-w-xl text-lg text-pretty">
              How the house looks and sounds. Use this, not the old deck, when the two disagree.
              Ember has moved. The public name is Unearth Self.
            </p>
          </div>
          <p className="max-w-sm text-sm text-pretty text-muted">
            Badlands Bootcamp stays on the place lockups — the mark with Drumheller under it.
            It is not the name on the website, the invoice line, or a LinkedIn headline.
          </p>
        </section>

        <Section id="voice" kicker="01" title="Voice">
          <p className="max-w-2xl text-lg text-pretty">
            Working voice. Not finished, and not optional. Until we replace this section, every
            new line — site, letter, caption, sign — is written to it.
          </p>
          <div className="mt-8 border-l-2 border-ember pl-5">
            <p className="max-w-2xl text-xl text-pretty">
              The land does most of the teaching. We put a group on it for two or three days and
              give them a language they can still use on the drive home.
            </p>
          </div>
          <div className="mt-10 grid gap-8 md:grid-cols-2">
            <Rule title="Write like this">
              <ul className="space-y-2 text-sm">
                <li>Short sentences. Concrete nouns. The trail, the room, the week.</li>
                <li>Say what happens. Do not sell a transformation.</li>
                <li>“We” is the house. “You” is the group, not a consumer.</li>
                <li>UK English. Drumheller, Calgary, and the Badlands stay as they are.</li>
                <li>PACE is how the week moves: Play, Adaptability, Connection, Experience. Not a type.</li>
              </ul>
            </Rule>
            <Rule title="Do not write like this">
              <ul className="space-y-2 text-sm">
                <li>Unlock, journey, mindset, elevate, empower, holistic, supercharge.</li>
                <li>Trust falls, icebreakers, diagnostics, “your superpower”.</li>
                <li>Exclamation marks. Emoji. A smile in the copy.</li>
                <li>Naming a person as a rune. We do not label guests.</li>
                <li>Badlands Bootcamp as the product name. That name is the place.</li>
              </ul>
            </Rule>
          </div>
          <div className="mt-8 grid gap-3 md:grid-cols-2">
            <Example good label="Say">
              A facilitated week on the coulees. Quiet rooms at Haven if you are staying. Heat and
              cold at Basecamp when the day is done.
            </Example>
            <Example label="Do not say">
              Unlock your team’s potential with a transformative wellness journey in the stunning
              Canadian Badlands.
            </Example>
          </div>
        </Section>

        <Section id="colour" kicker="02" title="Colour">
          <p className="max-w-2xl text-pretty">
            Taken from the ground at Drumheller. Coal seam, shale, sandstone, the warm clay, the
            bone colour of a fossil. Ember is the only heat. One accent on a surface, then stop.
          </p>
          <p className="mt-4 max-w-2xl text-sm text-pretty text-muted">
            The deck printed Ember as #FC7D6D. The working palette is #F2684C. CMYK for the new
            Ember is a conversion, not a press proof. The other four match the deck.
          </p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {SWATCHES.map((swatch) => (
              <li key={swatch.id}>
                <SwatchCard swatch={swatch} />
              </li>
            ))}
          </ul>
          <ul className="mt-8 max-w-2xl space-y-2 text-sm">
            <li>No gradients between the five. No pure black, no pure white as a ground.</li>
            <li>Body text is coal on fossil, or fossil on coal. Never sandstone for a paragraph.</li>
            <li>Ember is a mark, a rule, or a link. Not a background for long reading.</li>
          </ul>
        </Section>

        <Section id="type" kicker="03" title="Type">
          <p className="max-w-2xl text-pretty">
            Two families. Morganite is the coulee — tall, condensed, only at display size.
            Aktiv Grotesk is the talking voice. Dalton Maag. Warm enough that body copy does not
            go clinical.
          </p>
          <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_1fr]">
            <div>
              <p className="text-xs tracking-widest text-muted uppercase">Headlines</p>
              <p className="mt-3 font-display text-7xl leading-none font-black uppercase">
                Morganite Black
              </p>
              <p className="mt-2 font-display text-6xl leading-none font-medium uppercase">
                Morganite Medium
              </p>
              <p className="mt-6 max-w-md text-sm text-pretty text-muted">
                Headlines and the public wordmark only. Not below a large size, not for a sentence,
                not for a button. Black for the shout. Medium when Black is too much.
              </p>
            </div>
            <div>
              <p className="text-xs tracking-widest text-muted uppercase">Body</p>
              <p className="mt-4 font-sans text-2xl font-bold">Aktiv Grotesk Bold</p>
              <p className="mt-1 font-sans text-2xl">Aktiv Grotesk Regular</p>
              <p className="mt-4 font-sans text-xs tracking-lockup uppercase">Badlands Bootcamp</p>
              <p className="mt-6 max-w-md text-sm text-pretty">
                Bold for the place lockup, for short labels, for a button. Regular for everything
                someone has to read. Track the place lockup wide. Do not track body copy.
              </p>
              <p className="mt-4 font-sans text-sm tracking-widest uppercase">
                ABCDEFGHIJKLMNOPQRSTUVWXYZ
                <span className="mt-1 block tracking-normal normal-case">
                  abcdefghijklmnopqrstuvwxyz 0123456789
                </span>
              </p>
            </div>
          </div>
        </Section>

        <Section id="lockups" kicker="04" title="Lockups">
          <p className="max-w-2xl text-pretty">
            The mark does not get redrawn, stretched, stroked, shadowed, or set in a sixth colour.
            Clear space around a lockup is at least the height of the word under it. Do not sit
            the coal mark on a photograph unless there is a plate.
          </p>
          <p className="mt-3 max-w-2xl text-sm text-pretty text-muted">
            .01 to .03 are the public set — Unearth Self, Morganite. .04 onward are the place
            set from the deck, including the ember accents. Pick one lockup per surface.
          </p>
          <div className="mt-8">
            <Lockups />
          </div>
        </Section>

        <Section id="photography" kicker="05" title="Photography">
          <div className="grid gap-8 md:grid-cols-2">
            <p className="text-pretty">
              Natural, close, and a little quiet. Texture of the ground, warm light, a person in
              the middle of something rather than lined up for the camera. Grade it down. The
              picture should feel like the place, not like an advertisement for the place.
            </p>
            <ul className="space-y-2 text-sm">
              <li>The land is the subject. Faces are guests in it.</li>
              <li>Slightly desaturated. No teal-and-orange. No filter that paints the sky ember.</li>
              <li>No stock smile, no handshake, no drone shot used as the only picture.</li>
              <li>If the mark goes on a photo, it goes on a coal or fossil plate, not on the sky.</li>
            </ul>
          </div>
        </Section>

        <Section id="runes" kicker="06" title="Runes">
          <p className="max-w-2xl text-pretty">
            The mark and the runes come from the same geometry: a band around pegs, circles and
            tangents, one family. An early sheet named the shapes after traits. We do not. PACE
            is the language for people. A rune is a shape.
          </p>
          <p className="mt-3 max-w-2xl text-sm text-pretty text-muted">
            The studio is that engine. House mark, or a new rune. Brand colours, or any colour.
            Ground included. Size is measured against the crop, not the file — 100% is the
            largest mark the platform will not shave.
          </p>
          <div className="mt-8">
            <RuneStudio />
          </div>
          <dl className="mt-8 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <Size name="Instagram" detail="Profile picture, stored at 320×320, shown as a circle." />
            <Size name="Google" detail="Business Profile logo, 720×720. Search and Maps crop a circle." />
            <Size name="LinkedIn" detail="Personal profile 400×400, circle. Company logo 300×300, square." />
            <Size name="X" detail="Profile picture 400×400, shown as a circle." />
          </dl>
        </Section>
      </main>
    </div>
  );
}

function Section({
  id,
  kicker,
  title,
  children,
}: {
  id: string;
  kicker: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 border-b border-line py-16">
      <p className="text-xs tracking-widest text-ember uppercase">{kicker}</p>
      <h2 className="mt-2 font-display text-6xl leading-none font-black tracking-tight uppercase md:text-7xl">
        {title}
      </h2>
      <div className="mt-8">{children}</div>
    </section>
  );
}

function Rule({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-sans text-sm font-bold tracking-widest uppercase">{title}</h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Example({
  good,
  label,
  children,
}: {
  good?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <blockquote className={`border p-5 text-sm text-pretty ${good ? "border-coal bg-paper" : "border-line text-muted"}`}>
      <p className="text-xs tracking-widest uppercase">{label}</p>
      <p className="mt-3">{children}</p>
    </blockquote>
  );
}

function SwatchCard({ swatch }: { swatch: (typeof SWATCHES)[number] }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className={`flex min-h-64 flex-col justify-between p-4 ${swatch.bg} ${swatch.fg} ${swatch.id === "fossil" ? "border border-line" : ""}`}>
      <div>
        <p className="font-display text-3xl leading-none font-black tracking-wide uppercase">{swatch.name}</p>
        <p className="mt-2 text-xs tracking-widest uppercase opacity-80">{swatch.role}</p>
      </div>
      <div className="text-xs leading-relaxed">
        <p>{swatch.use}</p>
        <p className="mt-3 font-mono">{swatch.hex}</p>
        <p className="font-mono opacity-80">RGB {swatch.rgb}</p>
        <p className="font-mono opacity-80">CMYK {swatch.cmyk}</p>
        <button
          type="button"
          className="mt-3 underline-offset-2 hover:underline"
          onClick={() => {
            void navigator.clipboard.writeText(swatch.hex).then(() => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1200);
            });
          }}
        >
          {copied ? "Copied" : "Copy hex"}
        </button>
      </div>
    </div>
  );
}

function Size({ name, detail }: { name: string; detail: string }) {
  return (
    <div className="border-t border-line pt-3">
      <dt className="font-bold">{name}</dt>
      <dd className="mt-1 text-muted">{detail}</dd>
    </div>
  );
}
