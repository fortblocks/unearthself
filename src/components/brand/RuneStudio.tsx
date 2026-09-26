import { useMemo, useState } from "react";
import {
  CANVAS_FILL_SPREAD,
  buildExportScene,
  generate,
  generateRandomSeed,
  normalizePath,
  type RoutePeg,
  type RuneGrid,
  type ShapeSeed,
} from "@/brand/engine";
import { FORMATS, type PlatformFormat } from "@/brand/formats";
import { clampFit, contrast, downloadBlob, framedSvg, rasterPng } from "@/brand/frame";
import { MARK_BOUNDS, MARK_D } from "@/brand/mark";
import { HEX, SWATCHES, isHex } from "@/brand/palette";
import { cn } from "@/lib/cn";

const GRIDS: RuneGrid[] = [4, 5, 6];
const OPTIONS = {
  radiusMin: 0.4,
  radiusMax: 0.46,
  spread: CANVAS_FILL_SPREAD,
};

function mintCode(): string {
  const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
  let out = "";
  for (let i = 0; i < 8; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

function houseSeed(): ShapeSeed {
  return generateRandomSeed("badlands", OPTIONS);
}

export function RuneStudio() {
  const [source, setSource] = useState<"mark" | "rune">("mark");
  const [seed, setSeed] = useState<ShapeSeed>(houseSeed);
  const [fill, setFill] = useState(HEX.coal);
  const [background, setBackground] = useState<string | null>(HEX.fossil);
  const [fit, setFit] = useState(1);
  const [formatId, setFormatId] = useState(FORMATS[0]!.id);
  const [code, setCode] = useState("badlands");
  const [busy, setBusy] = useState<"png" | "svg" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const format = FORMATS.find((f) => f.id === formatId) ?? FORMATS[0]!;
  const route = normalizePath(seed.paths.rune ?? []);
  const grid = (seed.grid.rune ?? 4) as RuneGrid;

  const drawn = useMemo(() => {
    if (source === "mark") return { d: MARK_D, bounds: MARK_BOUNDS, error: null as string | null };
    if (route.length < 3) {
      return { d: "", bounds: MARK_BOUNDS, error: "Three pegs, in the order the band visits them." };
    }
    try {
      const output = generate(seed);
      const scene = buildExportScene(output);
      const d = output.rune?.svgPath ?? "";
      if (!d) return { d: "", bounds: scene.bounds, error: "That route does not close into a rune." };
      return { d, bounds: scene.bounds, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : "That route is not a rune.";
      return { d: "", bounds: MARK_BOUNDS, error: message };
    }
  }, [source, seed, route.length]);

  const svg = drawn.d
    ? framedSvg({
        d: drawn.d,
        bounds: drawn.bounds,
        fill,
        background,
        size: format.size,
        fit,
        crop: format.crop,
      })
    : "";

  const weak =
    background != null && isHex(fill) && isHex(background) && contrast(fill, background) < 2;

  function setRoute(next: RoutePeg[], gridSize = grid) {
    setSeed((prev) => ({
      ...prev,
      origin: "designer",
      rngSeed: undefined,
      grid: { rune: gridSize },
      paths: { rune: next },
      closed: { rune: true },
    }));
    setSource("rune");
  }

  function onPeg(col: number, row: number) {
    const hit = route.findIndex((peg) => peg.cell[0] === col && peg.cell[1] === row);
    if (hit === route.length - 1) setRoute(route.slice(0, -1));
    else if (hit >= 0) return;
    else setRoute([...route, { cell: [col, row], side: "auto" }]);
  }

  function generateRune() {
    const next = mintCode();
    setCode(next);
    setSeed(generateRandomSeed(next, OPTIONS));
    setSource("rune");
    setNotice(null);
  }

  function reproduce() {
    const next = code.trim().toLowerCase();
    if (!next) return;
    try {
      setSeed(generateRandomSeed(next, OPTIONS));
      setSource("rune");
      setNotice(null);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "That code does not make a rune.");
    }
  }

  async function save(kind: "png" | "svg") {
    if (!svg) return;
    setBusy(kind);
    setNotice(null);
    try {
      const name = `unearth-self-${format.file}`;
      if (kind === "svg") {
        downloadBlob(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), `${name}.svg`);
      } else {
        downloadBlob(await rasterPng(svg, format.size), `${name}.png`);
      }
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not export.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div>
        <div
          className={cn(
            "brand-preview relative mx-auto aspect-square w-full max-w-xl border border-line",
            background == null && "brand-checker",
          )}
        >
          {svg ? (
            <div className="h-full w-full" dangerouslySetInnerHTML={{ __html: svg }} />
          ) : (
            <p className="grid h-full place-items-center px-8 text-center text-sm text-muted">{drawn.error}</p>
          )}
          {svg && format.crop === "circle" && (
            <div className="brand-crop-circle pointer-events-none absolute rounded-full border border-coal/30" aria-hidden />
          )}
          {svg && format.crop === "square" && (
            <div className="brand-crop-square pointer-events-none absolute rounded-md border border-coal/25" aria-hidden />
          )}
        </div>
        <p className="mt-3 text-sm text-muted">
          {format.platform} · {format.use} · {format.size}×{format.size}
          {format.crop === "circle" ? " · the ring is what the platform keeps" : " · square, slightly rounded on the page"}
          . The file itself is square.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <fieldset>
          <legend className="text-xs tracking-widest text-sandstone uppercase">Mark</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Toggle on={source === "mark"} onClick={() => setSource("mark")}>
              House mark
            </Toggle>
            <Toggle on={source === "rune"} onClick={() => setSource("rune")}>
              A rune
            </Toggle>
          </div>
        </fieldset>

        {source === "rune" && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {GRIDS.map((size) => (
                <Toggle
                  key={size}
                  on={grid === size}
                  onClick={() => {
                    const kept = route.filter((peg) => peg.cell[0] < size && peg.cell[1] < size);
                    setRoute(kept, size);
                  }}
                >
                  {size}×{size}
                </Toggle>
              ))}
              <button type="button" className="h-11 px-3 text-sm text-muted underline-offset-2 hover:underline" onClick={() => setRoute([])}>
                Clear
              </button>
            </div>
            <div
              className="grid gap-1"
              style={{ gridTemplateColumns: `repeat(${grid}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: grid * grid }, (_, i) => {
                const col = i % grid;
                const row = Math.floor(i / grid);
                const index = route.findIndex((peg) => peg.cell[0] === col && peg.cell[1] === row);
                const on = index >= 0;
                return (
                  <button
                    key={`${col}-${row}`}
                    type="button"
                    aria-label={on ? `Peg ${index + 1}, row ${row + 1} column ${col + 1}` : `Empty, row ${row + 1} column ${col + 1}`}
                    onClick={() => onPeg(col, row)}
                    className={cn(
                      "grid h-11 place-items-center rounded-full border text-xs font-bold",
                      on ? "border-coal bg-coal text-fossil" : "border-line bg-paper text-muted",
                    )}
                  >
                    {on ? index + 1 : ""}
                  </button>
                );
              })}
            </div>
            <p className="text-sm text-muted">
              Click in visit order. Click the last peg to take it back. The band wraps itself.
            </p>
            <label className="block text-sm">
              <span className="text-xs tracking-widest text-muted uppercase">Lobe radius</span>
              <input
                type="range"
                min={0.34}
                max={0.48}
                step={0.005}
                value={seed.params.rune?.radiusRatio ?? 0.44}
                onChange={(e) => {
                  const radiusRatio = Number(e.target.value);
                  setSeed((prev) => ({
                    ...prev,
                    origin: "designer",
                    rngSeed: undefined,
                    params: { ...prev.params, rune: { radiusRatio } },
                  }));
                  setSource("rune");
                }}
                className="mt-2 w-full accent-ember"
              />
            </label>
            <div className="flex gap-2">
              <button type="button" className="h-11 flex-1 bg-coal px-3 text-sm text-fossil" onClick={generateRune}>
                Generate
              </button>
              <button type="button" className="h-11 border border-line px-3 text-sm" onClick={() => setRoute(route.slice(0, -1))}>
                Undo
              </button>
            </div>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                reproduce();
              }}
            >
              <label className="sr-only" htmlFor="rune-code">
                Rune code
              </label>
              <input
                id="rune-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                spellCheck={false}
                className="h-11 min-w-0 flex-1 border border-line bg-paper px-3 font-mono text-sm"
                placeholder="Code"
              />
              <button type="submit" className="h-11 border border-line px-3 text-sm">
                Recall
              </button>
            </form>
          </div>
        )}

        <ColourRow label="Rune" value={fill} onChange={setFill} />
        <ColourRow
          label="Ground"
          value={background ?? HEX.fossil}
          onChange={setBackground}
          allowClear
          cleared={background == null}
          onClear={() => setBackground(null)}
        />

        <label className="block text-sm">
          <span className="flex items-baseline justify-between gap-3">
            <span className="text-xs tracking-widest text-muted uppercase">Size in the crop</span>
            <span className="font-mono text-xs">{Math.round(clampFit(fit) * 100)}%</span>
          </span>
          <input
            type="range"
            min={0.45}
            max={1}
            step={0.01}
            value={fit}
            onChange={(e) => setFit(Number(e.target.value))}
            className="mt-2 w-full accent-ember"
          />
          <span className="mt-1 block text-sm text-muted">100% is the largest mark that still sits inside the crop.</span>
        </label>

        <fieldset>
          <legend className="text-xs tracking-widest text-sandstone uppercase">Export</legend>
          <div className="mt-2 flex flex-col gap-1">
            {FORMATS.map((item) => (
              <FormatButton key={item.id} item={item} on={item.id === format.id} onClick={() => setFormatId(item.id)} />
            ))}
          </div>
        </fieldset>

        {weak && (
          <p className="text-sm text-shale">
            That pair is too close. The mark will disappear once the platform crops it.
          </p>
        )}
        {drawn.error && source === "rune" && <p className="text-sm text-shale">{drawn.error}</p>}
        {notice && <p className="text-sm text-shale">{notice}</p>}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={!svg || busy != null}
            onClick={() => void save("png")}
            className="h-11 bg-ember text-sm font-bold text-coal disabled:opacity-40"
          >
            {busy === "png" ? "Saving…" : "PNG"}
          </button>
          <button
            type="button"
            disabled={!svg || busy != null}
            onClick={() => void save("svg")}
            className="h-11 border border-coal text-sm font-bold disabled:opacity-40"
          >
            {busy === "svg" ? "Saving…" : "SVG"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn("h-11 border px-3 text-sm", on ? "border-coal bg-coal text-fossil" : "border-line bg-paper")}
    >
      {children}
    </button>
  );
}

function FormatButton({ item, on, onClick }: { item: PlatformFormat; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "flex h-11 items-baseline justify-between gap-3 border px-3 text-left text-sm",
        on ? "border-coal bg-coal text-fossil" : "border-line bg-paper",
      )}
    >
      <span>
        {item.platform}
        <span className={on ? "text-fossil/60" : "text-muted"}> · {item.use}</span>
      </span>
      <span className="font-mono text-xs">{item.size}</span>
    </button>
  );
}

function ColourRow({
  label,
  value,
  onChange,
  allowClear = false,
  cleared = false,
  onClear,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  allowClear?: boolean;
  cleared?: boolean;
  onClear?: () => void;
}) {
  return (
    <fieldset>
      <legend className="text-xs tracking-widest text-sandstone uppercase">{label}</legend>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {SWATCHES.map((swatch) => {
          const selected = !cleared && value.toLowerCase() === swatch.hex.toLowerCase();
          return (
            <button
              key={swatch.id}
              type="button"
              aria-label={swatch.name}
              aria-pressed={selected}
              onClick={() => onChange(swatch.hex)}
              className={cn("size-11 border border-line", selected && "ring-2 ring-coal ring-offset-2 ring-offset-fossil")}
              style={{ backgroundColor: swatch.hex }}
            />
          );
        })}
        <label className="grid size-11 place-items-center border border-line bg-paper text-xs" title="Any colour">
          <span className="sr-only">Custom {label.toLowerCase()} colour</span>
          <input
            type="color"
            value={isHex(value) ? value : HEX.coal}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            className="h-8 w-8 cursor-pointer border-0 bg-transparent p-0"
          />
        </label>
        {allowClear && (
          <button
            type="button"
            aria-pressed={cleared}
            onClick={onClear}
            className={cn("h-11 border px-3 text-sm", cleared ? "border-coal bg-coal text-fossil" : "border-line")}
          >
            Clear
          </button>
        )}
      </div>
    </fieldset>
  );
}
