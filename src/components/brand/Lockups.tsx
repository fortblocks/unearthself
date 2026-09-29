const LOCKUPS = [
  { n: ".01", slug: "stacked-place", name: "Stacked, with place" },
  { n: ".02", slug: "stacked", name: "Stacked" },
  { n: ".03", slug: "stacked-compact-place", name: "Compact stacked, with place" },
  { n: ".04", slug: "stacked-compact", name: "Compact stacked" },
  { n: ".05", slug: "horizontal-place", name: "Horizontal, with place" },
  { n: ".06", slug: "horizontal", name: "Horizontal" },
  { n: ".07", slug: "badge-place", name: "Badge, with place" },
  { n: ".08", slug: "badge", name: "Badge" },
] as const;

export function Lockups() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {LOCKUPS.map((item) => (
        <figure key={item.slug} className="flex flex-col border border-line bg-paper p-5">
          <div className="flex min-h-64 flex-1 items-center justify-center bg-paper">
            <img
              src={`/brand/lockups/${item.slug}.svg`}
              alt={`Badlands Bootcamp lockup ${item.name}`}
              className="max-h-64 w-full object-contain"
            />
          </div>
          <figcaption className="mt-4 flex flex-wrap items-baseline justify-between gap-3 text-xs tracking-widest uppercase">
            <span className="text-muted">
              {item.name}
              <span className="ml-2 text-coal/40">{item.n}</span>
            </span>
            <span className="flex gap-3 normal-case tracking-normal">
              <a
                href={`/brand/lockups/${item.slug}.svg`}
                download={`badlands-bootcamp-${item.slug}.svg`}
                className="underline-offset-2 hover:underline"
              >
                SVG
              </a>
              <a
                href={`/brand/lockups/${item.slug}.png`}
                download={`badlands-bootcamp-${item.slug}.png`}
                className="underline-offset-2 hover:underline"
              >
                PNG
              </a>
            </span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
