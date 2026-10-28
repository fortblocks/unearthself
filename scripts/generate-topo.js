#!/usr/bin/env node

/**
 * Procedural topographic map generator
 * 
 * Generates realistic contour lines with:
 * - Organic closed loops from smooth height fields
 * - Varying stroke weights
 * - Mixed dash patterns (solid, dashed, dotted)
 * - Dense clusters on steep faces
 * - ~50% fewer lines than a typical survey map
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  width: 1600,
  height: 1000,
  gridWidth: 140,  // Lower resolution for smoother, longer curves
  gridHeight: 90,
  contourLevels: 22,  // 50% fewer than reference (moderate density)
  baseStrokeWidth: 0.4,  // Thin, delicate lines
  backgroundColor: 'transparent',
  lineColor: '#F8F0ED', // Fossil white
  opacity: 0.35,  // Subtle so text remains legible
  seed: 42
};

// Simple seeded random number generator
class Random {
  constructor(seed) {
    this.seed = seed;
  }
  
  next() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
}

// 2D Perlin-like noise using gradient interpolation
class NoiseField {
  constructor(width, height, seed) {
    this.width = width;
    this.height = height;
    this.random = new Random(seed);
    this.gradients = {};
  }
  
  getGradient(x, y) {
    const key = `${x},${y}`;
    if (!this.gradients[key]) {
      const angle = this.random.next() * Math.PI * 2;
      this.gradients[key] = [Math.cos(angle), Math.sin(angle)];
    }
    return this.gradients[key];
  }
  
  dotGridGradient(ix, iy, x, y) {
    const gradient = this.getGradient(ix, iy);
    const dx = x - ix;
    const dy = y - iy;
    return dx * gradient[0] + dy * gradient[1];
  }
  
  interpolate(a, b, t) {
    // Smoothstep interpolation
    return a + (b - a) * (3.0 - t * 2.0) * t * t;
  }
  
  noise(x, y) {
    const x0 = Math.floor(x);
    const x1 = x0 + 1;
    const y0 = Math.floor(y);
    const y1 = y0 + 1;
    
    const sx = x - x0;
    const sy = y - y0;
    
    const n0 = this.dotGridGradient(x0, y0, x, y);
    const n1 = this.dotGridGradient(x1, y0, x, y);
    const ix0 = this.interpolate(n0, n1, sx);
    
    const n2 = this.dotGridGradient(x0, y1, x, y);
    const n3 = this.dotGridGradient(x1, y1, x, y);
    const ix1 = this.interpolate(n2, n3, sx);
    
    return this.interpolate(ix0, ix1, sy);
  }
}

// Generate height field with flowing ridges biased to right/bottom
function generateHeightField(width, height, seed) {
  const field = Array(height).fill(0).map(() => Array(width).fill(0));
  const noise1 = new NoiseField(width, height, seed);
  const noise2 = new NoiseField(width, height, seed + 100);
  const noise3 = new NoiseField(width, height, seed + 200);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const nx = x / width;
      const ny = y / height;
      
      // Long flowing ridges (horizontal/diagonal bands)
      const v1 = noise1.noise(nx * 2.5, ny * 5) * 1.2;
      
      // Medium ridge details
      const v2 = noise2.noise(nx * 5, ny * 8) * 0.6;
      
      // Fine texture
      const v3 = noise3.noise(nx * 12, ny * 15) * 0.2;
      
      // Strong right-side bias: left is empty, right is dense
      // Use exponential to create sharp transition
      const rightBias = Math.pow(nx, 2.5) * 1.5;
      
      // Bottom bias for additional detail
      const bottomBias = Math.pow(ny, 1.8) * 0.4;
      
      // Create a steep convergence zone in the center-right/bottom
      const centerX = 0.7;
      const centerY = 0.6;
      const distToCenter = Math.sqrt(Math.pow(nx - centerX, 2) * 2 + Math.pow(ny - centerY, 2));
      const convergenceZone = Math.exp(-distToCenter * 3) * 0.8;
      
      field[y][x] = v1 + v2 + v3 + rightBias + bottomBias + convergenceZone;
    }
  }
  
  return field;
}

// Marching squares to extract contour lines
function extractContours(field, level) {
  const height = field.length;
  const width = field[0].length;
  const contours = [];
  const visited = Array(height).fill(0).map(() => Array(width).fill(false));
  
  function getEdgePoint(x, y, dx, dy) {
    const v1 = field[y][x];
    const v2 = field[y + dy][x + dx];
    const t = (level - v1) / (v2 - v1);
    return [x + dx * t, y + dy * t];
  }
  
  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      if (visited[y][x]) continue;
      
      const corners = [
        field[y][x],
        field[y][x + 1],
        field[y + 1][x + 1],
        field[y + 1][x]
      ];
      
      // Calculate marching squares case
      let caseIndex = 0;
      if (corners[0] >= level) caseIndex |= 1;
      if (corners[1] >= level) caseIndex |= 2;
      if (corners[2] >= level) caseIndex |= 4;
      if (corners[3] >= level) caseIndex |= 8;
      
      // Only process cells that have contour lines
      if (caseIndex === 0 || caseIndex === 15) continue;
      
      // Trace contour from this cell
      const points = traceContour(field, level, x, y, visited);
      if (points && points.length > 3) {
        contours.push(points);
      }
    }
  }
  
  return contours;
}

function traceContour(field, level, startX, startY, visited) {
  const points = [];
  let x = startX;
  let y = startY;
  const maxSteps = 10000;
  let steps = 0;
  
  while (steps < maxSteps) {
    if (x < 0 || y < 0 || y >= field.length - 1 || x >= field[0].length - 1) break;
    if (visited[y][x]) {
      if (steps > 0) break;  // Completed loop
    }
    
    visited[y][x] = true;
    
    const corners = [
      field[y][x],
      field[y][x + 1],
      field[y + 1][x + 1],
      field[y + 1][x]
    ];
    
    let caseIndex = 0;
    if (corners[0] >= level) caseIndex |= 1;
    if (corners[1] >= level) caseIndex |= 2;
    if (corners[2] >= level) caseIndex |= 4;
    if (corners[3] >= level) caseIndex |= 8;
    
    // Get interpolated edge points
    const mid = [x + 0.5, y + 0.5];
    const top = [x + 0.5, y];
    const right = [x + 1, y + 0.5];
    const bottom = [x + 0.5, y + 1];
    const left = [x, y + 0.5];
    
    // Follow contour based on case
    switch (caseIndex) {
      case 1: case 14: points.push(left, bottom); y++; break;
      case 2: case 13: points.push(top, right); x++; break;
      case 3: case 12: points.push(left, right); x++; break;
      case 4: case 11: points.push(right, bottom); y++; break;
      case 6: case 9: points.push(top, bottom); y++; break;
      case 7: case 8: points.push(left, top); y--; break;
      default: steps = maxSteps;  // Ambiguous case, stop
    }
    
    steps++;
    if (steps > 2 && x === startX && y === startY) break;  // Loop closed
  }
  
  return points.length > 0 ? points : null;
}

// Smooth contour with cubic bezier approximation
function smoothContour(points, tension = 0.3) {
  if (points.length < 4) return points;
  
  const smoothed = [];
  
  for (let i = 0; i < points.length - 2; i += 2) {
    const p0 = points[i];
    const p1 = points[i + 1] || points[i];
    const p2 = points[i + 2] || p1;
    
    // Calculate control points for smooth curve
    const cp1x = p0[0] + (p1[0] - p0[0]) * tension;
    const cp1y = p0[1] + (p1[1] - p0[1]) * tension;
    const cp2x = p1[0] - (p2[0] - p1[0]) * tension;
    const cp2y = p1[1] - (p2[1] - p1[1]) * tension;
    
    smoothed.push({ type: 'M', point: p0 });
    smoothed.push({ type: 'C', cp1: [cp1x, cp1y], cp2: [cp2x, cp2y], point: p1 });
  }
  
  return smoothed;
}

// Assign line style based on elevation and steepness
function getLineStyle(level, gradient, maxGradient, avgX) {
  const random = new Random(level * 1000);
  const r = random.next();
  
  // Steeper areas get tighter, more varied lines
  const steepness = gradient / maxGradient;
  
  // Vary stroke width - thin lines, especially in tight clusters
  let strokeWidth = CONFIG.baseStrokeWidth;
  if (level % 6 === 0) strokeWidth *= 1.3;  // Occasional thicker line
  
  // Aggressively thin tight convergence clusters
  if (steepness > 0.7) strokeWidth *= 0.5;
  else if (steepness > 0.5) strokeWidth *= 0.7;
  
  // Vary dash pattern - more dotted in sparse left areas
  let dashArray = 'none';
  const isLeftSide = avgX < 0.4;
  const isSparse = steepness < 0.3;
  
  if (isLeftSide && isSparse && r < 0.4) {
    dashArray = '1,2';  // Faint dotted
    strokeWidth *= 0.7;
  } else if (r < 0.08) {
    dashArray = '1.5,2.5';  // Subtle dotted
  } else if (r < 0.15) {
    dashArray = '3,2';  // Light dashed
  }
  // Otherwise solid (85% of lines)
  
  return { strokeWidth, dashArray };
}

// Calculate local gradient (steepness)
function calculateGradient(field, x, y) {
  const height = field.length;
  const width = field[0].length;
  
  if (x <= 0 || x >= width - 1 || y <= 0 || y >= height - 1) return 0;
  
  const dx = field[y][x + 1] - field[y][x - 1];
  const dy = field[y + 1][x] - field[y - 1][x];
  
  return Math.sqrt(dx * dx + dy * dy);
}

// Convert contour to SVG path
function contourToPath(contour, scaleX, scaleY) {
  if (contour.length < 2) return '';
  
  const parts = [];
  
  for (let i = 0; i < contour.length; i++) {
    const point = contour[i];
    
    if (typeof point[0] === 'number') {
      // Simple point
      const x = (point[0] * scaleX).toFixed(2);
      const y = (point[1] * scaleY).toFixed(2);
      parts.push(i === 0 ? `M${x},${y}` : `L${x},${y}`);
    }
  }
  
  // Close the path if it's a loop
  if (contour.length > 10) {
    parts.push('Z');
  }
  
  return parts.join(' ');
}

// Generate SVG
function generateSVG(config) {
  console.log('Generating height field...');
  const field = generateHeightField(config.gridWidth, config.gridHeight, config.seed);
  
  // Calculate max gradient for normalization
  console.log('Calculating gradients...');
  let maxGradient = 0;
  for (let y = 1; y < config.gridHeight - 1; y++) {
    for (let x = 1; x < config.gridWidth - 1; x++) {
      const grad = calculateGradient(field, x, y);
      maxGradient = Math.max(maxGradient, grad);
    }
  }
  
  // Find min/max elevation
  let minElev = Infinity;
  let maxElev = -Infinity;
  for (const row of field) {
    for (const val of row) {
      minElev = Math.min(minElev, val);
      maxElev = Math.max(maxElev, val);
    }
  }
  
  console.log(`Elevation range: ${minElev.toFixed(2)} to ${maxElev.toFixed(2)}`);
  console.log('Extracting contours...');
  
  // Extract contours
  const allContours = [];
  const levels = [];
  for (let i = 0; i < config.contourLevels; i++) {
    const level = minElev + (maxElev - minElev) * (i + 1) / (config.contourLevels + 1);
    levels.push(level);
    const contours = extractContours(field, level);
    
    for (const contour of contours) {
      // Skip very short contours
      if (contour.length < 4) continue;
      
      // Calculate average gradient and position along contour
      let avgGradient = 0;
      let avgX = 0;
      for (let j = 0; j < Math.min(contour.length, 10); j++) {
        const p = contour[j];
        const gx = Math.floor(p[0]);
        const gy = Math.floor(p[1]);
        avgGradient += calculateGradient(field, gx, gy);
        avgX += gx / config.gridWidth;
      }
      avgGradient /= Math.min(contour.length, 10);
      avgX /= Math.min(contour.length, 10);
      
      // Skip contours that are too far left (empty left side)
      if (avgX < 0.25) continue;
      
      const style = getLineStyle(i, avgGradient, maxGradient, avgX);
      allContours.push({ contour, style });
    }
  }
  
  console.log(`Generated ${allContours.length} contours`);
  
  // Build SVG
  const scaleX = config.width / config.gridWidth;
  const scaleY = config.height / config.gridHeight;
  
  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${config.width} ${config.height}" preserveAspectRatio="xMidYMid slice">
`;
  
  if (config.backgroundColor !== 'transparent') {
    svg += `  <rect width="${config.width}" height="${config.height}" fill="${config.backgroundColor}"/>
`;
  }
  
  svg += `  <g fill="none" stroke="${config.lineColor}" stroke-linecap="round" stroke-linejoin="round" opacity="${config.opacity}">
`;
  
  for (const { contour, style } of allContours) {
    const pathData = contourToPath(contour, scaleX, scaleY);
    if (pathData) {
      const dashAttr = style.dashArray !== 'none' ? ` stroke-dasharray="${style.dashArray}"` : '';
      svg += `    <path d="${pathData}" stroke-width="${style.strokeWidth}"${dashAttr}/>
`;
    }
  }
  
  svg += `  </g>
</svg>`;
  
  return svg;
}

// Main
function main() {
  console.log('Generating procedural topographic map...');
  console.log(`Output: ${CONFIG.width}x${CONFIG.height}px`);
  console.log(`Grid: ${CONFIG.gridWidth}x${CONFIG.gridHeight}`);
  console.log(`Contour levels: ${CONFIG.contourLevels}`);
  
  const svg = generateSVG(CONFIG);
  
  const outputPath = path.join(__dirname, '..', 'public', 'topo.svg');
  fs.writeFileSync(outputPath, svg, 'utf-8');
  
  console.log(`✓ Written to ${outputPath}`);
  console.log(`  File size: ${(svg.length / 1024).toFixed(1)} KB`);
}

main();

export { generateSVG, CONFIG };
