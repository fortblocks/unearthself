/**
 * Seeded, constrained **on-brand** shape generation (M5 randomiser).
 *
 * The job is NOT "pick random pegs and sides" — a naive randomiser produces
 * mostly off-brand shapes (project brief §5: if a random output can look
 * off-brand, the constraints are wrong, not the output). This is a **curated
 * envelope** generator: it stays in the rune family *by construction*.
 *
 * **The brand is carving, not blobbing.** Ravi's runes (reference/ravi-test-set)
 * are dense WOVEN routes — the belt doubles back between an outer ring and the
 * grid's interior, wrapping the *inner* side at the reentrant pegs and cutting
 * deep V-notches, waists, and K/X interlocks INTO the silhouette. That negative
 * space is the engine's whole expressive language.
 *
 * **The structural invariant** (read off Ravi's reverse-engineered route): every
 * consecutive peg is ADJACENT — a king-move, distance 1 or √2:
 *   (0,0)→(1,1)→(2,0)→(3,1)→(2,2)→(1,3)→(2,3)→(1,2)→(0,2)→(0,1)→close
 * That adjacency is *why* the bumps merge into one continuous thick band with
 * notches and never degrade into balls-on-sticks. A radial "cog" (pegs spread
 * around a centre at free radii) breaks it — far-apart consecutive pegs neck
 * down to thin stalks → off-brand splats. So the route is a **connected weaving
 * walk of adjacent cells**, not a scatter.
 *
 * The generator (founder-confirmed, M5 — route-first, auto carves):
 *   • **Rune tier only**, biased to Ravi's 5×5 / 6×6 (weaving needs room).
 *   • **Self-avoiding king-walk**: step cell→adjacent cell, ~8–12 steps, biased
 *     to keep turning (each turn-back is a reentrant notch) and to curl into a
 *     loop. New segments that would cross the path are refused, so the closed
 *     polygon stays SIMPLE — adjacency keeps the band thick, weaving carves it.
 *   • **Wraps stay `auto`** (founder Q1): the signed-off Ravi reproduction runs
 *     under all-auto — the engine's local-convex rule resolves to the inner side
 *     at a reentrant vertex and carves the notch on its own. The route does the
 *     work; auto does the carving. (Surgical explicit a/b is a future lever.)
 *   • **Rejected** if not a simple polygon, too convex (a blob — solidity
 *     ceiling), traps an enclosed hole, trips the B2 span guard, or won't span.
 *
 * **Determinism is the core promise** (spec §3): `generateRandomSeed(rngSeed)`
 * is a pure function of its `rngSeed` (+ options). The whole pipeline — every
 * draw AND every rejected-then-retried attempt — pulls from one PRNG seeded off
 * the `rngSeed`, so the same code always yields the identical `ShapeSeed`, hence
 * identical geometry. A *new* code (the editor mints one per "Generate") gives a
 * different shape. Engine-pure: no DOM, no `Math.random`.
 */

import type { Cell, RoutePeg, RuneGrid, ShapeSeed } from "./types";
import type { Point } from "./output";
import { buildBand, hasEnclosedHole, hasSpanPegConflict, type LayerGeometryInput } from "./geometry";
import { validateSeed } from "./validate";

/** Physical radius limits (spec §1.4): pegs touch at 0.5, so stay below. */
const RADIUS_MAX = 0.49;
/** Render-quality knob, matched to the editor's default so seeds round-trip cleanly. */
const ARC_RESOLUTION = 128;
/** A neutral default ink; the editor overrides it with its own palette on load. */
const DEFAULT_COLOR = "#161718";
/** Retry budget — weaving walks reject more than convex loops, but bounded. */
const MAX_ATTEMPTS = 600;
/**
 * Retry budget when a canvas-fill `SpreadProfile` is active (everyday mode). The
 * stricter floor rejects more candidates, so it gets headroom — a safety ceiling
 * (well within instant-feel: each attempt is sub-millisecond), NOT a target. If
 * generation ever approaches it, loosen the profile rather than raising this.
 */
const CANVAS_FILL_MAX_ATTEMPTS = 2000;
/**
 * Solidity CEILING — the on-brand "is it actually carved?" gate. Solidity =
 * filled area / convex-hull area: a convex blob ≈ 1.0; every notch, waist, and
 * hook drives it down. We reject anything ABOVE it — i.e. anything that didn't
 * carve enough negative space to read as a rune rather than a lump.
 */
const SOLIDITY_MAX = 0.82;

/** The 8 king-move directions in (col,row), row increasing downward. */
const DIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
];

/**
 * Canvas-spread invariant (M7-P2). A naive walk can satisfy the old absolute
 * `hasSpread` floor (bbox ≥ 2 cells each axis) yet still huddle in one region of
 * a coarse grid — e.g. a 3×3 cluster in a corner of a 6×6. Ravi's nine instead
 * read **large and canvas-filling**. A `SpreadProfile` raises the floor so a
 * generation reaches across the frame:
 *   • `bboxFraction` — the route's bounding box must span at least this fraction
 *     of the grid extent (`grid-1`) on BOTH axes ("reaches across"), and
 *   • `minBorders` — the route must touch at least this many of the 4 grid
 *     borders ("can't hug one corner"; ≥3 forces a full-extent span on ≥1 axis).
 * The two floors are complementary. Numbers are the M7-P2 aesthetic sign-off
 * item — tuned by eye against the nine, kept as LOOSE as still kills clustering
 * so the generator preserves the nine's own range of canvas-fill, not homogenise.
 */
export interface SpreadProfile {
  /** Min fraction of grid extent (`grid-1`) the bbox must span on each axis. */
  bboxFraction: number;
  /** Min count of the 4 grid borders (L/R/T/B) the route must touch. */
  minBorders: number;
}

/**
 * The everyday-mode (`/create`) canvas-fill profile — the tuned candidate for
 * the M7-P2 gate. Designer mode passes no profile and keeps the legacy floor.
 */
export const CANVAS_FILL_SPREAD: SpreadProfile = { bboxFraction: 0.6, minBorders: 3 };

/** Options narrowing the envelope (grid, radius band, canvas-fill profile). */
export interface RandomSeedOptions {
  /** Force a specific rune grid; otherwise weighted toward the sweet-spot 5×5. */
  grid?: RuneGrid;
  /**
   * Clamp generated peg radius to `[radiusMin, radiusMax]` (everyday band,
   * 0.40–0.46). When omitted, the organic `weaveRadius` default is used. Both
   * must be supplied together to take effect.
   */
  radiusMin?: number;
  radiusMax?: number;
  /**
   * Canvas-fill invariant (M7-P2). When supplied, accepted routes must clear it
   * (see `SpreadProfile`); when omitted, only the legacy absolute floor applies,
   * so designer-mode output is unchanged.
   */
  spread?: SpreadProfile;
}

/** xfnv1a string hash → 32-bit unsigned seed for the PRNG. */
function hashSeed(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 — a small, fast, fully-deterministic PRNG in [0, 1). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/**
 * Grid choice biased to Ravi's 5×5, with a healthy share of 6×6 and the
 * occasional tight 4×4. Weaving wants room, so the coarse grids lead.
 */
function weightedGrid(rand: () => number): RuneGrid {
  const x = rand();
  if (x < 0.5) return 5;
  if (x < 0.8) return 6;
  return 4;
}

/**
 * Peg radius. Centred a touch below the old sweet spot so the belt leaves crisp
 * notches between woven pegs instead of flooding them shut, but still firmly in
 * the organic upper range (never spindly-thin).
 */
function weaveRadius(rand: () => number): number {
  const v = 0.4 + (rand() - 0.5) * 0.16; // ≈0.40 ± 0.08
  return clamp(v, 0.3, RADIUS_MAX);
}

/**
 * The radius for this draw. With a band (everyday mode) the value is drawn
 * uniformly inside `[radiusMin, radiusMax]` so the result is in-band **by
 * construction** — no post-hoc clamp needed, and the `rngSeed` reproduces an
 * already-valid everyday shape. Without a band, the organic `weaveRadius`
 * default. Exactly one `rand()` is drawn either way, so determinism is stable
 * within each configuration.
 */
function pickRadius(rand: () => number, options: RandomSeedOptions): number {
  if (options.radiusMin !== undefined && options.radiusMax !== undefined) {
    const lo = Math.min(options.radiusMin, options.radiusMax);
    const hi = Math.max(options.radiusMin, options.radiusMax);
    return clamp(lo + rand() * (hi - lo), 0.05, RADIUS_MAX);
  }
  return weaveRadius(rand);
}

/** Target walk length (peg count) per grid — matches the reference density. */
function walkTarget(rand: () => number, grid: RuneGrid): number {
  if (grid === 4) return 7 + Math.floor(rand() * 3); // 7–9
  if (grid === 5) return 8 + Math.floor(rand() * 4); // 8–11
  return 9 + Math.floor(rand() * 5); // 6×6: 9–13
}

/**
 * Proper segment-crossing test (open segments). Shared endpoints don't count as
 * a crossing — only a genuine interior intersection does. Collinear overlap is
 * impossible for unit king-edges, so the simple orientation test suffices.
 */
function segmentsCross(p1: Cell, p2: Cell, p3: Cell, p4: Cell): boolean {
  const same = (a: Cell, b: Cell) => a[0] === b[0] && a[1] === b[1];
  if (same(p1, p3) || same(p1, p4) || same(p2, p3) || same(p2, p4)) return false;
  const o = (a: Cell, b: Cell, c: Cell) =>
    Math.sign((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
  return o(p3, p4, p1) !== o(p3, p4, p2) && o(p1, p2, p3) !== o(p1, p2, p4);
}

/** Would appending `next` (from `cur`) cross any earlier walk segment? */
function wouldCross(cells: Cell[], cur: Cell, next: Cell): boolean {
  // Skip the final existing segment — it ends at `cur` (shared endpoint).
  for (let i = 0; i + 1 < cells.length - 1; i++) {
    if (segmentsCross(cells[i]!, cells[i + 1]!, cur, next)) return true;
  }
  return false;
}

/**
 * Build a REENTRANT route as a self-avoiding king-walk. Each step prefers a
 * gentle turn (peak preference around a 45–90° bend) so the path keeps weaving —
 * every turn-back becomes a notch — with a per-shape rotational bias that curls
 * it toward a closeable loop. Candidates that leave the grid, revisit a cell, or
 * cross the existing path are refused, keeping the closed polygon simple. The
 * carving then falls out of the belt under all-auto wraps.
 */
function buildWalkRoute(rand: () => number, grid: RuneGrid): RoutePeg[] {
  const target = walkTarget(rand, grid);
  const cells: Cell[] = [];
  const visited = new Set<string>();
  const key = (c: Cell) => `${c[0]},${c[1]}`;

  let cur: Cell = [Math.floor(rand() * grid), Math.floor(rand() * grid)];
  cells.push(cur);
  visited.add(key(cur));
  let heading = Math.floor(rand() * 8);
  let curl = rand() < 0.5 ? 1 : -1; // current curl sense — FLIPS as we weave
  const runLen = 2 + Math.floor(rand() * 2); // 2–3 steps per curl run

  while (cells.length < target) {
    // Serpentine: flip the curl direction every `runLen` steps. A run curling
    // one way then the other folds reflex vertices INTO the outline — those are
    // the notches `auto` carves. A single constant curl just traces a convex
    // loop (a blob); alternating runs are what make it read as a woven rune.
    if (cells.length % runLen === 0) curl = -curl;
    let best: { cell: Cell; h: number } | null = null;
    let bestScore = -Infinity;
    for (let h = 0; h < 8; h++) {
      const d = DIRS[h]!;
      const next: Cell = [cur[0] + d[0], cur[1] + d[1]];
      if (next[0] < 0 || next[0] >= grid || next[1] < 0 || next[1] >= grid) continue;
      if (visited.has(key(next))) continue;
      if (wouldCross(cells, cur, next)) continue;
      // Turn magnitude from current heading, in 45° units, folded to [-4, 4].
      const t = ((h - heading + 12) % 8) - 4;
      const mag = Math.abs(t);
      // Prefer a firm turn (~2 steps, a 90° fold) → weaving; penalise straight &
      // reverse. Curl toward the current run's sense; jitter for variety.
      const score = -Math.abs(mag - 2) + curl * t * 0.55 + rand() * 0.9;
      if (score > bestScore) {
        bestScore = score;
        best = { cell: next, h };
      }
    }
    if (!best) break; // boxed in — stop; caller redraws if too short.
    cells.push(best.cell);
    visited.add(key(best.cell));
    heading = best.h;
    cur = best.cell;
  }

  return cells.map((cell) => ({ cell, side: "auto" }));
}

/**
 * Reject sets that don't fill their frame (a rune spans the canvas, spec §1.4).
 *
 * Without a `profile` this is the legacy absolute floor (bbox ≥ 2 cells on each
 * axis) — keeps designer-mode output identical. With a `profile` (everyday) it
 * raises to the canvas-fill invariant: the bbox must span `bboxFraction` of the
 * grid extent on both axes AND touch `minBorders` of the 4 borders. See
 * `SpreadProfile`.
 */
function meetsSpread(route: RoutePeg[], grid: RuneGrid, profile?: SpreadProfile): boolean {
  const xs = route.map((p) => p.cell[0]);
  const ys = route.map((p) => p.cell[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = maxX - minX;
  const spanY = maxY - minY;
  if (!profile) return spanX >= 2 && spanY >= 2; // legacy floor (designer).
  const extent = grid - 1;
  const need = profile.bboxFraction * extent;
  if (spanX < need || spanY < need) return false;
  let borders = 0;
  if (minX === 0) borders += 1;
  if (maxX === extent) borders += 1;
  if (minY === 0) borders += 1;
  if (maxY === extent) borders += 1;
  return borders >= profile.minBorders;
}

/** Is the closed route a SIMPLE polygon (no two non-adjacent edges cross)? */
function routeSimple(route: RoutePeg[]): boolean {
  const n = route.length;
  if (n < 3) return false;
  const c = route.map((p) => p.cell);
  for (let i = 0; i < n; i++) {
    const a = c[i]!;
    const b = c[(i + 1) % n]!;
    for (let j = i + 1; j < n; j++) {
      if (j === i) continue;
      if ((i + 1) % n === j || (j + 1) % n === i) continue; // edges share a vertex
      if (segmentsCross(a, b, c[j]!, c[(j + 1) % n]!)) return false;
    }
  }
  return true;
}

/** Shoelace area of a single closed contour. */
function contourArea(contour: Point[]): number {
  let a2 = 0;
  for (let i = 0; i < contour.length; i++) {
    const u = contour[i]!;
    const v = contour[(i + 1) % contour.length]!;
    a2 += u[0] * v[1] - v[0] * u[1];
  }
  return Math.abs(a2) / 2;
}

/** Convex-hull area (Andrew's monotone chain) of a point cloud. */
function convexHullArea(points: Point[]): number {
  if (points.length < 3) return 0;
  const pts = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Point, a: Point, b: Point) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const build = (src: Point[]) => {
    const h: Point[] = [];
    for (const p of src) {
      while (h.length >= 2 && cross(h[h.length - 2]!, h[h.length - 1]!, p) <= 0) h.pop();
      h.push(p);
    }
    return h;
  };
  return contourArea(build(pts).slice(0, -1).concat(build(pts.slice().reverse()).slice(0, -1)));
}

/**
 * Solidity of the rendered silhouette: filled area ÷ convex-hull area. 1.0 means
 * fully convex (a blob); every notch/waist/hook carved into the outline pulls it
 * down. Computed on the FINAL traced band, so it reflects what renders.
 */
function solidity(contours: Point[][]): number {
  let area = 0;
  const all: Point[] = [];
  for (const c of contours) {
    if (c.length < 3) continue;
    area += contourArea(c);
    for (const p of c) all.push(p);
  }
  const hull = convexHullArea(all);
  if (hull <= 0) return 1;
  return area / hull;
}

/** Assemble a canonical rune `ShapeSeed` carrying its random provenance. */
function assembleSeed(
  route: RoutePeg[],
  grid: RuneGrid,
  radiusRatio: number,
  rngSeed: string,
): ShapeSeed {
  return {
    version: 1,
    tier: "rune",
    grid: { rune: grid },
    paths: { rune: route },
    closed: { rune: true },
    params: { rune: { radiusRatio }, arcResolution: ARC_RESOLUTION },
    layers: { mode: "overlay", rune: { color: DEFAULT_COLOR, z: 0 } },
    origin: "random",
    rngSeed,
  };
}

/**
 * A candidate is on-brand iff it is valid, spans the grid, is a simple polygon,
 * renders CARVED (not a convex blob — solidity ceiling), traps no enclosed hole,
 * and clears the B2 span guard. The silhouette is traced ONCE via `buildBand`
 * and reused for the solidity measure and the enclosed-hole test, so "does it
 * look on-brand" is judged on the geometry that actually renders.
 */
function acceptable(
  seed: ShapeSeed,
  grid: RuneGrid,
  radiusRatio: number,
  route: RoutePeg[],
  spread?: SpreadProfile,
): boolean {
  if (!meetsSpread(route, grid, spread)) return false; // cheap bbox reject before anything heavy.
  if (!routeSimple(route)) return false; // closed walk must be a simple polygon.
  try {
    validateSeed(seed);
  } catch {
    return false;
  }
  const input: LayerGeometryInput = {
    path: route,
    cols: grid,
    rows: grid,
    closed: true,
    radiusRatio,
    arcResolution: ARC_RESOLUTION,
  };
  const { contours } = buildBand(input);
  if (contours.length === 0) return false;
  if (solidity(contours) > SOLIDITY_MAX) return false; // too convex — a blob, not a rune.
  if (hasEnclosedHole(contours)) return false; // no enclosed holes for runes (spec §8.6).
  if (hasSpanPegConflict(input)) return false; // B2: no span through a non-incident peg.
  return true;
}

/**
 * Deterministic last-resort: a reentrant CROWN (two carved notches, top and
 * bottom) built from adjacent pegs. Unlike a convex inset square, the fallback
 * is itself on-brand — so even the vanishingly-rare miss yields a carved rune.
 */
function fallbackSeed(rngSeed: string, grid: RuneGrid, radiusRatio: number): ShapeSeed {
  const hi = grid - 1;
  const mid = Math.floor(hi / 2);
  const dip = Math.max(1, Math.round(grid * 0.25));
  // Corners + two notches: touches all 4 borders and spans the full extent on
  // both axes, so it clears CANVAS_FILL_SPREAD as well as the legacy floor —
  // even the rare miss yields a carved, canvas-filling rune.
  const route: RoutePeg[] = [
    { cell: [0, 0], side: "auto" },
    { cell: [mid, dip], side: "auto" }, // top notch
    { cell: [hi, 0], side: "auto" },
    { cell: [hi, hi], side: "auto" },
    { cell: [mid, hi - dip], side: "auto" }, // bottom notch
    { cell: [0, hi], side: "auto" },
  ];
  return assembleSeed(route, grid, radiusRatio, rngSeed);
}

/**
 * Generate a valid, on-brand rune `ShapeSeed` deterministically from `rngSeed`.
 *
 * Same `rngSeed` (+ options) → identical seed → identical geometry. See the file
 * header for the constraint model; the result is ready to save/export like any
 * hand-built shape, and carries `origin: "random"` + the `rngSeed` so a good
 * result is reproducible.
 */
export function generateRandomSeed(rngSeed: string, options: RandomSeedOptions = {}): ShapeSeed {
  const rand = mulberry32(hashSeed(rngSeed));
  // The canvas-fill profile rejects more candidates than the legacy floor, so it
  // gets more headroom before the fallback. The cap is a safety ceiling, not a
  // target — if real generation ever approaches it, that signals the spread
  // floor is too tight (loosen the profile), not that the cap should rise.
  const maxAttempts = options.spread ? CANVAS_FILL_MAX_ATTEMPTS : MAX_ATTEMPTS;
  // Under a strict canvas-fill floor, a small grid satisfies far more easily, so
  // a per-attempt grid reroll would skew everyday output overwhelmingly to 4×4
  // and gut the batch's variety. Lock the grid ONCE (honouring the 5×5-led
  // weighting) and retry only the route within it. The legacy path keeps its
  // per-attempt reroll, so designer output is byte-for-byte unchanged (the
  // ternary draws no `rand()` when there's no spread profile).
  const fixedGrid = options.grid ?? (options.spread ? weightedGrid(rand) : undefined);
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const grid = fixedGrid ?? weightedGrid(rand);
    const radiusRatio = pickRadius(rand, options);
    const route = buildWalkRoute(rand, grid);
    if (route.length < 6) continue; // too sparse to weave — redraw.
    const seed = assembleSeed(route, grid, radiusRatio, rngSeed);
    if (acceptable(seed, grid, radiusRatio, route, options.spread)) return seed;
  }
  // Deterministic fallback radius: band midpoint (everyday) or the organic 0.4.
  const fallbackRadius =
    options.radiusMin !== undefined && options.radiusMax !== undefined
      ? (options.radiusMin + options.radiusMax) / 2
      : 0.4;
  return fallbackSeed(rngSeed, fixedGrid ?? 5, fallbackRadius);
}
