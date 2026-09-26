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
  type WrapSide,
} from "@/brand/engine";
import { FORMATS, type PlatformFormat } from "@/brand/formats";
import {
  clampFit,
  contrast,
  downloadBlob,
  framedSvg,
  rasterPng,
  type Depth,
  type Lettering,
} from "@/brand/frame";
import { MARK_BOUNDS, MARK_D } from "@/brand/mark";
import { GROUNDS, LINES, OFFICIAL } from "@/brand/official";
import { HEX, SWATCHES, isHex } from "@/brand/palette";
import { cn } from "@/lib/cn";

const GRIDS: RuneGrid[] = [4, 5, 6];
const OPTIONS = { radiusMin: 0.34, radiusMax: 0.46, spread: CANVAS_FILL_SPREAD };
const PNG_SIZES = [1024, 2048, 4096];

function mintCode(): string {
  const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
  let out = "";
  for (let i = 0; i < 8; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

async function embedPhoto(src: string | null): Promise<string | null> {
  if (!src) return null;
  if (src.startsWith("data:")) return src;
  const res = await fetch(src);
  if (!res.ok) throw new Error("Could not load the ground photograph.");
  const blob = await res.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the ground photograph."));
    reader.readAsDataURL(blob);
  });
}

function houseSeed(): ShapeSeed {
  return generateRandomSeed("badlands", OPTIONS);
}

export function RuneStudio() {
  const [source, setSource] = useState<"mark" | "rune">("mark");
  const [seed, setSeed] = useState<ShapeSeed>(houseSeed);
  const [fill, setFill] = useState(HEX.coal);
  const [groundId, setGroundId] = useState<(typeof GROUNDS)[number]["id"]>("fossil");
  const [fit, setFit] = useState(1);
  const [formatId, setFormatId] = useState(FORMATS[0]!.id);
  const [code, setCode] = useState("badlands");
  const [json, setJson] = useState("");
  const [official, setOfficial] = useState("");
  const [lettering, setLettering] = useState<Lettering>("none");
  const [line, setLine] = useState<string>(LINES[0]);
  const [depth, setDepth] = useState<Depth>("flat");
  const [pngSize, setPngSize] = useState(2048);
  const [busy, setBusy] = useState<"png" | "svg" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [drag, setDrag] = useState<number | null>(null);

  const format = FORMATS.find((f) => f.id === formatId) ?? FORMATS[0]!;
  const route = normalizePath(seed.paths.rune ?? []);
  const grid = (seed.grid.rune ?? 4) as RuneGrid;
  const ground = GROUNDS.find((g) => g.id === groundId) ?? GROUNDS[0]!;
  const background = ground.hex;

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
        photo: ground.photo,
        size: pngSize,
        fit,
        crop: format.crop,
        lettering,
        line,
        depth,
        pixels: false,
      })
    : "";

  const weak = background != null && isHex(fill) && isHex(background) && contrast(fill, background) < 2;

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
    setOfficial("");
  }

  function onPeg(col: number, row: number) {
    const hit = route.findIndex((peg) => peg.cell[0] === col && peg.cell[1] === row);
    if (hit === route.length - 1) setRoute(route.slice(0, -1));
    else if (hit >= 0) return;
    else setRoute([...route, { cell: [col, row], side: "auto" }]);
  }

  function movePeg(from: number, col: number, row: number) {
    const current = route[from];
    if (!current) return;
    const occupant = route.findIndex((peg) => peg.cell[0] === col && peg.cell[1] === row);
    const next = route.map((peg) => ({ ...peg }));
    if (occupant === from) return;
    if (occupant >= 0) {
      const [moved] = next.splice(from, 1);
      if (!moved) return;
      next.splice(occupant > from ? occupant - 1 : occupant, 0, moved);
    } else {
      next[from] = { ...current, cell: [col, row] };
    }
    setRoute(next);
  }

  function flipPeg(index: number) {
    const order: WrapSide[] = ["auto", "a", "b"];
    const peg = route[index];
    if (!peg) return;
    const i = order.indexOf(peg.side);
    const next = route.map((item, n) => (n === index ? { ...item, side: order[(i + 1) % order.length]! } : item));
    setRoute(next);
  }

  function loadOfficial(id: string) {
    const found = OFFICIAL.find((item) => item.id === id);
    if (!found) return;
    setOfficial(id);
    setSeed(found.seed);
    setSource("rune");
    setNotice(null);
  }

  function loadJson() {
    try {
      const parsed = JSON.parse(json) as ShapeSeed;
      if (!parsed || parsed.version !== 1 || !parsed.paths) throw new Error("Not a seed.");
      setSeed(parsed);
      setSource("rune");
      setOfficial("");
      setNotice("Seed loaded.");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "That is not a seed.");
    }
  }

  function generateRune() {
    const next = mintCode();
    setCode(next);
    setSeed(generateRandomSeed(next, OPTIONS));
    setSource("rune");
    setOfficial("");
    setNotice(null);
  }

  function reproduce() {
    const next = code.trim().toLowerCase();
    if (!next) return;
    try {
      setSeed(generateRandomSeed(next, OPTIONS));
      setSource("rune");
      setOfficial("");
      setNotice(null);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "That code does not make a rune.");
    }
  }

  async function save(kind: "png" | "svg") {
    if (!drawn.d) return;
    setBusy(kind);
    setNotice(null);
    try {
      const photo = await embedPhoto(ground.photo);
      const fileSvg = framedSvg({
        d: drawn.d,
        bounds: drawn.bounds,
        fill,
        background,
        photo,
        size: pngSize,
        fit,
        crop: format.crop,
        lettering,
        line,
        depth,
        pixels: true,
      });
      const name = `unearth-self-${format.file}${depth === "relief" ? "-relief" : ""}`;
      if (kind === "svg") {
        downloadBlob(new Blob([fileSvg], { type: "image/svg+xml;charset=utf-8" }), `${name}.svg`);
      } else {
        downloadBlob(await rasterPng(fileSvg, pngSize), `${name}-${pngSize}.png`);
      }
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not export.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div>
        <div
          className={cn(
            "brand-preview relative mx-auto aspect-square w-full max-w-xl overflow-hidden border border-line",
            background == null && !ground.photo && "brand-checker",
            depth === "relief" && "brand-relief",
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
          {format.platform} · {format.use} · PNG at {pngSize}px. The preview is vector. The file is
          drawn four times larger, then tightened, so the edge stays sharp.
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
            <label className="block text-sm">
              <span className="text-xs tracking-widest text-muted uppercase">Official seeds</span>
              <select
                value={official}
                onChange={(e) => loadOfficial(e.target.value)}
                className="mt-2 h-11 w-full border border-line bg-paper px-3 text-sm"
              >
                <option value="">Choose a rune</option>
                {OFFICIAL.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
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
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${grid}, minmax(0, 1fr))` }}>
              {Array.from({ length: grid * grid }, (_, i) => {
                const col = i % grid;
                const row = Math.floor(i / grid);
                const index = route.findIndex((peg) => peg.cell[0] === col && peg.cell[1] === row);
                const on = index >= 0;
                const side = on ? route[index]!.side : "auto";
                return (
                  <button
                    key={`${col}-${row}`}
                    type="button"
                    draggable={on}
                    onDragStart={() => setDrag(index)}
                    onDragEnd={() => setDrag(null)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (drag == null) return;
                      movePeg(drag, col, row);
                      setDrag(null);
                    }}
                    onClick={() => onPeg(col, row)}
                    onDoubleClick={(e) => {
                      e.preventDefault();
                      if (on) flipPeg(index);
                    }}
                    aria-label={on ? `Peg ${index + 1}, wrap ${side}` : `Empty ${col + 1},${row + 1}`}
                    className={cn(
                      "relative grid h-11 place-items-center rounded-full border text-xs font-bold",
                      on ? "border-coal bg-coal text-fossil" : "border-line bg-paper text-muted",
                      drag === index && "opacity-50",
                    )}
                  >
                    {on ? index + 1 : ""}
                    {on && side !== "auto" ? (
                      <span className="absolute right-0.5 bottom-0.5 text-[0.55rem] tracking-widest uppercase">{side}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <p className="text-sm text-muted">
              Click in visit order. Drag a number onto another cell to move it, or onto another number
              to change the order. Double-click a peg to flip the wrap (auto / a / b).
            </p>
            <label className="block text-sm">
              <span className="text-xs tracking-widest text-muted uppercase">Lobe radius</span>
              <input
                type="range"
                min={0.34}
                max={0.48}
                step={0.005}
                value={seed.params.rune?.radiusRatio ?? 0.37}
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
            <label className="block text-sm">
              <span className="text-xs tracking-widest text-muted uppercase">Seed JSON</span>
              <textarea
                value={json}
                onChange={(e) => setJson(e.target.value)}
                rows={4}
                spellCheck={false}
                className="mt-2 w-full resize-y border border-line bg-paper px-3 py-2 font-mono text-xs"
                placeholder="Paste a seed from the original tool"
              />
            </label>
            <div className="flex gap-2">
              <button type="button" className="h-11 flex-1 border border-line px-3 text-sm" onClick={loadJson}>
                Load seed
              </button>
              <button
                type="button"
                className="h-11 flex-1 border border-line px-3 text-sm"
                onClick={() => {
                  const packed = JSON.stringify(seed);
                  setJson(packed);
                  void navigator.clipboard?.writeText(packed);
                  setNotice("Seed copied.");
                }}
              >
                Copy seed
              </button>
            </div>
          </div>
        )}

        <ColourRow label="Rune" value={fill} onChange={setFill} />

        <fieldset>
          <legend className="text-xs tracking-widest text-sandstone uppercase">Ground</legend>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {GROUNDS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setGroundId(item.id)}
                className={cn(
                  "h-11 border text-xs",
                  groundId === item.id ? "border-coal" : "border-line",
                )}
                style={
                  item.photo
                    ? { backgroundImage: `url(${item.photo})`, backgroundSize: "cover", color: "#F8F0ED" }
                    : { background: item.hex ?? "transparent", color: item.hex === "#161718" || item.hex === "#423530" ? "#F8F0ED" : "#161718" }
                }
              >
                {item.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-xs tracking-widest text-sandstone uppercase">Wordmark</legend>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {(["none", "under", "ring"] as const).map((item) => (
              <Toggle key={item} on={lettering === item} onClick={() => setLettering(item)}>
                {item === "none" ? "None" : item === "under" ? "Under" : "Ring"}
              </Toggle>
            ))}
          </div>
          {lettering !== "none" && (
            <div className="mt-2 flex flex-col gap-2">
              {LINES.map((item) => (
                <Toggle key={item} on={line === item} onClick={() => setLine(item)}>
                  {item}
                </Toggle>
              ))}
              <input
                value={line}
                onChange={(e) => setLine(e.target.value.toUpperCase())}
                className="h-11 border border-line bg-paper px-3 text-sm"
                aria-label="Wordmark line"
              />
            </div>
          )}
        </fieldset>

        <fieldset>
          <legend className="text-xs tracking-widest text-sandstone uppercase">Form</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Toggle on={depth === "flat"} onClick={() => setDepth("flat")}>
              Flat
            </Toggle>
            <Toggle on={depth === "relief"} onClick={() => setDepth("relief")}>
              3D relief
            </Toggle>
          </div>
          <p className="mt-2 text-sm text-muted">
            Relief is a stacked extrusion for lockups and posts.{" "}
            <a className="underline underline-offset-2" href="https://badlands.artsu.com/" target="_blank" rel="noreferrer">
              Open the original 3D export
            </a>{" "}
            when you need STL or GLB.
          </p>
        </fieldset>

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
        </label>

        <fieldset>
          <legend className="text-xs tracking-widest text-sandstone uppercase">Export</legend>
          <div className="mt-2 flex flex-col gap-1">
            {FORMATS.map((item) => (
              <FormatButton key={item.id} item={item} on={item.id === format.id} onClick={() => setFormatId(item.id)} />
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            {PNG_SIZES.map((size) => (
              <Toggle key={size} on={pngSize === size} onClick={() => setPngSize(size)}>
                {size}
              </Toggle>
            ))}
          </div>
        </fieldset>

        {weak && <p className="text-sm text-shale">That pair is too close. The mark will vanish on a crop.</p>}
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
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <fieldset>
      <legend className="text-xs tracking-widest text-sandstone uppercase">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {SWATCHES.map((swatch) => (
          <button
            key={swatch.id}
            type="button"
            aria-label={swatch.name}
            onClick={() => onChange(swatch.hex)}
            className={cn("size-9 border", value === swatch.hex ? "border-coal" : "border-line")}
            style={{ background: swatch.hex }}
          />
        ))}
        <input
          type="color"
          value={isHex(value) ? value : "#161718"}
          onChange={(e) => onChange(e.target.value)}
          className="size-9 cursor-pointer border border-line bg-paper p-0"
          aria-label={`${label} picker`}
        />
      </div>
    </fieldset>
  );
}
