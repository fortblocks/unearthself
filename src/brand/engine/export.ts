/**
 * Export boundary — the single shape→output seam every writer goes through.
 *
 * ┌─────────────┐   buildExportScene   ┌──────────────┐   writer    ┌────────┐
 * │ EngineOutput│ ───────────────────▶ │ ExportScene  │ ──────────▶ │ file   │
 * └─────────────┘  (canonical geometry)└──────────────┘             └────────┘
 *
 * `ExportScene` is the canonical, exporter-agnostic hand-off. It carries every
 * present layer's `contours` **untouched** (the per-ring band-boundary
 * geometry), plus presentation metadata (per-layer fill + z, the combination
 * mode, and the union bounds). Every output format is a *writer* that consumes a
 * scene and never re-reads the seed or re-runs the engine:
 *
 *   • `toSvgDocument(scene)`     → 2D vector  (this file, pure)
 *   • PNG                         → 2D raster  (rasterise the SVG; app-side, needs a canvas)
 *   • `toMesh(scene)` (M6)        → 3D STL/GLB (NOT built — see note below)
 *
 * ── LAYERS (M4) ────────────────────────────────────────────────────────────
 * A combo seed yields two layers (rune + echo). The scene keeps them as a
 * **list of independent layers**, each with its own verbatim `contours`, fill
 * and z — they are never flattened into one another (spec §4: the layers share
 * space but don't connect). `mode` picks how the 2D writer combines them:
 *   • `overlay` → one SVG group per layer, painted back-to-front by z, each its
 *                 own colour.
 *   • `union`   → every layer's rings melded into ONE silhouette (one colour).
 * Single-tier seeds (rune-only / echo-only) carry a one-element layer list and
 * render exactly as before.
 *
 * ── WHERE THE 3D WRITER ATTACHES (M6) ──────────────────────────────────────
 * The 3D writer is a new function `toMesh(scene, …)` added beside
 * `toSvgDocument`, consuming the SAME `ExportScene`. It must treat each layer's
 * `contours` as **union primitives / overlapping solids** (spec §1.1b): each
 * ring is extruded and unioned — NOT simplified to a single outline. That is
 * exactly why this boundary keeps every layer's `contours` as the structured
 * `Point[][]` and never flattens it to a path string on the way through. The
 * path string is derived on demand inside the 2D writer only. Adding M6
 * therefore needs zero changes to the engine core or the editor — only a new
 * writer here, walking `scene.layers`.
 *
 * ── KNOWN FUTURE WANT (not built) ──────────────────────────────────────────
 * A "shared fixed-frame" export: instead of each shape tight-cropping to its own
 * bounds, frame every shape on a common grid square so a set of runes aligns
 * (Ravi's wall-of-runes idea). Cheap to add at this boundary — an alternate
 * framing option on the scene/writer (e.g. an explicit viewBox passed through
 * `buildExportScene`/`toSvgDocument`) instead of the per-shape `paddedBounds`.
 * Deferred until needed; logged so the seam is remembered.
 */

import { contoursToPathData } from "./geometry";
import type { EngineOutput, Point } from "./output";
import type { LayerMode } from "./types";

/** Axis-aligned bounds in the engine's normalised coordinate space. */
export interface Bounds {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

/**
 * One layer in an export scene. `contours` is **verbatim from `EngineOutput`**
 * (kept as structured rings, never flattened) so the M6 3D writer can union the
 * rings as overlapping solids (spec §1.1b).
 */
export interface ExportLayer {
  /** Which seed layer this is — used to name SVG groups for the vector editor. */
  name: "rune" | "echo";
  /** Band-boundary contour rings, verbatim from the engine. */
  contours: Point[][];
  /** Fill colour (CSS string), brand off-black by default. */
  fill: string;
  /** Stacking order; higher renders in front (overlay mode). */
  z: number;
}

/**
 * The canonical, exporter-agnostic shape hand-off. Produced once by
 * `buildExportScene`; consumed by every writer (SVG today, 3D at M6).
 */
export interface ExportScene {
  /**
   * Present layers, in seed order (NOT z-sorted — the writer sorts for paint
   * order). One element for a single tier; two for a combo.
   */
  layers: ExportLayer[];
  /** How the layers combine (spec §4). `overlay` keeps them distinct; `union` melds. */
  mode: LayerMode;
  /** Tight bounds of ALL layers' contours together (no margin). */
  bounds: Bounds;
  /** Always nonzero for v1 — the rule that unions the rings and reads holes. */
  fillRule: "nonzero";
}

/** Brand off-black (spec §1) — the default shape colour. */
export const DEFAULT_FILL = "#161718";

/** Default stacking: rune in front of echo (spec §4 — "echo behind, rune front"). */
const DEFAULT_Z: Record<"rune" | "echo", number> = { rune: 1, echo: 0 };

/** Declared canvas size (px) on the larger side for a downloadable `.svg`. */
const DEFAULT_CANVAS_PX = 1000;

/** Per-layer presentation override for `buildExportScene`. */
export interface SceneLayerOptions {
  /** Override the fill colour (defaults to brand off-black). */
  color?: string;
  /** Override the stacking order (defaults: rune 1, echo 0). */
  z?: number;
}

export interface BuildSceneOptions {
  /** How combo layers combine (spec §4). Defaults to `overlay`. */
  mode?: LayerMode;
  /** Presentation for the rune layer (if present). */
  rune?: SceneLayerOptions;
  /** Presentation for the echo layer (if present). */
  echo?: SceneLayerOptions;
}

/** Tight axis-aligned bounds of a set of contour rings. */
export function contoursBounds(contours: Point[][]): Bounds {
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
  if (!Number.isFinite(minX)) return { minX: 0, minY: 0, width: 0, height: 0 };
  return { minX, minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Build the canonical export scene from an engine output — THE export boundary.
 * Collects every present layer (rune and/or echo) with its contours passed
 * through **by reference**, frames them all together, and records the
 * combination mode. Throws if the output carries no layer to export.
 */
export function buildExportScene(
  output: EngineOutput,
  options: BuildSceneOptions = {},
): ExportScene {
  const layers: ExportLayer[] = [];
  for (const name of ["rune", "echo"] as const) {
    const layer = output[name];
    if (!layer) continue;
    const opt = options[name] ?? {};
    layers.push({
      name,
      contours: layer.geometry.contours, // verbatim — keep per-ring structure
      fill: opt.color ?? DEFAULT_FILL,
      z: opt.z ?? DEFAULT_Z[name],
    });
  }
  if (layers.length === 0) {
    throw new Error("nothing to export: engine output has no layer geometry");
  }
  const allContours = layers.flatMap((l) => l.contours);
  return {
    layers,
    mode: options.mode ?? "overlay",
    bounds: contoursBounds(allContours),
    fillRule: "nonzero",
  };
}

/** Trim a number to stable 5-dp precision for path/viewBox output. */
function fmt(n: number): string {
  return Number(n.toFixed(5)).toString();
}

/**
 * Bounds padded by `marginRatio` of the larger dimension — the framing both the
 * SVG viewBox and the PNG canvas use, so the two stay pixel-consistent.
 */
export function paddedBounds(scene: ExportScene, marginRatio = 0.04): Bounds {
  const { minX, minY, width, height } = scene.bounds;
  const pad = Math.max(width, height, 1e-6) * marginRatio;
  return {
    minX: minX - pad,
    minY: minY - pad,
    width: width + 2 * pad,
    height: height + 2 * pad,
  };
}

/** Signed area of a closed ring (CCW > 0). */
function ringSignedArea(ring: Point[]): number {
  let a = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i]!;
    const [x2, y2] = ring[i + 1]!;
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

/** Reorient a ring to CCW (so independently-wound layers add, never cancel). */
function toCCW(ring: Point[]): Point[] {
  return ringSignedArea(ring) < 0 ? [...ring].reverse() : ring;
}

/**
 * Path data for a single **union** silhouette of all the given rings. Each ring
 * is reoriented CCW first so two independently-wound layers add under nonzero
 * (winding ≥ 1 everywhere either covers) and meld into one solid — rather than
 * cancelling to a hole where they overlap. A layer's own self-crossing winding-0
 * counter is intrinsic to its ring and is unaffected. Note: this is a winding
 * union for the 2D silhouette; the M6 3D writer does its own solid union from
 * the per-layer contours the scene preserves.
 */
export function unionPathData(contours: Point[][]): string {
  return contoursToPathData(contours.map(toCCW));
}

export interface SvgDocumentOptions {
  /** Margin around the shape, as a fraction of its larger dimension. */
  marginRatio?: number;
  /**
   * Optional solid background rectangle (CSS colour) covering the viewBox. Omit
   * for a transparent SVG (the default — vector assets usually want no canvas).
   */
  background?: string;
  /**
   * Optional intrinsic pixel size. Omit for a sensibly-sized download (the
   * default: declared ~1000px on the larger side, proportional to the
   * tight-crop viewBox so it opens at a usable size in a vector editor without
   * altering the framing). Set both to fit the shape, centred, into a fixed
   * pixel box — used to rasterise a square PNG.
   */
  width?: number;
  height?: number;
}

/** The front-most layer's fill — the single colour a union silhouette uses. */
function unionFill(scene: ExportScene): string {
  return [...scene.layers].sort((a, b) => b.z - a.z)[0]!.fill;
}

/** Render the scene body: one melded path (union / single layer) or grouped layers. */
function renderBody(scene: ExportScene): string {
  // A single layer, or an explicit union, collapses to one filled path.
  if (scene.mode === "union" || scene.layers.length === 1) {
    const all = scene.layers.flatMap((l) => l.contours);
    const d =
      scene.layers.length === 1
        ? contoursToPathData(all) // single layer: verbatim, no reorientation
        : unionPathData(all); // melded silhouette across layers
    return `<path d="${d}" fill="${unionFill(scene)}" fill-rule="${scene.fillRule}"/>`;
  }
  // Overlay: paint back-to-front by z, each layer its own named group + colour.
  return [...scene.layers]
    .sort((a, b) => a.z - b.z)
    .map((layer) => {
      const d = contoursToPathData(layer.contours);
      return (
        `<g id="layer-${layer.name}">` +
        `<path d="${d}" fill="${layer.fill}" fill-rule="${scene.fillRule}"/>` +
        `</g>`
      );
    })
    .join("");
}

/**
 * 2D vector writer: a complete, standalone `.svg` document — filled paths,
 * nonzero fill, tight normalised viewBox, NO editor chrome (no
 * pegs/dots/grid/numbers). One path for a single layer or a union; one group per
 * layer for an overlay. Pure and deterministic; opens cleanly in
 * Illustrator/Figma/Inkscape.
 */
export function toSvgDocument(scene: ExportScene, options: SvgDocumentOptions = {}): string {
  const b = paddedBounds(scene, options.marginRatio ?? 0.04);
  const viewBox = `${fmt(b.minX)} ${fmt(b.minY)} ${fmt(b.width)} ${fmt(b.height)}`;
  const bg = options.background
    ? `<rect x="${fmt(b.minX)}" y="${fmt(b.minY)}" width="${fmt(b.width)}" height="${fmt(b.height)}" fill="${options.background}"/>`
    : "";
  // Declared pixel size. Either a fixed box (PNG rasterisation: fit the shape
  // centred, preserving aspect) or — the default for a `.svg` download — a
  // usable canvas (~1000px on the larger side) proportional to the tight-crop
  // viewBox, so the asset opens at a sensible size without changing the framing.
  let sized: string;
  if (options.width != null && options.height != null) {
    sized = ` width="${options.width}" height="${options.height}" preserveAspectRatio="xMidYMid meet"`;
  } else {
    const scale = DEFAULT_CANVAS_PX / Math.max(b.width, b.height, 1e-6);
    sized = ` width="${fmt(b.width * scale)}" height="${fmt(b.height * scale)}"`;
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"${sized}>` +
    bg +
    renderBody(scene) +
    `</svg>`
  );
}
