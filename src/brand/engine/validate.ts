/**
 * Runtime validation of a `ShapeSeed` (visual spec §3).
 *
 * `generate` calls `validateSeed` first and throws on invalid input. Tiers are
 * the source of truth for which layers a seed carries (spec §3 typing
 * decisions): `rune` → rune fields present / echo absent; `echo` → echo present
 * / rune absent; `combo` → both present. Enforcing cell-uniqueness here also
 * removes the degenerate geometry cases (zero-length moves, coincident pegs)
 * before they can reach the math.
 */

import type { LayerMode, ShapeSeed } from "./types";

/**
 * The peg radius for one tier, normalising legacy seeds on read (M4-P1).
 *
 * Per-tier `params.<layer>.radiusRatio` is authoritative when present; otherwise
 * the layer inherits the legacy *shared* `params.radiusRatio` (pre-M4-P1 seeds,
 * where one slider drove both tiers). So an old shared-radius seed resolves to
 * the same value for both tiers — exactly the "copy the old value into both"
 * migration — while a new combo can carry independent rune and echo radii.
 *
 * Returns whatever it finds (possibly `undefined`/invalid); `validateSeed`
 * rejects a missing or non-positive radius before any geometry consumes it.
 */
export function radiusRatioFor(seed: ShapeSeed, layer: "rune" | "echo"): number {
  const perTier = seed.params?.[layer];
  if (perTier !== undefined && perTier !== null) {
    return (perTier as { radiusRatio: number }).radiusRatio;
  }
  return seed.params?.radiusRatio as number;
}

/** Thrown when a seed is structurally invalid or violates a path rule. */
export class SeedValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SeedValidationError";
  }
}

/** Thrown when a seed is well-formed but uses a feature not built yet. */
export class UnsupportedSeedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedSeedError";
  }
}

const RUNE_GRIDS = new Set([4, 5, 6]);
const ECHO_GRIDS = new Set([16, 25, 36]);

/** Allowed grid sizes per layer (spec §2). */
const GRID_SIZES: Record<"rune" | "echo", Set<number>> = {
  rune: RUNE_GRIDS,
  echo: ECHO_GRIDS,
};

function isInteger(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n);
}

/** Validate a layer's grid size against its tier's locked set (spec §2). */
function validateGrid(
  layer: "rune" | "echo",
  grid: number | undefined,
): asserts grid is number {
  if (grid === undefined) {
    throw new SeedValidationError(`${layer} tier requires grid.${layer}`);
  }
  const allowed = GRID_SIZES[layer];
  if (!allowed.has(grid)) {
    throw new SeedValidationError(
      `grid.${layer} must be one of ${[...allowed].join(", ")} (got ${grid})`,
    );
  }
}

const WRAP_SIDES = new Set(["auto", "a", "b"]);

/**
 * Validate the route. Each element is either a canonical `{ cell, side }` peg
 * or a legacy bare `[col, row]` (normalised to `side: "auto"`, spec §3 / M1.5
 * migration). Cells must be integer, in-grid, and unique; sides must be one of
 * `auto`/`a`/`b`.
 */
function validatePath(
  layer: "rune" | "echo",
  path: ShapeSeed["paths"]["rune"],
  grid: number,
): void {
  if (!Array.isArray(path) || path.length === 0) {
    throw new SeedValidationError(`${layer} tier requires a non-empty paths.${layer}`);
  }
  const seen = new Set<string>();
  for (const peg of path) {
    let cell: unknown;
    let side: unknown = "auto";
    if (Array.isArray(peg)) {
      cell = peg; // legacy bare cell
    } else if (peg !== null && typeof peg === "object") {
      cell = (peg as { cell?: unknown }).cell;
      side = (peg as { side?: unknown }).side ?? "auto";
    } else {
      throw new SeedValidationError("each route peg must be a [col, row] or { cell, side }");
    }

    if (!Array.isArray(cell) || cell.length !== 2) {
      throw new SeedValidationError("each route peg's cell must be a [col, row] pair");
    }
    const [col, row] = cell as [unknown, unknown];
    if (!isInteger(col) || !isInteger(row)) {
      throw new SeedValidationError(`path cell [${col}, ${row}] must be integers`);
    }
    if (col < 0 || col >= grid || row < 0 || row >= grid) {
      throw new SeedValidationError(
        `path cell [${col}, ${row}] is outside the ${grid}x${grid} grid`,
      );
    }
    if (typeof side !== "string" || !WRAP_SIDES.has(side)) {
      throw new SeedValidationError(
        `route peg [${col}, ${row}] has invalid side "${String(side)}" (expected auto, a, or b)`,
      );
    }
    const key = `${col},${row}`;
    if (seen.has(key)) {
      throw new SeedValidationError(`path visits cell [${col}, ${row}] more than once`);
    }
    seen.add(key);
  }
}

/** Validate the shared params block (radius is per-tier — see `validateLayerParams`). */
function validateParams(params: ShapeSeed["params"]): void {
  if (params === null || typeof params !== "object") {
    throw new SeedValidationError("seed.params must be an object");
  }
  const { arcResolution } = params;
  if (typeof arcResolution !== "number" || !Number.isFinite(arcResolution) || arcResolution < 0) {
    throw new SeedValidationError(
      `params.arcResolution must be a non-negative number (got ${arcResolution})`,
    );
  }
}

/**
 * Validate one tier's resolved radius (M4-P1). The per-tier block, when present,
 * must be an object; the *resolved* radius (per-tier, else legacy shared) must be
 * a positive finite number.
 */
function validateLayerParams(seed: ShapeSeed, layer: "rune" | "echo"): void {
  const block = seed.params?.[layer];
  if (block !== undefined && (block === null || typeof block !== "object")) {
    throw new SeedValidationError(`params.${layer} must be an object when present`);
  }
  const radiusRatio = radiusRatioFor(seed, layer);
  if (typeof radiusRatio !== "number" || !Number.isFinite(radiusRatio) || radiusRatio <= 0) {
    throw new SeedValidationError(
      `params radiusRatio for ${layer} must be a positive number (got ${radiusRatio})`,
    );
  }
}

const LAYER_MODES = new Set<LayerMode>(["overlay", "union"]);

/** Validate `layers.mode` (combination mode, spec §4). */
function validateLayerMode(mode: unknown): void {
  if (typeof mode !== "string" || !LAYER_MODES.has(mode as LayerMode)) {
    throw new SeedValidationError(
      `layers.mode must be "overlay" or "union" (got ${String(mode)})`,
    );
  }
}

/** Validate an optional per-layer style block (`layers.rune` / `layers.echo`). */
function validateLayerStyle(layer: "rune" | "echo", style: unknown): void {
  if (style === undefined) return; // optional — defaults applied downstream
  if (style === null || typeof style !== "object") {
    throw new SeedValidationError(`layers.${layer} must be an object when present`);
  }
  const { color, z } = style as { color?: unknown; z?: unknown };
  if (color !== undefined && typeof color !== "string") {
    throw new SeedValidationError(`layers.${layer}.color must be a string when present`);
  }
  if (z !== undefined && (typeof z !== "number" || !Number.isFinite(z))) {
    throw new SeedValidationError(`layers.${layer}.z must be a finite number when present`);
  }
}

/** Validate one present layer end-to-end (grid + path + closed + style + radius). */
function validateLayer(seed: ShapeSeed, layer: "rune" | "echo"): void {
  validateGrid(layer, seed.grid[layer]);
  validatePath(layer, seed.paths[layer], seed.grid[layer]!);
  if (seed.closed[layer] !== undefined && typeof seed.closed[layer] !== "boolean") {
    throw new SeedValidationError(`closed.${layer} must be a boolean when present`);
  }
  validateLayerStyle(layer, seed.layers[layer]);
  validateLayerParams(seed, layer);
}

/** Ensure no fields for the given layer are present (tier/field mismatch guard). */
function ensureLayerAbsent(seed: ShapeSeed, layer: "rune" | "echo"): void {
  if (
    seed.grid[layer] !== undefined ||
    seed.paths[layer] !== undefined ||
    seed.closed[layer] !== undefined ||
    seed.layers[layer] !== undefined ||
    seed.params?.[layer] !== undefined
  ) {
    throw new SeedValidationError(`tier "${seed.tier}" must not carry ${layer}-layer fields`);
  }
}

/**
 * Validate a seed (the single gate every producer passes through). Throws
 * `SeedValidationError` on malformed input. Tier governs which layers must be
 * present: `rune`/`echo` carry exactly their own layer; `combo` carries both
 * (spec §3 typing decisions, §4 layers).
 */
export function validateSeed(seed: ShapeSeed): void {
  if (seed === null || typeof seed !== "object") {
    throw new SeedValidationError("seed must be an object");
  }
  if (seed.version !== 1) {
    throw new SeedValidationError(`unsupported seed version: ${seed.version}`);
  }
  if (seed.tier !== "rune" && seed.tier !== "echo" && seed.tier !== "combo") {
    throw new SeedValidationError(`unknown tier: ${String(seed.tier)}`);
  }

  validateParams(seed.params);
  if (seed.layers === null || typeof seed.layers !== "object") {
    throw new SeedValidationError("seed.layers must be an object");
  }
  validateLayerMode(seed.layers.mode);

  // Tier is the source of truth for which layers are present (spec §3).
  const wantRune = seed.tier === "rune" || seed.tier === "combo";
  const wantEcho = seed.tier === "echo" || seed.tier === "combo";

  if (wantRune) validateLayer(seed, "rune");
  else ensureLayerAbsent(seed, "rune");

  if (wantEcho) validateLayer(seed, "echo");
  else ensureLayerAbsent(seed, "echo");
}
