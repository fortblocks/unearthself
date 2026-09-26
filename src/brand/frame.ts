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
  const longer = Math.max(opts.bounds.width, opts.bounds.height, 1e-6);
  const span =
    opts.crop === "circle" ? Math.hypot(opts.bounds.width, opts.bounds.height) : longer;
  const letterShrink = opts.lettering === "none" ? 1 : opts.lettering === "under" ? 0.78 : 0.7;
  const safe = (opts.crop === "circle" ? 0.92 : 0.86) * vb * clampFit(opts.fit) * letterShrink;
  const scale = safe / Math.max(span, 1e-6);
  const cx = opts.bounds.minX + opts.bounds.width / 2;
  const cy = opts.bounds.minY + opts.bounds.height / 2;
  const lift = opts.lettering === "under" ? -40 : 0;
  const transform = `translate(500 ${500 + lift}) scale(${fmt(scale)}) translate(${fmt(-cx)} ${fmt(-cy)})`;

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
  const type = letteringSvg(opts.lettering, opts.line, fill);

  const sizeAttr = opts.pixels === false ? "" : ` width="${opts.size}" height="${opts.size}"`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${vb} ${vb}"${sizeAttr}>` +
    bg +
    mark +
    type +
    `</svg>`
  );
}

function letteringSvg(kind: Lettering, line: string, fill: string): string {
  const text = xml(line.trim() || "UNEARTH SELF");
  if (kind === "under") {
    return (
      `<text x="500" y="910" text-anchor="middle" fill="${fill}" ` +
      `font-family="Morganite, Oswald, Arial Narrow, sans-serif" font-weight="800" ` +
      `font-size="92" letter-spacing="18">${text}</text>`
    );
  }
  if (kind === "ring") {
    return (
      `<defs><path id="brand-ring" d="M500,500 m-390,0 a390,390 0 1,1 780,0 a390,390 0 1,1 -780,0"/></defs>` +
      `<text fill="${fill}" font-family="aktiv-grotesk, Aktiv Grotesk, Helvetica, sans-serif" ` +
      `font-size="46" font-weight="600" letter-spacing="14">` +
      `<textPath href="#brand-ring" startOffset="50%" text-anchor="middle">${text}</textPath></text>`
    );
  }
  return "";
}

function mix(a: string, b: string, t: number): string {
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

/** Raster at 4× then downsample so edges stay tight at profile sizes. */
export function rasterPng(svg: string, size: number): Promise<Blob> {
  const scale = Math.min(6, Math.max(4, Math.ceil(2048 / Math.max(size, 1))));
  const hi = Math.min(8192, size * scale);
  const sized = svg
    .replace(/width="\d+"/, `width="${hi}"`)
    .replace(/height="\d+"/, `height="${hi}"`)
    .replace(/viewBox="0 0 1000 1000"/, `viewBox="0 0 1000 1000" width="${hi}" height="${hi}"`);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "sync";
    const url = URL.createObjectURL(new Blob([sized], { type: "image/svg+xml;charset=utf-8" }));
    img.onload = () => {
      const big = document.createElement("canvas");
      big.width = hi;
      big.height = hi;
      const bctx = big.getContext("2d");
      if (!bctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Could not open a canvas."));
        return;
      }
      bctx.imageSmoothingEnabled = true;
      bctx.imageSmoothingQuality = "high";
      bctx.drawImage(img, 0, 0, hi, hi);
      const out = document.createElement("canvas");
      out.width = size;
      out.height = size;
      const ctx = out.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Could not open a canvas."));
        return;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(big, 0, 0, size, size);
      URL.revokeObjectURL(url);
      out.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Could not encode the PNG."));
      }, "image/png");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not draw the mark."));
    };
    img.src = url;
  });
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
