import type { Bounds } from "@/brand/engine";
import type { Crop } from "@/brand/formats";
import { isHex } from "@/brand/palette";

function fmt(n: number): string {
  return Number(n.toFixed(5)).toString();
}

function paint(value: string): string {
  if (!isHex(value)) throw new Error("Colour must be a #RRGGBB hex.");
  return value.toLowerCase();
}

/**
 * Square SVG. `fit` is 0.45–1.
 * At 1 the mark's box sits inside the crop: the diagonal for a circle
 * (so corners are not shaved), the longer side for a square logo.
 */
export function framedSvg(opts: {
  d: string;
  bounds: Bounds;
  fill: string;
  background: string | null;
  size: number;
  fit: number;
  crop: Crop;
}): string {
  const vb = 1000;
  const fill = paint(opts.fill);
  const longer = Math.max(opts.bounds.width, opts.bounds.height, 1e-6);
  const span =
    opts.crop === "circle" ? Math.hypot(opts.bounds.width, opts.bounds.height) : longer;
  // Circle platforms mask to nearly the full inscribed circle. 0.92 leaves a hair
  // for the ring chrome. Square logos (LinkedIn company) keep the corners.
  const safe = (opts.crop === "circle" ? 0.92 : 0.86) * vb * clampFit(opts.fit);
  const scale = safe / Math.max(span, 1e-6);
  const cx = opts.bounds.minX + opts.bounds.width / 2;
  const cy = opts.bounds.minY + opts.bounds.height / 2;
  const bg =
    opts.background == null
      ? ""
      : `<rect width="${vb}" height="${vb}" fill="${paint(opts.background)}"/>`;
  const transform = `translate(500 500) scale(${fmt(scale)}) translate(${fmt(-cx)} ${fmt(-cy)})`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vb} ${vb}" width="${opts.size}" height="${opts.size}">` +
    bg +
    `<g transform="${transform}"><path d="${opts.d}" fill="${fill}" fill-rule="nonzero"/></g>` +
    `</svg>`
  );
}

export function clampFit(fit: number): number {
  if (!Number.isFinite(fit)) return 1;
  return Math.min(1, Math.max(0.45, fit));
}

export function rasterPng(svg: string, size: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Could not open a canvas."));
        return;
      }
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
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

/** Relative-luminance contrast. Below ~1.6 the pair will vanish on a profile. */
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
