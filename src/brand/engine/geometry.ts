/**
 * Core geometry: the **belt-around-pulleys** model (visual spec §1.1a).
 *
 * A shape is an ordered route of equal-radius pegs joined by a taut elastic
 * **band**. The band is the *boundary* of the solid — not a constant-width tube
 * around a spine (that was the superseded M1 model, spec §1.1b). At each peg the
 * band turns around **one side**; the region the band encloses is filled.
 *
 * Per peg we pick a wrap **sense** — the rotational direction the band travels
 * around that peg's arc:
 *   - `+1` = CCW  (seed side `"a"`)
 *   - `−1` = CW   (seed side `"b"`)
 * Between two consecutive pegs the band runs along the **common tangent** fixed
 * by their two senses:
 *   - **same** senses → an *external* tangent (band stays on one side);
 *   - **opposite** senses → an *internal/crossing* tangent (the band crosses
 *     between them — this is what pinches Ravi's waist). The internal tangent
 *     only exists when the centres are ≥ `2r` apart; closer than that, that
 *     sense combination is physically impossible ("grip empty air") and is
 *     coerced to the feasible side.
 *
 * `auto` resolves to the **outer/convex** side (the route's overall winding),
 * giving a plain route the obvious rounded convex polygon; explicit `a`/`b`
 * override individual pegs to carve necks and notches — the whole expressive
 * language of the system.
 *
 * The traced boundary is emitted as a single closed ring (closed route) or the
 * out-and-back tube boundary (open route), wound consistently, and rendered
 * under **nonzero** fill so self-crossings union into one solid (spec §1.2).
 * Consumers MUST render the path with `fill-rule: nonzero`.
 *
 * **Known limitation — B2 (deferred).** The tracer and the `choiceAvailable`
 * validity flag are both *pairwise*: each free span is the common tangent of its
 * two endpoint pegs only. A span passing through a third, non-consecutive peg's
 * disk is therefore neither deflected by the tracer nor flagged as invalid — a
 * real elastic would drape over that peg. This is a genuine gap in the physical
 * model, but it is **not triggered by any route in the reference design set**
 * (every span clears every peg there). Closing it needs full all-peg (taut-band)
 * contact resolution and is intentionally deferred (M2-RW-P1 scope decision).
 */

import type { Cell, Path, RoutePeg, RoutePegInput, WrapSide } from "./types";
import type { PegAnalysis, PegResolution, Point, RouteAnalysis, WrapNode } from "./output";

/** Geometry inputs resolved from a single layer of a `ShapeSeed`. */
export interface LayerGeometryInput {
  /** Route pegs (cell + wrap side). Bare cells are accepted and normalised. */
  path: RoutePegInput[];
  /**
   * Grid dimensions as independent columns × rows (spec §2). v1 only ships
   * square grids (cols === rows), but the math never assumes that — pegs sit
   * at grid coordinates and the band threads between them regardless of shape,
   * so rectangular N×M (portrait/landscape) is nearly free later.
   */
  cols: number;
  rows: number;
  closed: boolean;
  /** Peg radius relative to grid spacing (spec §1.4). */
  radiusRatio: number;
  /** Segments per full revolution when flattening arcs to polylines. */
  arcResolution: number;
}

/** Result of tracing the band for one layer. */
export interface BandResult {
  /** Boundary ring(s) in normalised coords; fill under nonzero. */
  contours: Point[][];
  /** Per-peg wrap resolution, in route order. */
  pegs: PegResolution[];
}

/** +1 = CCW, −1 = CW. */
type Sense = 1 | -1;

const SIDE_TO_SENSE: Record<"a" | "b", Sense> = { a: 1, b: -1 };
const SENSE_TO_SIDE: Record<string, "a" | "b"> = { "1": "a", "-1": "b" };

/** Collinearity tolerance on the unit-cross product (normalised space). */
const COLLINEAR_EPS = 1e-9;

/** Clamp arc detail to a sane range; `0`/unset falls back to a smooth default. */
function resolveArcSegments(arcResolution: number): number {
  if (!Number.isFinite(arcResolution) || arcResolution <= 0) return 64;
  return Math.min(512, Math.max(12, Math.round(arcResolution)));
}

/**
 * Normalise a route element to a canonical `RoutePeg`. A bare `[col, row]`
 * becomes `{ cell, side: "auto" }` (migration path, spec §3); a partial object
 * defaults a missing side to `"auto"`.
 */
export function normalizeRoutePeg(raw: RoutePegInput): RoutePeg {
  if (Array.isArray(raw)) {
    return { cell: [raw[0], raw[1]] as Cell, side: "auto" };
  }
  const side: WrapSide = raw.side ?? "auto";
  return { cell: [raw.cell[0], raw.cell[1]] as Cell, side };
}

/** Normalise a whole route (accepts legacy bare-cell arrays). */
export function normalizePath(raw: RoutePegInput[]): Path {
  return raw.map(normalizeRoutePeg);
}

/**
 * Map a grid cell to a point in the shared normalised coordinate space.
 *
 * Cells are square (uniform `pitch` on both axes), so pegs stay circular and
 * rectangular grids simply occupy a rectangular sub-region of the unit square
 * rather than stretching. `pitch = 1 / max(cols, rows)` reduces to `1/N` on a
 * square grid, so square-grid output is unchanged.
 */
function cellToPoint(cell: Cell, pitch: number): Point {
  const [col, row] = cell;
  return [(col + 0.5) * pitch, (row + 0.5) * pitch];
}

function sub(a: Point, b: Point): Point {
  return [a[0] - b[0], a[1] - b[1]];
}
function len(v: Point): number {
  return Math.hypot(v[0], v[1]);
}
/** z-component of the 2D cross product a × b. */
function cross(a: Point, b: Point): number {
  return a[0] * b[1] - a[1] * b[0];
}

/**
 * Common-tangent solve for the directed edge from peg `Ci` (sense `si`) to peg
 * `Cj` (sense `sj`), equal radius `r`. Returns the departure point on `Ci`
 * (`tOut`) and the arrival point on `Cj` (`tIn`), plus whether the tangent is
 * physically realisable (internal tangents need the centres ≥ `2r` apart).
 */
function edgeTangent(
  Ci: Point,
  Cj: Point,
  si: Sense,
  sj: Sense,
  r: number,
): { tOut: Point; tIn: Point; feasible: boolean } {
  const d = sub(Cj, Ci);
  const D = len(d);
  const u: Point = [d[0] / D, d[1] / D];
  const rawRatio = ((si - sj) * r) / D;
  const feasible = Math.abs(rawRatio) <= 1 + 1e-12;
  const ratio = Math.max(-1, Math.min(1, rawRatio));
  const th = Math.asin(ratio);
  const c = Math.cos(th);
  const s = Math.sin(th);
  // t = u rotated by th; L = t rotated +90° (CCW).
  const t: Point = [u[0] * c - u[1] * s, u[0] * s + u[1] * c];
  const L: Point = [-t[1], t[0]];
  const tOut: Point = [Ci[0] - si * r * L[0], Ci[1] - si * r * L[1]];
  const tIn: Point = [Cj[0] - sj * r * L[0], Cj[1] - sj * r * L[1]];
  return { tOut, tIn, feasible };
}

/**
 * Arc points around `center` (radius `r`) from `from` to `to`, swept in the
 * given `sense`. Endpoints are included so consecutive arcs join by straight
 * chords (the tangent segments).
 */
function arcPoints(
  center: Point,
  from: Point,
  to: Point,
  sense: Sense,
  r: number,
  segments: number,
): Point[] {
  const aIn = Math.atan2(from[1] - center[1], from[0] - center[0]);
  const aOut = Math.atan2(to[1] - center[1], to[0] - center[0]);
  const TWO_PI = 2 * Math.PI;
  const raw = aOut - aIn;
  let da: number;
  if (sense > 0) {
    da = ((raw % TWO_PI) + TWO_PI) % TWO_PI; // [0, 2π)
  } else {
    da = -((((-raw) % TWO_PI) + TWO_PI) % TWO_PI); // (−2π, 0]
  }
  const steps = Math.max(1, Math.round((segments * Math.abs(da)) / TWO_PI));
  const out: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const ang = aIn + (da * i) / steps;
    out.push([center[0] + r * Math.cos(ang), center[1] + r * Math.sin(ang)]);
  }
  return out;
}

/** A disk of radius `r` as a closed CCW ring (single-peg / degenerate case). */
function diskRing(center: Point, r: number, segments: number): Point[] {
  const ring: Point[] = [];
  for (let i = 0; i < segments; i++) {
    const th = (2 * Math.PI * i) / segments;
    ring.push([center[0] + r * Math.cos(th), center[1] + r * Math.sin(th)]);
  }
  ring.push([ring[0]![0], ring[0]![1]]);
  return ring;
}

/** Two equal-radius pegs admit an internal (crossing) tangent iff D ≥ 2r. */
function internalFeasible(Ci: Point, Cj: Point, r: number): boolean {
  return len(sub(Cj, Ci)) >= 2 * r;
}

/** An edge with the given endpoint senses is realisable. */
function edgeFeasible(Ci: Point, Cj: Point, si: Sense, sj: Sense, r: number): boolean {
  return si === sj || internalFeasible(Ci, Cj, r);
}

/**
 * Resolve each peg's wrap sense from its requested side + physics.
 *
 * `auto` → the **outer/convex side of the local turn**: the sense that matches
 * the route's turn direction at that peg (`sign(cross(in, out))`). This wraps
 * the band around the outside of every bend, so a plain route renders as the
 * obvious rounded polygon, and — crucially — it is computed *per peg*, so a
 * self-crossing route (where the global winding is meaningless) still resolves
 * correctly. A **collinear** peg has no turn, so its *auto* sense is forced by
 * continuity (it inherits the downstream peg's sense to keep the band's grazing
 * side consistent). A collinear peg still has **two physically-distinct grazing
 * sides**, though, so a genuine wrap choice *does* exist there — see
 * `choiceAvailable` below (this is the corrected B1 rule).
 *
 * Then a single coercion pass flips any sense whose adjacent crossing tangent
 * doesn't exist at this radius (preferring to flip `auto`-resolved pegs over
 * explicit ones). Reports, per peg, whether a genuine choice exists and whether
 * an explicit side was coerced.
 */
function resolveSenses(
  centers: Point[],
  sides: WrapSide[],
  closed: boolean,
  r: number,
): { senses: Sense[]; pegs: PegResolution[] } {
  const n = centers.length;

  // Neighbour indices along the route. An open route's ends have no wrap turn
  // (they become caps), so treat them as collinear.
  const prevOf = (i: number) => (closed ? (i - 1 + n) % n : i - 1);
  const nextOf = (i: number) => (closed ? (i + 1) % n : i + 1);

  /** Local turn sense, or `0` when the peg is collinear / an open endpoint. */
  const turnSense = (i: number): Sense | 0 => {
    const p = prevOf(i);
    const q = nextOf(i);
    if (p < 0 || q < 0 || q >= n) return 0; // open-route endpoint: no turn
    const inDir = sub(centers[i]!, centers[p]!);
    const outDir = sub(centers[q]!, centers[i]!);
    const denom = len(inDir) * len(outDir);
    if (denom === 0) return 0;
    const c = cross(inDir, outDir) / denom;
    if (Math.abs(c) < COLLINEAR_EPS) return 0; // collinear pass-through
    return c > 0 ? 1 : -1;
  };

  const turn = centers.map((_, i) => turnSense(i));
  const explicit = sides.map((s) => (s === "auto" ? null : SIDE_TO_SENSE[s]));

  // Resolve auto: convex (= local turn) where there's a turn; for a collinear
  // peg inherit the nearest downstream resolved/turn sense (continuity).
  const autoSense = (i: number): Sense => {
    if (turn[i] !== 0) return turn[i] as Sense;
    for (let step = 1; step <= n; step++) {
      const j = (i + step) % n;
      if (explicit[j] !== null) return explicit[j]!;
      if (turn[j] !== 0) return turn[j] as Sense;
    }
    return 1; // wholly straight (degenerate) — pick CCW
  };

  const senses: Sense[] = sides.map((s, i) =>
    s === "auto" ? autoSense(i) : SIDE_TO_SENSE[s as "a" | "b"],
  );

  // Coercion: make every edge realisable. Flip auto pegs first, else the target.
  const edgeCount = closed ? n : n - 1;
  for (let k = 0; k < edgeCount; k++) {
    const i = k;
    const j = nextOf(k);
    if (j < 0 || j >= n) continue;
    if (edgeFeasible(centers[i]!, centers[j]!, senses[i]!, senses[j]!, r)) continue;
    // Opposite senses with centres too close: collapse to an external tangent.
    const flipJ = explicit[j] === null || explicit[i] !== null;
    if (flipJ) senses[j] = senses[i]!;
    else senses[i] = senses[j]!;
  }

  const pegs: PegResolution[] = [];
  for (let i = 0; i < n; i++) {
    const p = prevOf(i);
    const q = nextOf(i);
    // A peg offers a real wrap choice iff the route is CLOSED *and* both senses
    // keep its two adjacent edges realisable. Two subtleties drive the gate:
    //
    //  • Closed only. An open band is traced out-and-back with a uniform winding
    //    (see buildBand: `seqSense = seq.map(() => 1)`), so its geometry is fully
    //    independent of any per-peg side label — flipping a side is a no-op. So
    //    NO peg on an open route has a real choice (the earlier `turn !== 0` gate
    //    wrongly reported one for open *turning* pegs, whose flip is vacuous).
    //  • On a closed route the choice is real at turning *and* collinear pegs: a
    //    collinear pass-through still has two physically-distinct grazing sides
    //    (graze left vs right) that yield distinct closed bands. The old gate
    //    wrongly greyed every collinear peg (bug B1) — e.g. it made the single
    //    collinear flip reference designs #4 (peg4) and #7 (peg10) need
    //    unselectable in the editor.
    //
    // Known limitation (B2): `edgeFeasible` is a *pairwise* test — it does not
    // detect a free span passing through a third, non-consecutive peg. No route
    // in Ravi's reference set triggers this (every span clears every peg), but a
    // pathological route could, and neither this flag nor the tracer would flag
    // it. Resolving that needs full all-peg (taut-band) contact and is deferred.
    let choiceAvailable = false;
    if (closed && p >= 0 && q >= 0 && q < n) {
      const both: Sense[] = [1, -1];
      choiceAvailable = both.every(
        (cand) =>
          edgeFeasible(centers[p]!, centers[i]!, senses[p]!, cand, r) &&
          edgeFeasible(centers[i]!, centers[q]!, cand, senses[q]!, r),
      );
    }
    const requested = explicit[i];
    const coerced = requested !== null && requested !== senses[i];
    pegs.push({
      cell: [0, 0], // filled by caller (it owns the cells)
      resolvedSide: SENSE_TO_SIDE[String(senses[i])]!,
      choiceAvailable,
      coerced,
    });
  }

  return { senses, pegs };
}

/**
 * Trace the band boundary for one layer and report per-peg resolution.
 */
export function buildBand(input: LayerGeometryInput): BandResult {
  const route = normalizePath(input.path);
  const segments = resolveArcSegments(input.arcResolution);
  const pitch = 1 / Math.max(input.cols, input.rows);
  const r = input.radiusRatio * pitch;

  const cells = route.map((p) => p.cell);
  const centers = route.map((p) => cellToPoint(p.cell, pitch));
  const n = centers.length;

  if (n === 0 || r <= 0) return { contours: [], pegs: [] };

  // Single peg: just the disk; no wrap choice.
  if (n === 1) {
    return {
      contours: [diskRing(centers[0]!, r, segments)],
      pegs: [{ cell: cells[0]!, resolvedSide: "a", choiceAvailable: false, coerced: false }],
    };
  }

  const sides = route.map((p) => p.side);
  const { senses, pegs } = resolveSenses(centers, sides, input.closed, r);
  pegs.forEach((p, i) => (p.cell = cells[i]!));

  // Build the cyclic sequence of peg indices the band visits.
  //   closed → the route itself, traversed once.
  //   open   → out-and-back (the band laps the route and returns), so the ends
  //            become rounded caps and intermediate pegs are wrapped both sides,
  //            reproducing a tube. Side choices don't apply to an open band.
  let seq: number[];
  let seqSense: Sense[];
  if (input.closed) {
    seq = centers.map((_, i) => i);
    seqSense = senses;
  } else {
    const fwd = centers.map((_, i) => i);
    const back: number[] = [];
    for (let i = n - 2; i >= 1; i--) back.push(i);
    seq = [...fwd, ...back];
    seqSense = seq.map(() => 1 as Sense); // uniform winding → clean tube
  }

  const m = seq.length;

  // Per-edge tangents: edge k goes seq[k] → seq[k+1].
  const tOut: Point[] = new Array(m); // departure point on seq[k]
  const tIn: Point[] = new Array(m); // arrival point on seq[k+1]
  for (let k = 0; k < m; k++) {
    const a = seq[k]!;
    const b = seq[(k + 1) % m]!;
    const { tOut: out, tIn: inp } = edgeTangent(
      centers[a]!,
      centers[b]!,
      seqSense[k]!,
      seqSense[(k + 1) % m]!,
      r,
    );
    tOut[k] = out;
    tIn[k] = inp;
  }

  // Trace: for each sequence position, the arc around its peg from the arrival
  // point (incoming edge) to the departure point (outgoing edge). Consecutive
  // arcs are joined by the straight tangent chords automatically.
  const ring: Point[] = [];
  for (let k = 0; k < m; k++) {
    const peg = seq[k]!;
    const arrival = tIn[(k - 1 + m) % m]!; // incoming edge's arrival on this peg
    const departure = tOut[k]!; // outgoing edge's departure from this peg
    const pts = arcPoints(centers[peg]!, arrival, departure, seqSense[k]!, r, segments);
    for (const pt of pts) ring.push(pt);
  }
  // Close the ring.
  if (ring.length > 0) ring.push([ring[0]![0], ring[0]![1]]);

  return { contours: [ring], pegs };
}

/**
 * Back-compat: the band boundary rings only (drops per-peg info). Prefer
 * `buildBand` when the resolution report is needed.
 */
export function buildContours(input: LayerGeometryInput): Point[][] {
  return buildBand(input).contours;
}

/** Shortest distance from point `P` to the segment `AB` (normalised space). */
function distToSegment(P: Point, A: Point, B: Point): number {
  const ab = sub(B, A);
  const L2 = ab[0] * ab[0] + ab[1] * ab[1];
  if (L2 === 0) return len(sub(P, A));
  let t = ((P[0] - A[0]) * ab[0] + (P[1] - A[1]) * ab[1]) / L2;
  t = Math.max(0, Math.min(1, t));
  return len(sub(P, [A[0] + t * ab[0], A[1] + t * ab[1]]));
}

/**
 * **B2 guard** (visual spec §1.1ab) — the all-pegs feasibility check the
 * pairwise tracer lacks. Returns the route indices of every peg whose disk a
 * *non-incident* free span intrudes on.
 *
 * The tracer and `choiceAvailable` are pairwise: each free span is the common
 * tangent of its own two endpoint pegs only. A span passing within `r` of a
 * THIRD, non-consecutive peg is therefore neither deflected nor flagged — a real
 * taut band would drape over that peg, so the rendered band silently cuts
 * through it. This recomputes the exact senses + tangents `buildBand` uses, then
 * measures every free span against every non-endpoint peg centre; a clearance
 * below `r` means the span crosses that peg's disk. Empty result ⇒ the band
 * clears every peg (the invariant the reference design set always satisfies).
 *
 * Pure and deterministic. Used by the randomiser to reject off-physics routes by
 * construction (M5), and surfaced via `analyzeRoute` so the editor can flag a
 * hand-built route that trips it. Closes the limitation deferred at M2-RW-P1.
 */
export function spanPegConflicts(input: LayerGeometryInput): number[] {
  const route = normalizePath(input.path);
  const pitch = 1 / Math.max(input.cols, input.rows);
  const r = input.radiusRatio * pitch;
  const centers = route.map((p) => cellToPoint(p.cell, pitch));
  const n = centers.length;
  // Fewer than three pegs: no third peg exists for a span to intrude on.
  if (n < 3 || r <= 0) return [];

  const sides = route.map((p) => p.side);
  const { senses } = resolveSenses(centers, sides, input.closed, r);

  // Mirror buildBand's visited sequence (closed: once; open: out-and-back tube),
  // so the spans we test are exactly the ones the tracer draws.
  let seq: number[];
  let seqSense: Sense[];
  if (input.closed) {
    seq = centers.map((_, i) => i);
    seqSense = senses;
  } else {
    const fwd = centers.map((_, i) => i);
    const back: number[] = [];
    for (let i = n - 2; i >= 1; i--) back.push(i);
    seq = [...fwd, ...back];
    seqSense = seq.map(() => 1 as Sense);
  }

  const m = seq.length;
  // A peg the span is merely *tangent* to (e.g. an open route's own wrapped
  // intermediate peg) sits at distance exactly `r`; only a strictly-interior
  // intrusion counts, so subtract a hair to leave tangencies alone.
  const eps = r * 1e-6;
  const hit = new Set<number>();
  for (let k = 0; k < m; k++) {
    const a = seq[k]!;
    const b = seq[(k + 1) % m]!;
    const { tOut, tIn } = edgeTangent(
      centers[a]!,
      centers[b]!,
      seqSense[k]!,
      seqSense[(k + 1) % m]!,
      r,
    );
    for (let j = 0; j < n; j++) {
      if (j === a || j === b) continue; // the span's own endpoints
      if (distToSegment(centers[j]!, tOut, tIn) < r - eps) hit.add(j);
    }
  }
  return [...hit].sort((x, y) => x - y);
}

/** Whether any free span crosses a non-incident peg's disk (B2 — see `spanPegConflicts`). */
export function hasSpanPegConflict(input: LayerGeometryInput): boolean {
  return spanPegConflicts(input).length > 0;
}

/** Nonzero winding number of a point against a set of closed rings. */
function windingNumber(px: number, py: number, contours: Point[][]): number {
  let wn = 0;
  for (const ring of contours) {
    for (let i = 0; i < ring.length - 1; i++) {
      const [x1, y1] = ring[i]!;
      const [x2, y2] = ring[i + 1]!;
      const isLeft = (x2 - x1) * (py - y1) - (px - x1) * (y2 - y1);
      if (y1 <= py) {
        if (y2 > py && isLeft > 0) wn++;
      } else if (y2 <= py && isLeft < 0) {
        wn--;
      }
    }
  }
  return wn;
}

/**
 * Whether the filled silhouette traps an **enclosed negative-space hole** — a
 * region of winding 0 fully surrounded by filled (winding ≠ 0) area under the
 * nonzero rule (spec §8.6). This is what the rune editor's toggle forbids; a
 * plain geometric pinch-crossing (which stays solid, e.g. Ravi's #4) is not a
 * hole and returns `false`.
 *
 * Method: rasterise a coarse grid over the contour bounds, classify each cell
 * centre as filled (winding ≠ 0) or empty, then flood-fill empty cells inward
 * from the border. Any empty cell the flood can't reach is fully enclosed → a
 * hole. Pure and deterministic; coarse grid is ample for editor-time checks.
 */
export function hasEnclosedHole(contours: Point[][]): boolean {
  if (contours.length === 0) return false;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const ring of contours) {
    for (const [x, y] of ring) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  const w = maxX - minX;
  const h = maxY - minY;
  if (!(w > 0) || !(h > 0)) return false;

  const N = 96; // grid resolution per axis
  const pad = Math.max(w, h) * 0.05; // a clear empty border ring to flood from
  const x0 = minX - pad;
  const y0 = minY - pad;
  const dx = (w + 2 * pad) / N;
  const dy = (h + 2 * pad) / N;

  // filled[idx]: true where the cell centre has nonzero winding.
  const filled = new Uint8Array(N * N);
  for (let r = 0; r < N; r++) {
    const cy = y0 + (r + 0.5) * dy;
    for (let c = 0; c < N; c++) {
      const cx = x0 + (c + 0.5) * dx;
      filled[r * N + c] = windingNumber(cx, cy, contours) !== 0 ? 1 : 0;
    }
  }

  // Flood empty cells from the border (the padded ring guarantees a border seed).
  const reached = new Uint8Array(N * N);
  const stack: number[] = [];
  const push = (idx: number) => {
    if (!filled[idx] && !reached[idx]) {
      reached[idx] = 1;
      stack.push(idx);
    }
  };
  for (let c = 0; c < N; c++) {
    push(c); // top row
    push((N - 1) * N + c); // bottom row
  }
  for (let r = 0; r < N; r++) {
    push(r * N); // left col
    push(r * N + (N - 1)); // right col
  }
  while (stack.length > 0) {
    const idx = stack.pop()!;
    const r = Math.floor(idx / N);
    const c = idx % N;
    if (r > 0) push(idx - N);
    if (r < N - 1) push(idx + N);
    if (c > 0) push(idx - 1);
    if (c < N - 1) push(idx + 1);
  }

  // Any empty cell not reached from the border is an enclosed hole.
  for (let i = 0; i < filled.length; i++) {
    if (!filled[i] && !reached[i]) return true;
  }
  return false;
}

/**
 * Read-only analysis for the editor (spec §1.1aa, §8.6): per-peg valid wrap
 * sides + each side's bulge direction (for the two-dot control), plus whether
 * the silhouette traps an enclosed hole. Pure — derived from the same sense
 * resolution the renderer uses, so the UI never recomputes physics. Re-run on
 * every route/rig/side edit to keep node validity live and path-dependent.
 */
export function analyzeRoute(input: LayerGeometryInput): RouteAnalysis {
  const band = buildBand(input);
  const resolution = band.pegs;
  const n = resolution.length;
  if (n === 0) return { pegs: [], enclosedHole: false, spanPegConflict: false };

  const route = normalizePath(input.path);
  const pitch = 1 / Math.max(input.cols, input.rows);
  const centers = route.map((p) => cellToPoint(p.cell, pitch));

  const prevOf = (i: number) => (input.closed ? (i - 1 + n) % n : i - 1);
  const nextOf = (i: number) => (input.closed ? (i + 1) % n : i + 1);

  // A peg's two wrap choices (`a`/`b`) are genuinely opposite: one wraps the
  // band convexly around the OUTSIDE of the bend; the other wraps it the long
  // way (a crossing/notch). We present them as two opposite dots along the
  // turn's bisector — the convex side bulges outward, away from the notch, and
  // the other side's distinctive notch points inward. (The traced arc MIDPOINT
  // is useless here: the alternate side's near-full wrap shares the convex
  // side's angular midpoint, so the dots would collapse onto each other.)
  const pegs: PegAnalysis[] = resolution.map((res, i) => {
    const p = prevOf(i);
    const q = nextOf(i);
    const hasNeighbours = n >= 2 && p >= 0 && p < n && q >= 0 && q < n && p !== i && q !== i;

    // Interior bisector at the vertex (points into the notch between the two
    // band segments); its negation is the outward convex bulge.
    let interior: Point = [0, 0];
    let turnSense: Sense = SIDE_TO_SENSE[res.resolvedSide];
    if (hasNeighbours) {
      const toPrev = sub(centers[p]!, centers[i]!);
      const toNext = sub(centers[q]!, centers[i]!);
      const lp = len(toPrev);
      const lq = len(toNext);
      if (lp > 0 && lq > 0) {
        const ub: Point = [toPrev[0] / lp + toNext[0] / lq, toPrev[1] / lp + toNext[1] / lq];
        const lb = len(ub);
        if (lb > COLLINEAR_EPS) {
          interior = [ub[0] / lb, ub[1] / lb];
        } else {
          // Collinear pass-through: no notch. Use a perpendicular to travel so
          // the (single valid) dot still has a sensible place to sit.
          const inDir = sub(centers[i]!, centers[p]!);
          const li = len(inDir) || 1;
          interior = [-inDir[1] / li, inDir[0] / li];
        }
        const cr = cross(sub(centers[i]!, centers[p]!), sub(centers[q]!, centers[i]!));
        if (Math.abs(cr) > COLLINEAR_EPS) turnSense = cr > 0 ? 1 : -1;
      }
    }
    const convexBulge: Point = [-interior[0], -interior[1]];
    const convexSide = SENSE_TO_SIDE[String(turnSense)]!;

    const nodes: WrapNode[] = (["a", "b"] as const).map((side) => {
      // The convex (outward) side bulges away from the notch; its opposite side
      // bulges into the notch. They are exact opposites.
      const bulge: Point = side === convexSide ? convexBulge : interior;
      // Valid set mirrors the engine's choiceAvailable: both sides when a real
      // choice exists, otherwise only the resolved (forced) side.
      const valid = res.choiceAvailable ? true : side === res.resolvedSide;
      return { side, bulge, valid };
    });
    return { ...res, nodes };
  });

  return {
    pegs,
    enclosedHole: hasEnclosedHole(band.contours),
    spanPegConflict: hasSpanPegConflict(input),
  };
}

/** Tight bounds of all contour points, with a small margin. */
function contoursBounds(contours: Point[][]): {
  minX: number;
  minY: number;
  width: number;
  height: number;
} {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const ring of contours) {
    for (const [x, y] of ring) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  const w = maxX - minX;
  const h = maxY - minY;
  const margin = Math.max(w, h) * 0.04;
  return {
    minX: minX - margin,
    minY: minY - margin,
    width: w + 2 * margin,
    height: h + 2 * margin,
  };
}

function fmt(n: number): string {
  // Trim to a clean, stable precision for the path/viewBox output.
  return Number(n.toFixed(5)).toString();
}

/**
 * Concatenate contour rings into one SVG `d` string. MUST be rendered with
 * `fill-rule: nonzero` for the rings to union (and holes to read) correctly.
 */
export function contoursToPathData(contours: Point[][]): string {
  const subpaths: string[] = [];
  for (const ring of contours) {
    if (ring.length === 0) continue;
    const [first, ...rest] = ring;
    const parts = [`M ${fmt(first![0])} ${fmt(first![1])}`];
    for (const [x, y] of rest) {
      parts.push(`L ${fmt(x)} ${fmt(y)}`);
    }
    parts.push("Z");
    subpaths.push(parts.join(" "));
  }
  return subpaths.join(" ");
}

/** A normalised viewBox string framing the contours. */
export function contoursViewBox(contours: Point[][]): string {
  if (contours.length === 0) return "0 0 1 1";
  const b = contoursBounds(contours);
  return `${fmt(b.minX)} ${fmt(b.minY)} ${fmt(b.width)} ${fmt(b.height)}`;
}
