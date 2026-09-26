/**
 * Badlands canonical data model.
 *
 * `ShapeSeed` is the ONLY thing stored; every output (SVG, PNG, STL, GLB)
 * regenerates from it deterministically. See BADLANDS-VISUAL-SPEC.md §3.
 *
 * M0 decisions (confirmed with founder, see report): per-layer fields are
 * optional and governed by `tier`; `rngSeed` is a string; grid sizes are typed
 * as the locked tier unions (rune 4/5/6, echo 16/25/36).
 */

/** Schema version. Bumped only on a breaking change to the seed shape. */
export type ShapeSeedVersion = 1;

/** Which layer(s) a seed describes. */
export type Tier = "rune" | "echo" | "combo";

/** Locked rune-tier grid sizes (visual spec §2). */
export type RuneGrid = 4 | 5 | 6;

/** Locked echo-tier grid sizes (visual spec §2). */
export type EchoGrid = 16 | 25 | 36;

/** A single grid cell as `[col, row]`, 0-indexed. */
export type Cell = [col: number, row: number];

/**
 * Which side of a peg the taut band wraps (visual spec §1.1a, §3).
 *
 * The band is the *boundary* of the solid; at each peg it turns around one
 * side. The side is the rotational sense the band travels around that peg:
 *   - `"a"` = counter-clockwise (CCW, +1)
 *   - `"b"` = clockwise (CW, −1)
 *   - `"auto"` = engine resolves it — to the **outer/convex** side where two
 *     sides are physically valid, or to the single valid side where the other
 *     would "grip empty air" (forced).
 *
 * CW/CCW is absolute, so it is well-defined at every peg — including collinear
 * pass-throughs and doubling-backs, where an "outer/inner" framing would be
 * ambiguous. (Founder-confirmed encoding, M1.5.)
 */
export type WrapSide = "auto" | "a" | "b";

/** One peg on the route: a cell plus the side the band wraps it. */
export interface RoutePeg {
  cell: Cell;
  side: WrapSide;
}

/**
 * An ordered route through grid pegs; each cell appears at most once.
 *
 * The canonical element is a `RoutePeg` (cell + wrap side). For migration, a
 * bare `[col, row]` is also accepted on input and normalised to
 * `{ cell, side: "auto" }`, so pre-M1.5 seeds (and an all-`auto` route)
 * reproduce sensible default behaviour. See `normalizePath`.
 */
export type Path = RoutePeg[];

/** Route element accepted on input: canonical `RoutePeg` or a legacy bare cell. */
export type RoutePegInput = RoutePeg | Cell;

/** How the two layers combine when both are present (visual spec §4). */
export type LayerMode = "overlay" | "union";

/** How the path was produced. */
export type Origin = "designer" | "random";

/** Per-layer presentation. `z` orders layers; higher renders in front. */
export interface LayerStyle {
  color: string;
  z: number;
}

/**
 * Per-tier rig parameters (M4-P1). Today just the radius lever; kept as a block
 * so a tier can grow its own knobs without disturbing the other.
 */
export interface LayerParams {
  /** Peg radius relative to *this tier's own* grid spacing (spec §1.4). */
  radiusRatio: number;
}

/**
 * Fully describes a Badlands shape. Per-layer keys (`rune`/`echo`) are present
 * according to `tier`: a rune-only seed omits the echo entries, an echo-only
 * seed omits the rune entries, and a combo seed carries both.
 */
export interface ShapeSeed {
  version: ShapeSeedVersion;
  tier: Tier;
  grid: {
    rune?: RuneGrid;
    echo?: EchoGrid;
  };
  paths: {
    // Accepts canonical `RoutePeg`s or legacy bare cells; normalised on input.
    rune?: RoutePegInput[];
    echo?: RoutePegInput[];
  };
  closed: {
    rune?: boolean;
    echo?: boolean;
  };
  params: {
    /**
     * Legacy *shared* peg radius (pre-M4-P1 seeds). Accepted on input and
     * normalised to per-tier radii on read — copied into whichever tier omits
     * its own `params.<tier>.radiusRatio`. Canonical seeds set the per-tier
     * blocks below instead. See `radiusRatioFor`.
     * @deprecated use `params.rune` / `params.echo`.
     */
    radiusRatio?: number;
    /** Rune-tier rig params (per-tier radius — the dominant look lever, spec §1.4). */
    rune?: LayerParams;
    /** Echo-tier rig params (per-tier radius — the dominant look lever, spec §1.4). */
    echo?: LayerParams;
    /**
     * Arc tessellation detail when flattening peg wraps to line segments.
     * Shared across tiers — a render-quality knob, not a per-tier look lever.
     */
    arcResolution: number;
  };
  layers: {
    mode: LayerMode;
    rune?: LayerStyle;
    echo?: LayerStyle;
  };
  origin: Origin;
  /** RNG seed; present when `origin === "random"`. Named `rngSeed` to avoid colliding with the `ShapeSeed` object name. */
  rngSeed?: string;
}
