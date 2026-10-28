#!/usr/bin/env node

/**
 * Procedural topographic map generator - matches reference style
 * 
 * Creates smooth, organic flowing contour bands with:
 * - Gaussian mounds creating natural height field
 * - Marching squares contour extraction
 * - Chaikin curve smoothing for organic flow
 * - Dense convergence core in center-right
 * - Empty left/top-left areas
 * - Mixed stroke styles (solid, dashed, dotted)
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
  gridWidth: 180,
  gridHeight: 110,
  contourLevels: 22,  // 50% fewer than reference
  minContourLength: 8,  // Drop tiny fragments
  smoothingIterations: 4,  // Chaikin smoothing passes
  backgroundColor: 'transparent',
  lineColor: '#F5F0E6',  // Fossil
  opacity: 0.30,
  baseStrokeWidth: 0.38,
  seed: 456
};

// Seeded random
class Random {
  constructor(seed) {
    this.seed = seed;
  }
  
  next() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
  
  gauss() {
    // Box-Muller transform
    const u1 = this.next();
    const u2 = this.next();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
}

// Generate height field using Gaussian mounds
function generateHeightField(config) {
  const { gridWidth, gridHeight, seed } = config;
  const field = Array(gridHeight).fill(0).map(() => Array(gridWidth).fill(0));
  const random = new Random(seed);
  
  // Place gaussian mounds to match reference (bottom-left flowing to center-right)
  const mounds = [
    // Main convergence zone (center-right, creates tight nested core)
    { x: 0.70, y: 0.52, height: 3.2, radiusX: 0.16, radiusY: 0.20 },
    // Secondary distinct peaks (closed loops)
    { x: 0.75, y: 0.38, height: 2.2, radiusX: 0.11, radiusY: 0.14 },
    { x: 0.82, y: 0.65, height: 1.9, radiusX: 0.10, radiusY: 0.13 },
    { x: 0.60, y: 0.70, height: 1.7, radiusX: 0.13, radiusY: 0.15 },
    // Ridge-forming mounds (create flowing bands from bottom-left)
    { x: 0.35, y: 0.85, height: 1.3, radiusX: 0.28, radiusY: 0.10 },
    { x: 0.50, y: 0.75, height: 1.2, radiusX: 0.22, radiusY: 0.12 },
    { x: 0.62, y: 0.58, height: 1.0, radiusX: 0.20, radiusY: 0.14 },
    { x: 0.55, y: 0.42, height: 0.9, radiusX: 0.18, radiusY: 0.11 },
  ];
  
  // Apply gaussian mounds
  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      const nx = x / gridWidth;
      const ny = y / gridHeight;
      
      let height = 0;
      
      // Sum all gaussian mounds
      for (const mound of mounds) {
        const dx = (nx - mound.x) / mound.radiusX;
        const dy = (ny - mound.y) / mound.radiusY;
        const dist2 = dx * dx + dy * dy;
        height += mound.height * Math.exp(-dist2 * 3);
      }
      
      // Add subtle low-frequency noise for organic variation
      const noiseX = Math.sin(nx * Math.PI * 2.3 + ny * Math.PI * 1.7) * 0.08;
      const noiseY = Math.cos(ny * Math.PI * 2.1 + nx * Math.PI * 1.9) * 0.06;
      height += noiseX + noiseY;
      
      // Bias toward bottom-right
      const rightBias = Math.pow(nx, 2.0) * 0.4;
      const bottomBias = Math.pow(ny, 1.5) * 0.25;
      height += rightBias + bottomBias;
      
      field[y][x] = height;
    }
  }
  
  return field;
}

// Marching squares contour extraction with sub-pixel interpolation
function extractContours(field, level, config) {
  const { gridWidth, gridHeight } = config;
  const height = field.length;
  const width = field[0].length;
  const visited = Array(height).fill(0).map(() => Array(width).fill(false));
  const contours = [];
  
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }
  
  function getEdgePoint(x, y, dir) {
    let x1 = x, y1 = y, x2 = x, y2 = y;
    
    if (dir === 0) { x2++; } // top
    else if (dir === 1) { y2++; } // right
    else if (dir === 2) { x2++; y1++; y2++; } // bottom
    else { x1++; x2++; y2++; } // left
    
    if (x2 >= width || y2 >= height) return null;
    
    const v1 = field[y1][x1];
    const v2 = field[y2][x2];
    
    if (Math.abs(v2 - v1) < 0.0001) return null;
    
    const t = (level - v1) / (v2 - v1);
    if (t < 0 || t > 1) return null;
    
    if (dir === 0 || dir === 2) {
      return [lerp(x1, x2, t), y1];
    } else {
      return [x1, lerp(y1, y2, t)];
    }
  }
  
  // Find all contour starting points
  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      // Skip far left (keep it empty, but less aggressive)
      if (x / width < 0.22) continue;
      
      const c00 = field[y][x] >= level;
      const c10 = field[y][x + 1] >= level;
      const c11 = field[y + 1][x + 1] >= level;
      const c01 = field[y + 1][x] >= level;
      
      // Check if this cell has a contour
      const caseIdx = (c00 ? 1 : 0) | (c10 ? 2 : 0) | (c11 ? 4 : 0) | (c01 ? 8 : 0);
      
      if (caseIdx !== 0 && caseIdx !== 15 && !visited[y][x]) {
        const contour = traceContour(x, y, level, field, visited);
        if (contour && contour.length >= config.minContourLength) {
          contours.push(contour);
        }
      }
    }
  }
  
  return contours;
  
  function traceContour(startX, startY, level, field, visited) {
    const points = [];
    let x = startX;
    let y = startY;
    let prevDir = -1;
    const maxSteps = 5000;
    
    for (let step = 0; step < maxSteps; step++) {
      if (x < 0 || y < 0 || x >= width - 1 || y >= height - 1) break;
      
      if (visited[y][x] && step > 5) break;
      visited[y][x] = true;
      
      const c00 = field[y][x] >= level;
      const c10 = field[y][x + 1] >= level;
      const c11 = field[y + 1][x + 1] >= level;
      const c01 = field[y + 1][x] >= level;
      
      const caseIdx = (c00 ? 1 : 0) | (c10 ? 2 : 0) | (c11 ? 4 : 0) | (c01 ? 8 : 0);
      
      // Get edge crossings for this cell
      const edges = [];
      
      // Top edge
      if ((c00 && !c10) || (!c00 && c10)) {
        const pt = getEdgePoint(x, y, 0);
        if (pt) edges.push({ pt, dir: 0, nextX: x, nextY: y - 1 });
      }
      // Right edge
      if ((c10 && !c11) || (!c10 && c11)) {
        const pt = getEdgePoint(x, y, 1);
        if (pt) edges.push({ pt, dir: 1, nextX: x + 1, nextY: y });
      }
      // Bottom edge
      if ((c01 && !c11) || (!c01 && c11)) {
        const pt = getEdgePoint(x, y, 2);
        if (pt) edges.push({ pt, dir: 2, nextX: x, nextY: y + 1 });
      }
      // Left edge
      if ((c00 && !c01) || (!c00 && c01)) {
        const pt = getEdgePoint(x, y, 3);
        if (pt) edges.push({ pt, dir: 3, nextX: x - 1, nextY: y });
      }
      
      if (edges.length === 0) break;
      
      // Choose edge (prefer not going back)
      let chosenEdge = edges[0];
      if (edges.length === 2) {
        chosenEdge = edges[0].dir === prevDir ? edges[1] : edges[0];
      }
      
      points.push(chosenEdge.pt);
      prevDir = (chosenEdge.dir + 2) % 4;
      x = chosenEdge.nextX;
      y = chosenEdge.nextY;
      
      // Check if loop closed
      if (step > 5 && x === startX && y === startY) {
        break;
      }
    }
    
    return points.length >= config.minContourLength ? points : null;
  }
}

// Chaikin curve smoothing algorithm
function smoothContour(points, iterations) {
  if (points.length < 3) return points;
  
  let smoothed = [...points];
  
  for (let iter = 0; iter < iterations; iter++) {
    const newPoints = [];
    const isClosed = Math.hypot(
      smoothed[0][0] - smoothed[smoothed.length - 1][0],
      smoothed[0][1] - smoothed[smoothed.length - 1][1]
    ) < 2;
    
    for (let i = 0; i < smoothed.length - 1; i++) {
      const p0 = smoothed[i];
      const p1 = smoothed[i + 1];
      
      // Q point (3/4 along from p0 to p1)
      newPoints.push([
        p0[0] * 0.75 + p1[0] * 0.25,
        p0[1] * 0.75 + p1[1] * 0.25
      ]);
      
      // R point (1/4 along from p0 to p1)
      newPoints.push([
        p0[0] * 0.25 + p1[0] * 0.75,
        p0[1] * 0.25 + p1[1] * 0.75
      ]);
    }
    
    // Handle closure for closed contours
    if (isClosed && smoothed.length > 3) {
      const p0 = smoothed[smoothed.length - 1];
      const p1 = smoothed[0];
      
      newPoints.push([
        p0[0] * 0.75 + p1[0] * 0.25,
        p0[1] * 0.75 + p1[1] * 0.25
      ]);
      newPoints.push([
        p0[0] * 0.25 + p1[0] * 0.75,
        p0[1] * 0.25 + p1[1] * 0.75
      ]);
    }
    
    smoothed = newPoints;
  }
  
  return smoothed;
}

// Calculate contour statistics
function analyzeContour(points, field, config) {
  const { gridWidth, gridHeight } = config;
  
  let avgX = 0;
  let avgY = 0;
  let maxGradient = 0;
  
  for (const [x, y] of points) {
    avgX += x / gridWidth;
    avgY += y / gridHeight;
    
    // Sample gradient
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    
    if (ix > 0 && ix < gridWidth - 1 && iy > 0 && iy < gridHeight - 1) {
      const dx = Math.abs(field[iy][ix + 1] - field[iy][ix - 1]);
      const dy = Math.abs(field[iy + 1][ix] - field[iy - 1][ix]);
      const grad = Math.sqrt(dx * dx + dy * dy);
      maxGradient = Math.max(maxGradient, grad);
    }
  }
  
  avgX /= points.length;
  avgY /= points.length;
  
  return { avgX, avgY, gradient: maxGradient };
}

// Assign stroke style based on contour properties
function getStrokeStyle(stats, level, random) {
  const { avgX, avgY, gradient } = stats;
  const r = random.next();
  
  let strokeWidth = CONFIG.baseStrokeWidth;
  
  // Thicker every 5th line
  if (level % 5 === 0) strokeWidth *= 1.4;
  
  // Aggressively thin tight convergence areas
  if (gradient > 0.6) strokeWidth *= 0.45;
  else if (gradient > 0.4) strokeWidth *= 0.65;
  else if (gradient > 0.2) strokeWidth *= 0.85;
  
  // Dash pattern
  let dashArray = 'none';
  const isLeftSparse = avgX < 0.5 && gradient < 0.3;
  
  if (isLeftSparse && r < 0.35) {
    dashArray = '0.8,2.5';  // Faint dotted in sparse areas
    strokeWidth *= 0.6;
  } else if (r < 0.08) {
    dashArray = '1.2,2.2';  // Subtle dotted
    strokeWidth *= 0.8;
  } else if (r < 0.15) {
    dashArray = '2.5,1.8';  // Light dashed
  }
  
  return { strokeWidth, dashArray };
}

// Convert contour to SVG path with optimized precision
function contourToPath(points, scaleX, scaleY, isClosed) {
  if (points.length < 2) return '';
  
  // Reduce precision to 1 decimal place to save space
  const parts = [`M${(points[0][0] * scaleX).toFixed(1)},${(points[0][1] * scaleY).toFixed(1)}`];
  
  for (let i = 1; i < points.length; i++) {
    const x = (points[i][0] * scaleX).toFixed(1);
    const y = (points[i][1] * scaleY).toFixed(1);
    parts.push(`L${x},${y}`);
  }
  
  if (isClosed && points.length > 10) {
    parts.push('Z');
  }
  
  return parts.join(' ');
}

// Main generation
function generateSVG(config) {
  console.log('Generating organic topographic pattern...');
  console.log(`Output: ${config.width}x${config.height}px`);
  console.log(`Grid: ${config.gridWidth}x${config.gridHeight}`);
  console.log(`Contour levels: ${config.contourLevels}`);
  
  const field = generateHeightField(config);
  
  // Find elevation range
  let minElev = Infinity;
  let maxElev = -Infinity;
  for (const row of field) {
    for (const val of row) {
      minElev = Math.min(minElev, val);
      maxElev = Math.max(maxElev, val);
    }
  }
  
  console.log(`Elevation range: ${minElev.toFixed(2)} to ${maxElev.toFixed(2)}`);
  console.log('Extracting and smoothing contours...');
  
  const allContours = [];
  const random = new Random(config.seed + 1000);
  
  for (let i = 0; i < config.contourLevels; i++) {
    const level = minElev + (maxElev - minElev) * (i + 1) / (config.contourLevels + 1);
    const rawContours = extractContours(field, level, config);
    
    for (const raw of rawContours) {
      // Apply Chaikin smoothing
      const smoothed = smoothContour(raw, config.smoothingIterations);
      
      if (smoothed.length >= config.minContourLength) {
        const stats = analyzeContour(smoothed, field, config);
        const style = getStrokeStyle(stats, i, random);
        
        const isClosed = Math.hypot(
          smoothed[0][0] - smoothed[smoothed.length - 1][0],
          smoothed[0][1] - smoothed[smoothed.length - 1][1]
        ) < 2;
        
        allContours.push({ points: smoothed, style, isClosed });
      }
    }
  }
  
  console.log(`Generated ${allContours.length} smooth contours`);
  
  // Build SVG
  const scaleX = config.width / config.gridWidth;
  const scaleY = config.height / config.gridHeight;
  
  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${config.width} ${config.height}" preserveAspectRatio="xMidYMid slice">
`;
  
  if (config.backgroundColor !== 'transparent') {
    svg += `  <rect width="${config.width}" height="${config.height}" fill="${config.backgroundColor}"/>\n`;
  }
  
  svg += `  <g fill="none" stroke="${config.lineColor}" stroke-linecap="round" stroke-linejoin="round" opacity="${config.opacity}">\n`;
  
  for (const { points, style, isClosed } of allContours) {
    const pathData = contourToPath(points, scaleX, scaleY, isClosed);
    if (pathData) {
      const dashAttr = style.dashArray !== 'none' ? ` stroke-dasharray="${style.dashArray}"` : '';
      svg += `    <path d="${pathData}" stroke-width="${style.strokeWidth.toFixed(3)}"${dashAttr}/>\n`;
    }
  }
  
  svg += `  </g>\n</svg>`;
  
  return svg;
}

// Execute
console.log('Starting generation...');
const svg = generateSVG(CONFIG);

const outputPath = path.join(__dirname, '..', 'public', 'topo.svg');
fs.writeFileSync(outputPath, svg, 'utf-8');

const sizeKB = (svg.length / 1024).toFixed(1);
console.log(`✓ Written to ${outputPath}`);
console.log(`  File size: ${sizeKB} KB`);

if (parseFloat(sizeKB) > 150) {
  console.warn(`⚠ Warning: File size ${sizeKB} KB exceeds 150 KB target`);
}

export { generateSVG, CONFIG };
