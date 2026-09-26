/** Current house palette. Ember moved from the deck's #FC7D6D to #F2684C. */

export type Swatch = {
  id: "coal" | "shale" | "sandstone" | "ember" | "fossil";
  name: string;
  role: string;
  hex: string;
  rgb: string;
  cmyk: string;
  /** Tailwind background class for static specimens. */
  bg: string;
  /** Text class that holds on this ground. */
  fg: string;
  use: string;
};

export const SWATCHES: Swatch[] = [
  {
    id: "coal",
    name: "Coal",
    role: "Primary dark",
    hex: "#161718",
    rgb: "22, 23, 24",
    cmyk: "79, 69, 60, 84",
    bg: "bg-coal",
    fg: "text-fossil",
    use: "Ground, wordmark, body text. The default ink.",
  },
  {
    id: "shale",
    name: "Shale",
    role: "Secondary dark",
    hex: "#423530",
    rgb: "66, 53, 48",
    cmyk: "56, 60, 59, 67",
    bg: "bg-shale",
    fg: "text-fossil",
    use: "A second dark. Panels, captions, photography grade. Not a second black.",
  },
  {
    id: "sandstone",
    name: "Sandstone",
    role: "Secondary accent",
    hex: "#C99A4A",
    rgb: "201, 154, 74",
    cmyk: "19, 38, 77, 8",
    bg: "bg-sandstone",
    fg: "text-coal",
    use: "Small marks only. A rule, a coordinate, a label. Never a headline fill.",
  },
  {
    id: "ember",
    name: "Ember",
    role: "Primary accent",
    hex: "#F2684C",
    rgb: "242, 104, 76",
    cmyk: "0, 57, 69, 5",
    bg: "bg-ember",
    fg: "text-coal",
    use: "One heat per surface. The mark on coal, a single rule, a link. Updated from #FC7D6D.",
  },
  {
    id: "fossil",
    name: "Fossil",
    role: "Primary light",
    hex: "#F8F0ED",
    rgb: "248, 240, 237",
    cmyk: "3, 7, 7, 0",
    bg: "bg-fossil",
    fg: "text-coal",
    use: "The paper. Not pure white. Body copy sits on this, in coal.",
  },
];

export const HEX = Object.fromEntries(SWATCHES.map((s) => [s.id, s.hex])) as Record<
  Swatch["id"],
  string
>;

export function isHex(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}
