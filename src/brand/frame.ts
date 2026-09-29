import type { Bounds } from "@/brand/engine";
import type { Crop } from "@/brand/formats";
import { isHex } from "@/brand/palette";

export type Lettering = "none" | "under" | "ring";
export type Depth = "flat" | "relief";

function fmt(n: number): string {
  return Number(n.toFixed(5)).toString();
}

function paint(value: string): string {
  if (!isHex(value)) throw new Error("Colour must be a #RRGGBB hex.");
  return value.toLowerCase();
}

function xml(value: string): string {
  return value
    .replaceAll("\u0026", "\u0026amp;")
    .replaceAll("\u003c", "\u0026lt;")
    .replaceAll("\u003e", "\u0026gt;")
    .replaceAll("\u0022", "\u0026quot;");
}

type InkFrame = { cx: number; cy: number; radius: number; halfW: number; halfH: number };

/** Mass centre of a filled path, then the reach from that centre to the ink. */
function inkFrame(d: string, bounds: Bounds): InkFrame {
  const box = {
    cx: bounds.minX + bounds.width / 2,
    cy: bounds.minY + bounds.height / 2,
    radius: Math.hypot(bounds.width, bounds.height) / 2,
    halfW: bounds.width / 2,
    halfH: bounds.height / 2,
  };
  const rings = pathRings(d);
  if (!rings.length) return box;

  let area = 0;
  let mx = 0;
  let my = 0;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const ring of rings) {
    if (ring.length < 3) continue;
    let a = 0;
    let cx = 0;
    let cy = 0;
    for (let i = 0; i < ring.length; i++) {
      const [x0, y0] = ring[i]!;
      const [x1, y1] = ring[(i + 1) % ring.length]!;
      const cross = x0 * y1 - x1 * y0;
      a += cross;
      cx += (x0 + x1) * cross;
      cy += (y0 + y1) * cross;
      if (x0 < minX) minX = x0;
      if (y0 < minY) minY = y0;
      if (x0 > maxX) maxX = x0;
      if (y0 > maxY) maxY = y0;
    }
    area += a;
    mx += cx;
    my += cy;
  }
  const cx = Math.abs(area) > 1e-12 ? mx / (3 * area) : box.cx;
  const cy = Math.abs(area) > 1e-12 ? my / (3 * area) : box.cy;
  let radius = 0;
  let halfW = 0;
  let halfH = 0;
  for (const ring of rings) {
    for (const [x, y] of ring) {
      radius = Math.max(radius, Math.hypot(x - cx, y - cy));
      halfW = Math.max(halfW, Math.abs(x - cx));
      halfH = Math.max(halfH, Math.abs(y - cy));
    }
  }
  if (!Number.isFinite(cx) || !Number.isFinite(cy) || radius < 1e-6) return box;
  return { cx, cy, radius, halfW, halfH };
}

function pathRings(d: string): [number, number][][] {
  const rings: [number, number][][] = [];
  let ring: [number, number][] = [];
  const tokens = d.match(/[MmLlHhVvCcSsQqTtAaZz]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) ?? [];
  let i = 0;
  let cmd = "L";
  let x = 0;
  let y = 0;
  let sx = 0;
  let sy = 0;
  const take = () => Number(tokens[i++]);
  const push = (nx: number, ny: number) => {
    x = nx;
    y = ny;
    ring.push([x, y]);
  };
  while (i < tokens.length) {
    const tok = tokens[i]!;
    if (/^[MmLlHhVvCcSsQqTtAaZz]$/.test(tok)) {
      cmd = tok;
      i += 1;
      if (cmd === "Z" || cmd === "z") {
        if (ring.length) {
          ring.push([sx, sy]);
          rings.push(ring);
          ring = [];
        }
        x = sx;
        y = sy;
        continue;
      }
    }
    if (cmd === "M" || cmd === "m") {
      if (ring.length) rings.push(ring);
      ring = [];
      const rel = cmd === "m";
      const nx = take() + (rel ? x : 0);
      const ny = take() + (rel ? y : 0);
      push(nx, ny);
      sx = x;
      sy = y;
      cmd = cmd === "M" ? "L" : "l";
      continue;
    }
    if (cmd === "L") push(take(), take());
    else if (cmd === "l") push(x + take(), y + take());
    else if (cmd === "H") push(take(), y);
    else if (cmd === "h") push(x + take(), y);
    else if (cmd === "V") push(x, take());
    else if (cmd === "v") push(x, y + take());
    else if (cmd === "C") {
      take();
      take();
      take();
      take();
      push(take(), take());
    } else if (cmd === "c") {
      take();
      take();
      take();
      take();
      push(x + take(), y + take());
    } else if (cmd === "S" || cmd === "Q") {
      take();
      take();
      push(take(), take());
    } else if (cmd === "s" || cmd === "q") {
      take();
      take();
      push(x + take(), y + take());
    } else if (cmd === "T") push(take(), take());
    else if (cmd === "t") push(x + take(), y + take());
    else if (cmd === "A") {
      take();
      take();
      take();
      take();
      take();
      push(take(), take());
    } else if (cmd === "a") {
      take();
      take();
      take();
      take();
      take();
      push(x + take(), y + take());
    } else {
      i += 1;
    }
  }
  if (ring.length) rings.push(ring);
  return rings;
}

export type FrameOpts = {
  d: string;
  bounds: Bounds;
  fill: string;
  background: string | null;
  photo: string | null;
  size: number;
  fit: number;
  crop: Crop;
  lettering: Lettering;
  line: string;
  lineBelow?: string;
  typeSize?: number;
  typeSizeBelow?: number;
  depth: Depth;
  /** When false, omit pixel width so the on-page preview stays a live vector. */
  pixels?: boolean;
};

/**
 * Square SVG. Preview omits pixel width so the browser scales the viewBox.
 * PNG raster sets an explicit pixel size and supersamples.
 */
export function framedSvg(opts: FrameOpts): string {
  const vb = 1000;
  const fill = paint(opts.fill);
  const ink = inkFrame(opts.d, opts.bounds);
  const letterPad = opts.lettering === "none" ? 1 : opts.lettering === "under" ? 0.78 : 0.62;
  const inset = opts.crop === "circle" ? 0.72 : 0.86;
  const safe = inset * vb * clampFit(opts.fit) * letterPad;
  const reach =
    opts.crop === "circle"
      ? ink.radius
      : Math.max(ink.halfW, ink.halfH, 1e-6);
  const scale = safe / 2 / Math.max(reach, 1e-6);
  const lift = opts.lettering === "under" ? -36 : 0;
  const transform = `translate(500 ${500 + lift}) scale(${fmt(scale)}) translate(${fmt(-ink.cx)} ${fmt(-ink.cy)})`;

  const bg =
    opts.photo != null
      ? `<image href="${xml(opts.photo)}" x="0" y="0" width="${vb}" height="${vb}" preserveAspectRatio="xMidYMid slice"/>` +
        `<rect width="${vb}" height="${vb}" fill="#161718" fill-opacity="0.28"/>`
      : opts.background == null
        ? ""
        : `<rect width="${vb}" height="${vb}" fill="${paint(opts.background)}"/>`;

  const relief =
    opts.depth === "relief"
      ? Array.from({ length: 14 }, (_, i) => {
          const t = (i + 1) / 14;
          const dx = 18 * t;
          const dy = 26 * t;
          const shade = mix(fill, "#161718", 0.35 + t * 0.4);
          return `<g transform="translate(${fmt(dx)} ${fmt(dy)})"><path d="${opts.d}" fill="${shade}" fill-rule="nonzero"/></g>`;
        }).join("")
      : "";

  const mark = `<g transform="${transform}">${relief}<path d="${opts.d}" fill="${fill}" fill-rule="nonzero" shape-rendering="geometricPrecision"/></g>`;
  const type = letteringSvg(
    opts.lettering,
    opts.line,
    opts.lineBelow ?? "",
    fill,
    opts.typeSize ?? 1,
    opts.typeSizeBelow ?? opts.typeSize ?? 1,
  );

  const sizeAttr = opts.pixels === false ? "" : ` width="${opts.size}" height="${opts.size}"`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${vb} ${vb}"${sizeAttr}>` +
    bg +
    mark +
    type +
    `</svg>`
  );
}

function letteringSvg(
  kind: Lettering,
  above: string,
  below: string,
  fill: string,
  typeSize: number,
  typeSizeBelow: number,
): string {
  const top = xml((above || "").trim().toUpperCase());
  const bot = xml((below || "").trim().toUpperCase());
  const scaleTop = Math.min(1.8, Math.max(0.5, typeSize));
  const scaleBot = Math.min(1.8, Math.max(0.5, typeSizeBelow));
  if (kind === "under") {
    const size = Math.round(88 * scaleTop);
    const small = Math.round(28 * scaleBot);
    const mid = bot ? 868 : 910;
    const place = bot
      ? `<text x="500" y="938" text-anchor="middle" fill="${fill}" ` +
        `font-family="aktiv-grotesk, Aktiv Grotesk, Helvetica, sans-serif" font-weight="600" ` +
        `font-size="${small}" letter-spacing="10">${bot}</text>`
      : "";
    return (
      `<text x="500" y="${mid}" text-anchor="middle" fill="${fill}" ` +
      `font-family="Morganite, Oswald, Arial Narrow, sans-serif" font-weight="800" ` +
      `font-size="${size}" letter-spacing="16">${top || "UNEARTH SELF"}</text>` +
      place
    );
  }
  if (kind === "ring") {
    const topSize = Math.round(36 * scaleTop);
    const botSize = Math.round(36 * scaleBot);
    const topLine = top || "UNEARTH SELF";
    const glyphs =
      ringGlyphs(topLine, "top", topSize, 10)
        .map((g) => ringLetter(g, fill, topSize))
        .join("") +
      (bot
        ? ringGlyphs(bot, "bottom", botSize, 8)
            .map((g) => ringLetter(g, fill, botSize))
            .join("")
        : "");
    return glyphs;
  }
  return "";
}

function ringLetter(g: { ch: string; x: number; y: number; deg: number }, fill: string, size: number): string {
  if (g.ch === " ") return "";
  return (
    `<text x="0" y="0" fill="${fill}" text-anchor="middle" dominant-baseline="middle" ` +
    `font-family="aktiv-grotesk, Aktiv Grotesk, Helvetica, sans-serif" font-weight="600" font-size="${size}" ` +
    `transform="translate(${fmt(g.x)} ${fmt(g.y)}) rotate(${fmt(g.deg)})">${xml(g.ch)}</text>`
  );
}

type RingGlyph = { ch: string; x: number; y: number; deg: number };

function ringGlyphs(text: string, side: "top" | "bottom", fontSize: number, tracking: number): RingGlyph[] {
  const letters = text.split("");
  if (!letters.length) return [];
  const widths = letters.map((ch) => (ch === " " ? fontSize * 0.38 : fontSize * 0.62) + tracking);
  const total = widths.reduce((a, b) => a + b, 0);
  const radius = 332;
  const arcSpan = total / radius;
  const mid = side === "top" ? -Math.PI / 2 : Math.PI / 2;
  const out: RingGlyph[] = [];
  let traveled = 0;
  for (let i = 0; i < letters.length; i++) {
    const w = widths[i]!;
    const t = total > 0 ? (traveled + w / 2) / total : 0.5;
    const angle =
      side === "top" ? mid - arcSpan / 2 + t * arcSpan : mid + arcSpan / 2 - t * arcSpan;
    const deg = ((side === "top" ? angle + Math.PI / 2 : angle - Math.PI / 2) * 180) / Math.PI;
    out.push({
      ch: letters[i]!,
      x: 500 + Math.cos(angle) * radius,
      y: 500 + Math.sin(angle) * radius,
      deg,
    });
    traveled += w;
  }
  return out;
}

function mix(a: string, b: string, t: number): string {
  const ch = (hex: string) => [0, 2, 4].map((i) => parseInt(hex.slice(1 + i, 3 + i), 16));
  const A = ch(a);
  const B = ch(b);
  const out = A.map((n, i) => Math.round(n + (B[i]! - n) * t));
  return `#${out.map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}
  const ch = (hex: string) => [0, 2, 4].map((i) => parseInt(hex.slice(1 + i, 3 + i), 16));
  const A = ch(a);
  const B = ch(b);
  const out = A.map((n, i) => Math.round(n + (B[i]! - n) * t));
  return `#${out.map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

export function clampFit(fit: number): number {
  if (!Number.isFinite(fit)) return 1;
  return Math.min(1, Math.max(0.45, fit));
}

/** Paint the frame to a PNG without going through SVG-as-image. */
export async function rasterFrame(opts: FrameOpts): Promise<Blob> {
  const size = Math.max(32, Math.round(opts.size));
  const hi = Math.min(4096, Math.max(size * 2, size));
  const canvas = document.createElement("canvas");
  canvas.width = hi;
  canvas.height = hi;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not open a canvas.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const vb = 1000;
  ctx.setTransform(hi / vb, 0, 0, hi / vb, 0, 0);

  if (opts.photo) {
    try {
      const img = await loadImage(opts.photo);
      ctx.drawImage(img, 0, 0, vb, vb);
      ctx.fillStyle = "rgba(22,23,24,0.28)";
      ctx.fillRect(0, 0, vb, vb);
    } catch {
      ctx.fillStyle = "#161718";
      ctx.fillRect(0, 0, vb, vb);
    }
  } else if (opts.background) {
    ctx.fillStyle = paint(opts.background);
    ctx.fillRect(0, 0, vb, vb);
  }

  const ink = inkFrame(opts.d, opts.bounds);
  const letterPad = opts.lettering === "none" ? 1 : opts.lettering === "under" ? 0.78 : 0.62;
  const inset = opts.crop === "circle" ? 0.72 : 0.86;
  const safe = inset * vb * clampFit(opts.fit) * letterPad;
  const reach =
    opts.crop === "circle" ? ink.radius : Math.max(ink.halfW, ink.halfH, 1e-6);
  const scale = safe / 2 / Math.max(reach, 1e-6);
  const lift = opts.lettering === "under" ? -36 : 0;
  const fill = paint(opts.fill);

  ctx.save();
  ctx.translate(500, 500 + lift);
  ctx.scale(scale, scale);
  ctx.translate(-ink.cx, -ink.cy);
  if (opts.depth === "relief") {
    for (let i = 1; i <= 14; i++) {
      const t = i / 14;
      ctx.save();
      ctx.translate(18 * t, 26 * t);
      ctx.fillStyle = mix(fill, "#161718", 0.35 + t * 0.4);
      ctx.fill(new Path2D(opts.d), "nonzero");
      ctx.restore();
    }
  }
  ctx.fillStyle = fill;
  ctx.fill(new Path2D(opts.d), "nonzero");
  ctx.restore();

  paintLettering(
    ctx,
    opts.lettering,
    opts.line,
    opts.lineBelow ?? "",
    fill,
    opts.typeSize ?? 1,
    opts.typeSizeBelow ?? opts.typeSize ?? 1,
  );

  if (hi === size) {
    const blob = await canvasToBlob(canvas);
    if (!blob) throw new Error("Could not encode the PNG.");
    return blob;
  }
  const out = document.createElement("canvas");
  out.width = size;
  out.height = size;
  const octx = out.getContext("2d");
  if (!octx) throw new Error("Could not open a canvas.");
  octx.imageSmoothingEnabled = true;
  octx.imageSmoothingQuality = "high";
  octx.drawImage(canvas, 0, 0, size, size);
  const blob = await canvasToBlob(out);
  if (!blob) throw new Error("Could not encode the PNG.");
  return blob;
}

function paintLettering(
  ctx: CanvasRenderingContext2D,
  kind: Lettering,
  above: string,
  below: string,
  fill: string,
  typeSize: number,
  typeSizeBelow: number,
) {
  const top = (above || "").trim().toUpperCase();
  const bot = (below || "").trim().toUpperCase();
  const scaleTop = Math.min(1.8, Math.max(0.5, typeSize));
  const scaleBot = Math.min(1.8, Math.max(0.5, typeSizeBelow));
  ctx.fillStyle = fill;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (kind === "under") {
    const main = top || "UNEARTH SELF";
    ctx.font = `800 ${Math.round(88 * scaleTop)}px Morganite, Oswald, Arial Narrow, sans-serif`;
    ctx.fillText(main, 500, bot ? 868 : 910);
    if (bot) {
      ctx.font = `600 ${Math.round(28 * scaleBot)}px aktiv-grotesk, Aktiv Grotesk, Helvetica, sans-serif`;
      ctx.fillText(bot, 500, 938);
    }
    return;
  }
  if (kind === "ring") {
    ctx.font = `600 ${Math.round(36 * scaleTop)}px aktiv-grotesk, Aktiv Grotesk, Helvetica, sans-serif`;
    for (const g of ringGlyphs(top || "UNEARTH SELF", "top", Math.round(36 * scaleTop), 10)) {
      if (g.ch === " ") continue;
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.rotate((g.deg * Math.PI) / 180);
      ctx.fillText(g.ch, 0, 0);
      ctx.restore();
    }
    if (bot) {
      ctx.font = `600 ${Math.round(36 * scaleBot)}px aktiv-grotesk, Aktiv Grotesk, Helvetica, sans-serif`;
      for (const g of ringGlyphs(bot, "bottom", Math.round(36 * scaleBot), 8)) {
        if (g.ch === " ") continue;
        ctx.save();
        ctx.translate(g.x, g.y);
        ctx.rotate((g.deg * Math.PI) / 180);
        ctx.fillText(g.ch, 0, 0);
        ctx.restore();
      }
    }
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load the ground photograph."));
    img.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function contrast(a: string, b: string): number {
  const L = (hex: string) => {
    const n = hex.replace("#", "");
    const ch = [0, 2, 4].map((i) => {
      const c = parseInt(n.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * ch[0]! + 0.7152 * ch[1]! + 0.0722 * ch[2]!;
  };
  if (!isHex(a) || !isHex(b)) return 1;
  const [hi, lo] = [L(a), L(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
