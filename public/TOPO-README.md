# Topographic Pattern Image

## Current Status
A placeholder PNG is currently in place at `public/topo.png`.

## Required Action
Replace `public/topo.png` with Christopher's final art:
- Dimensions: 1792×1008 pixels
- Format: RGBA PNG
- Content: White contour lines on transparent background
- Source: topo-final.png (provided by Christopher)

## Implementation
The Bootcamp section (`src/routes/index.tsx`) is configured to:
- Display the image right-aligned (`object-right`)
- Apply a soft left-to-right fade (solid left → transparent right)
- Apply a top-edge fade (transparent top → opaque ~18% down)
- Use CSS `mask-image` for fades (dissolves lines, not overlays)
- Set at 40% opacity for text legibility

Simply replace the PNG file byte-for-byte - no code changes needed.
