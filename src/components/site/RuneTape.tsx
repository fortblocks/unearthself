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
        <img
          key={`${r.slug}-${i}`}
          src={`/runes/${r.slug}.svg`}
          alt=""
          width={44}
          height={44}
          className="size-10 shrink-0 opacity-90 brightness-0 invert md:size-11"
        />
      ))}
    </div>
  );
}

export function RuneTape() {
  return (
    <div
      className="rune-tape-mask overflow-hidden border-y border-fossil/10 bg-coal py-5 md:py-6"
      aria-hidden="true"
    >
      <div className="rune-tape">
        <Track copies={6} />
        <Track copies={6} />
      </div>
    </div>
  );
}
