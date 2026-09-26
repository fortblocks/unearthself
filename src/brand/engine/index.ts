/**
 * @badlands/engine — framework-agnostic core visual engine.
 *
 * Pure: `seed -> geometry -> SVG path string` (+ geometry for the 3D exporter).
 * Zero React/Next/DOM dependencies. See BADLANDS-VISUAL-SPEC.md §7.
 */

export * from "./types";
export * from "./output";
export {
  buildExportScene,
  contoursBounds,
  paddedBounds,
  toSvgDocument,
  unionPathData,
  DEFAULT_FILL,
  type Bounds,
  type BuildSceneOptions,
  type ExportLayer,
  type ExportScene,
  type SceneLayerOptions,
  type SvgDocumentOptions,
} from "./export";
export { SeedValidationError, UnsupportedSeedError, radiusRatioFor, validateSeed } from "./validate";
export {
  analyzeRoute,
  buildBand,
  buildContours,
  contoursToPathData,
  contoursViewBox,
  hasEnclosedHole,
  hasSpanPegConflict,
  normalizePath,
  normalizeRoutePeg,
  spanPegConflicts,
  type BandResult,
  type LayerGeometryInput,
} from "./geometry";
export {
  generateRandomSeed,
  CANVAS_FILL_SPREAD,
  type RandomSeedOptions,
  type SpreadProfile,
} from "./random";

import type { ShapeSeed } from "./types";
import type { EngineOutput, LayerOutput, RouteAnalysis } from "./output";
import { radiusRatioFor, validateSeed } from "./validate";
import { analyzeRoute, buildBand, contoursToPathData } from "./geometry";

/** Which layers a tier carries (spec §3 / §4). */
function layersOf(tier: ShapeSeed["tier"]): ("rune" | "echo")[] {
  if (tier === "rune") return ["rune"];
  if (tier === "echo") return ["echo"];
  return ["rune", "echo"]; // combo
}

/**
 * Trace one layer of a seed. The echo tier reuses the SAME engine as the rune
 * tier (spec §4) — only the grid differs — so there is no forked geometry: both
 * layers thread the identical belt-around-pulleys tracer on their own grid.
 */
function buildLayer(seed: ShapeSeed, layer: "rune" | "echo"): LayerOutput {
  // grid/path guaranteed present for this layer by validateSeed.
  const grid = seed.grid[layer]!;
  const path = seed.paths[layer]!;
  const closed = seed.closed[layer] ?? true; // spec §1.3 default: closed loop.

  // v1 seeds carry a single square grid size; the engine treats it as
  // independent cols × rows so rectangular grids are cheap to add (spec §2).
  const { contours, pegs } = buildBand({
    path,
    cols: grid,
    rows: grid,
    closed,
    // Per-tier radius (M4-P1), normalising legacy shared-radius seeds on read.
    radiusRatio: radiusRatioFor(seed, layer),
    arcResolution: seed.params.arcResolution,
  });
  return { svgPath: contoursToPathData(contours), geometry: { contours }, pegs };
}

/**
 * Generate the deterministic output for a shape seed.
 *
 * Validates first (throws on invalid input), then traces each layer the tier
 * carries (rune, echo, or both for combo) through the same belt-around-pulleys
 * band tracer (spec §1.1a, §4). All layers share the normalised coordinate
 * space, so a combo's rune and echo land in one frame (spec §2).
 */
export function generate(seed: ShapeSeed): EngineOutput {
  validateSeed(seed);
  const out: EngineOutput = {};
  for (const layer of layersOf(seed.tier)) {
    out[layer] = buildLayer(seed, layer);
  }
  return out;
}

/** The layer `analyzeSeed` inspects by default — the present layer for a single
 * tier, and the rune layer for a combo (the editor passes an explicit layer). */
function defaultAnalysisLayer(seed: ShapeSeed): "rune" | "echo" {
  return seed.tier === "echo" ? "echo" : "rune";
}

/**
 * Read-only analysis of one of a seed's layers for the editor (spec §1.1aa,
 * §8.6): per-peg valid wrap sides + bulge directions (the two-dot control) and
 * whether the silhouette traps an enclosed hole. Validates first, like
 * `generate`. `layer` selects which layer to analyse (defaults to the present
 * single-tier layer; a combo editor passes the layer it is editing).
 */
export function analyzeSeed(
  seed: ShapeSeed,
  layer: "rune" | "echo" = defaultAnalysisLayer(seed),
): RouteAnalysis {
  validateSeed(seed);
  const grid = seed.grid[layer]!;
  return analyzeRoute({
    path: seed.paths[layer]!,
    cols: grid,
    rows: grid,
    closed: seed.closed[layer] ?? true,
    radiusRatio: radiusRatioFor(seed, layer),
    arcResolution: seed.params.arcResolution,
  });
}
