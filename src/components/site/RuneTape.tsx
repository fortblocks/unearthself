const RUNES = [
  { slug: "play", name: "Play" },
  { slug: "adaptability", name: "Adaptability" },
  { slug: "connection", name: "Connection" },
  { slug: "experience", name: "Experience" },
] as const;

function Track({ copies }: { copies: number }) {
  const marks = Array.from({ length: copies }, () => RUNES).flat();
  return (
    <div className="flex shrink-0 items-center gap-16 px-8 md:gap-20 md:px-10">
      {marks.map((r, i) => (
        <a
          key={`${r.slug}-${i}`}
          href="/found"
          tabIndex={-1}
          className="rune-door inline-flex size-12 shrink-0 items-center justify-center md:size-14"
        >
          <img
            src={`/runes/${r.slug}.svg`}
            alt=""
            width={44}
            height={44}
            draggable={false}
            className="size-10 shrink-0 opacity-85 brightness-0 invert md:size-11"
          />
        </a>
      ))}
    </div>
  );
}

export function RuneTape() {
  return (
    <div className="rune-tape-mask overflow-hidden border-t border-fossil/10 bg-coal py-3.5 md:py-4">
      <a href="/found" className="sr-only">
        A door, if you are looking
      </a>
      <div className="rune-tape" aria-hidden="true">
        <Track copies={6} />
        <Track copies={6} />
      </div>
    </div>
  );
}
