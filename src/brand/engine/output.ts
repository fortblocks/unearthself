/**
 * Engine output types. See BADLANDS-VISUAL-SPEC.md §6.
 *
 * `EngineOutput` carries, per layer: an SVG path string (2D vector) and a
 * geometry object that the 3D exporter (M6) consumes. The geometry shape is a
 * forward-looking placeholder in M0 — no geometry is produced until M1.
 */

import type { Cell } from "./types";

/** A 2D point in the shared normalised coordinate space, `[x, y]`. */
export type Point = [x: number, y: number];

/**
 * Per-peg resolution result (visual spec §1.1a). Lets the future editor know,
 * for each peg, which side the band actually wrapped and whether the designer
 * has a choice there at all.
 */
export interface PegResolution {
  /** The peg's grid cell. */
  cell: Cell;
  /** The side the band wrapped, after resolving `auto` and physics coercion. */
  resolvedSide: "a" | "b";
  /**
   * Whether a wrap-side choice physically exists at this peg. `false` when the
   * route doesn't turn here (collinear pass-through) or when only one side
   * keeps the band taut (the other would "grip empty air").
   */
  choiceAvailable: boolean;
  /**
   * `true` when the requested explicit side was physically invalid and the
   * engine coerced it to the valid side. (Always `false` for `auto`.)
   */
  coerced: boolean;
}

/**
 * One selectable wrap option for the editor's per-peg control (spec §1.1aa).
 *
 * The engine's wrap reality is binary (CW/CCW = `a`/`b`); this is the
 * *presentation* of that, not a separate model. The editor renders one dot per
 * node at `bulge` — the outward direction the band actually bulges if that side
 * is chosen — so what the designer clicks is what they get.
 */
export interface WrapNode {
  /** Which wrap side selecting this node sets. */
  side: "a" | "b";
  /** Outward unit direction (normalised space) the band bulges for this side. */
  bulge: Point;
  /**
   * Whether this side is physically valid for the current route (selectable).
   * Path-dependent: recompute by re-running `analyzeRoute` after any edit.
   */
  valid: boolean;
}

/** Per-peg analysis for the editor's node control — `PegResolution` + nodes. */
export interface PegAnalysis extends PegResolution {
  /** Candidate wrap nodes (one per side) with bulge direction + validity. */
  nodes: WrapNode[];
}

/**
 * Read-only route analysis for the editor (spec §1.1aa, §8.6). Pure: derived
 * from the same resolution the renderer uses, so the UI never recomputes
 * physics. Re-run on every route/rig/side edit to keep node validity live.
 */
export interface RouteAnalysis {
  /** Per-peg node analysis, in route order. */
  pegs: PegAnalysis[];
  /**
   * Whether the filled silhouette traps an **enclosed negative-space hole** — a
   * region of winding 0 fully surrounded by filled area under the nonzero rule
   * (the "B/R"-glyph counter). This is the thing the rune editor's toggle
   * forbids by default (spec §8.6) — NOT a mere geometric pinch-crossing, which
   * stays solid and is fine (e.g. Ravi's #4 bottom waist). See report: the spec
   * §8.6 wording ("no self-crossing") is looser than this true meaning.
   */
  enclosedHole: boolean;
  /**
   * **B2** (visual spec §1.1ab): whether a free span passes through a
   * non-incident peg's disk — a band the pairwise tracer draws cutting straight
   * through a third peg a real taut band would drape over. Computed by the
   * all-pegs guard (`spanPegConflicts`); the reference design set never trips it,
   * the randomiser rejects routes that would, and the editor surfaces it for a
   * hand-built route that does.
   */
  spanPegConflict: boolean;
}

/**
 * Layer geometry for the 3D exporter (M6).
 *
 * `contours` holds the traced **band boundary** — the taut elastic band that
 * wraps each peg on its chosen side (spec §1.1a). The enclosed region fills
 * under the **nonzero** rule, so self-crossing bands still read as one solid.
 * A closed route yields a single boundary ring; an open route yields the
 * out-and-back tube boundary.
 */
export interface LayerGeometry {
  contours: Point[][];
}

/** One layer's rendered output. */
export interface LayerOutput {
  /** SVG `d` attribute — the outline as a single path. */
  svgPath: string;
  /** Geometry consumed by the 3D exporter. */
  geometry: LayerGeometry;
  /**
   * Per-peg wrap resolution, in route order — for the future editor's per-peg
   * side toggle. See `PegResolution`.
   */
  pegs: PegResolution[];
}

/**
 * Full engine output: one `LayerOutput` per layer present in the seed.
 * Keys mirror the seed's `tier` (a rune-only seed yields only `rune`, etc.).
 */
export interface EngineOutput {
  rune?: LayerOutput;
  echo?: LayerOutput;
}
